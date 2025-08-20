import { getDataSource } from "../../config/database.js";
import { Comments } from "../../entities/Comments.js";
import { Replies } from "../../entities/Replies.js";
import { Likes } from "../../entities/Likes.js";
import { Gallery } from "../../entities/Gallery.js";
import { Blog } from "../../entities/Blog.js";
import { CommentsValidator } from "../../validations/commentsValidation.js";

class CommentsService {
    constructor() {
        this.dataSource = getDataSource();
        this.commentsRepository = this.dataSource.getRepository(Comments);
        this.repliesRepository = this.dataSource.getRepository(Replies);
        this.likesRepository = this.dataSource.getRepository(Likes);
        this.galleryRepository = this.dataSource.getRepository(Gallery);
        this.blogRepository = this.dataSource.getRepository(Blog);
    }

    async createComment(commentData, userId) {
        const { commentable_type, commentable_id, content } = commentData;

        const validatedType = CommentsValidator.validateCommentableType(commentable_type);
        const validatedId = CommentsValidator.validateId(commentable_id, 'commentable_id');
        const validatedContent = CommentsValidator.validateContent(content, 1000);
        const validatedUserId = CommentsValidator.validateId(userId, 'userId');

        // Verify target exists
        await this.verifyTargetExists(validatedType, validatedId);

        const comment = this.commentsRepository.create({
            userId: validatedUserId,
            commentable_type: validatedType,
            commentable_id: validatedId,
            content: validatedContent,
            status: 'active'
        });

        const savedComment = await this.commentsRepository.save(comment);
        await this.updateCommentCount(validatedType, validatedId);

        return savedComment;
    }

    async createReply(replyData, userId) {
        const { commentId, parentReplyId, content } = replyData;

        const validatedContent = CommentsValidator.validateContent(content, 500);
        const validatedUserId = CommentsValidator.validateId(userId, 'userId');

        let depth = 0;
        let actualCommentId = commentId;

        if (parentReplyId) {
            const parentReply = await this.repliesRepository.findOne({
                where: { id: CommentsValidator.validateId(parentReplyId), status: 'active' }
            });

            if (!parentReply) {
                throw new Error('Parent reply not found');
            }

            depth = parentReply.depth + 1;
            actualCommentId = parentReply.commentId;

            if (depth > 5) {
                throw new Error('Maximum reply depth exceeded');
            }
        } else if (commentId) {
            const comment = await this.commentsRepository.findOne({
                where: { id: CommentsValidator.validateId(commentId), status: 'active' }
            });

            if (!comment) {
                throw new Error('Comment not found');
            }
        } else {
            throw new Error('Either commentId or parentReplyId is required');
        }

        const reply = this.repliesRepository.create({
            commentId: actualCommentId,
            parentReplyId: parentReplyId || null,
            userId: validatedUserId,
            content: validatedContent,
            depth,
            status: 'active'
        });

        const savedReply = await this.repliesRepository.save(reply);

        // Update counts
        if (parentReplyId) {
            await this.updateReplyCount(parentReplyId);
        } else {
            await this.updateReplyCount(actualCommentId);
        }

        // Update total comment count on gallery/blog
        const comment = await this.commentsRepository.findOne({ where: { id: actualCommentId } });
        if (comment) {
            await this.updateCommentCount(comment.commentable_type, comment.commentable_id);
        }

        return savedReply;
    }

    async getComments(commentable_type, commentable_id, queryParams = {}, userId = null) {
        const validatedType = CommentsValidator.validateCommentableType(commentable_type);
        const validatedId = CommentsValidator.validateId(commentable_id, 'commentable_id');
        const pagination = CommentsValidator.validatePagination(queryParams);

        const queryBuilder = this.commentsRepository.createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .where('comment.commentable_type = :type', { type: validatedType })
            .andWhere('comment.commentable_id = :id', { id: validatedId })
            .andWhere('comment.status = :status', { status: 'active' })
            .orderBy('comment.createdAt', pagination.sortOrder)
            .skip(pagination.offset)
            .take(pagination.limit);

        const [comments, totalItems] = await queryBuilder.getManyAndCount();

        // Process comments and add like status + replies
        const processedComments = await Promise.all(
            comments.map(async (comment) => {
                const isLikedByCurrentUser = userId ? await this.checkLikeStatus(userId, 'comment', comment.id) : false;
                const replies = pagination.includeReplies ? await this.getDirectReplies(comment.id, pagination.maxDepth, userId) : [];

                return {
                    ...comment,
                    isLikedByCurrentUser,
                    replies
                };
            })
        );

        return {
            comments: processedComments,
            currentPage: pagination.page,
            totalPages: Math.ceil(totalItems / pagination.limit),
            totalItems,
            itemsPerPage: pagination.limit,
            hasNextPage: pagination.page < Math.ceil(totalItems / pagination.limit),
            hasPrevPage: pagination.page > 1
        };
    }

    async getDirectReplies(commentId, maxDepth, userId = null) {
        if (maxDepth <= 0) return [];

        const replies = await this.repliesRepository.find({
            where: {
                commentId: CommentsValidator.validateId(commentId),
                parentReplyId: null,
                status: 'active'
            },
            relations: ['user'],
            order: { createdAt: 'ASC' }
        });

        return Promise.all(
            replies.map(async (reply) => {
                const isLikedByCurrentUser = userId ? await this.checkLikeStatus(userId, 'reply', reply.id) : false;
                const childReplies = await this.getNestedReplies(reply.id, maxDepth - 1, userId);

                return {
                    ...reply,
                    isLikedByCurrentUser,
                    childReplies
                };
            })
        );
    }

    async getNestedReplies(parentReplyId, maxDepth, userId = null) {
        if (maxDepth <= 0) return [];

        const replies = await this.repliesRepository.find({
            where: { parentReplyId: CommentsValidator.validateId(parentReplyId), status: 'active' },
            relations: ['user'],
            order: { createdAt: 'ASC' }
        });

        return Promise.all(
            replies.map(async (reply) => {
                const isLikedByCurrentUser = userId ? await this.checkLikeStatus(userId, 'reply', reply.id) : false;
                const childReplies = await this.getNestedReplies(reply.id, maxDepth - 1, userId);

                return {
                    ...reply,
                    isLikedByCurrentUser,
                    childReplies
                };
            })
        );
    }

    async toggleLike(likeData, userId) {
        const { likeable_type, likeable_id } = likeData;

        const validatedType = CommentsValidator.validateLikeableType(likeable_type);
        const validatedId = CommentsValidator.validateId(likeable_id, 'likeable_id');
        const validatedUserId = CommentsValidator.validateId(userId, 'userId');

        const existingLike = await this.likesRepository.findOne({
            where: {
                userId: validatedUserId,
                likeable_type: validatedType,
                likeable_id: validatedId
            }
        });

        if (existingLike) {
            await this.likesRepository.remove(existingLike);
            await this.updateLikeCount(validatedType, validatedId);
            return { action: 'unliked', liked: false };
        } else {
            const like = this.likesRepository.create({
                userId: validatedUserId,
                likeable_type: validatedType,
                likeable_id: validatedId
            });

            await this.likesRepository.save(like);
            await this.updateLikeCount(validatedType, validatedId);
            return { action: 'liked', liked: true };
        }
    }

    async getLikeStatus(likeable_type, likeable_id, userId) {
        if (!userId) return { liked: false, likeCount: 0 };

        const validatedType = CommentsValidator.validateLikeableType(likeable_type);
        const validatedId = CommentsValidator.validateId(likeable_id, 'likeable_id');
        const validatedUserId = CommentsValidator.validateId(userId, 'userId');

        const [like, likeCount] = await Promise.all([
            this.likesRepository.findOne({
                where: { userId: validatedUserId, likeable_type: validatedType, likeable_id: validatedId }
            }),
            this.likesRepository.count({
                where: { likeable_type: validatedType, likeable_id: validatedId }
            })
        ]);

        return { liked: !!like, likeCount };
    }

    // Helper methods
    async verifyTargetExists(type, id) {
        const repository = type === 'gallery' ? this.galleryRepository : this.blogRepository;
        const exists = await repository.findOne({ where: { id } });
        if (!exists) {
            throw new Error(`${type} not found`);
        }
    }

    async checkLikeStatus(userId, type, id) {
        const like = await this.likesRepository.findOne({
            where: { userId: parseInt(userId), likeable_type: type, likeable_id: id }
        });
        return !!like;
    }

    // Helper method to update like count
    async updateLikeCount(likeable_type, likeable_id) {
        try {
            const count = await this.likesRepository.count({
                where: {
                    likeable_type,
                    likeable_id: parseInt(likeable_id)
                }
            });

            if (likeable_type === 'gallery') {
                await this.galleryRepository.update(parseInt(likeable_id), { like_count: count });
            } else if (likeable_type === 'blog') {
                await this.blogRepository.update(parseInt(likeable_id), { like_count: count });
            } else if (likeable_type === 'comment') {
                await this.commentsRepository.update(parseInt(likeable_id), { like_count: count });
            } else if (likeable_type === 'reply') {
                await this.repliesRepository.update(parseInt(likeable_id), { like_count: count });
            }
        } catch (error) {
            console.error('Update like count error:', error);
        }
    }

    // Helper method to update comment count (including ALL replies recursively)
    async updateCommentCount(commentable_type, commentable_id) {
        try {
            // Fixed SQL query with correct column name (case-sensitive)
            const countQuery = `
                SELECT COUNT(*) as total_count FROM (
                    SELECT id FROM comments 
                    WHERE commentable_type = $1 AND commentable_id = $2 AND status = 'active'
                    
                    UNION ALL
                    
                    SELECT r.id FROM replies r
                    INNER JOIN comments c ON r."commentId" = c.id
                    WHERE c.commentable_type = $1 AND c.commentable_id = $2 
                    AND r.status = 'active' AND c.status = 'active'
                ) as combined
            `;

            const result = await this.dataSource.query(countQuery, [commentable_type, parseInt(commentable_id)]);
            const totalCount = parseInt(result[0].total_count) || 0;

            if (commentable_type === 'gallery') {
                await this.galleryRepository.update(parseInt(commentable_id), { comment_count: totalCount });
            } else if (commentable_type === 'blog') {
                await this.blogRepository.update(parseInt(commentable_id), { comment_count: totalCount });
            }

            return totalCount;
        } catch (error) {
            console.error('Update comment count error:', error);
            throw error;
        }
    }

    // Helper method to update reply count on comment (direct replies only)
    async updateReplyCount(commentId) {
        try {
            const count = await this.repliesRepository.count({
                where: {
                    commentId: parseInt(commentId),
                    status: 'active',
                    parentReplyId: null // Only count direct replies to the comment
                }
            });

            await this.commentsRepository.update(parseInt(commentId), { reply_count: count });
        } catch (error) {
            console.error('Update reply count error:', error);
        }
    }

    // Helper method to update nested reply count
    async updateNestedReplyCount(parentReplyId) {
        try {
            const count = await this.repliesRepository.count({
                where: {
                    parentReplyId: parseInt(parentReplyId),
                    status: 'active'
                }
            });

            await this.repliesRepository.update(parseInt(parentReplyId), { reply_count: count });
        } catch (error) {
            console.error('Update nested reply count error:', error);
        }
    }

    // Update a comment
    async updateComment(commentId, updateData, userId, userRoles = []) {
        try {
            const comment = await this.commentsRepository.findOne({
                where: { id: parseInt(commentId) },
                relations: ['user']
            });

            if (!comment) {
                throw new Error('Comment not found');
            }

            // Check permissions
            const isOwner = comment.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to update this comment');
            }

            // Validate content if being updated
            if (updateData.content !== undefined) {
                const validatedContent = CommentsValidator.validateContent(updateData.content, 1000);
                comment.content = validatedContent;
            }

            // Only admin/moderator can update status
            if (updateData.status !== undefined && (isAdmin || isModerator)) {
                const validStatuses = ['active', 'hidden', 'deleted'];
                if (validStatuses.includes(updateData.status)) {
                    comment.status = updateData.status;
                }
            }

            const updatedComment = await this.commentsRepository.save(comment);
            return updatedComment;
        } catch (error) {
            console.error('Update comment error:', error);
            throw error;
        }
    }

    // Delete a comment
    async deleteComment(commentId, userId, userRoles = []) {
        try {
            const comment = await this.commentsRepository.findOne({
                where: { id: parseInt(commentId) }
            });

            if (!comment) {
                throw new Error('Comment not found');
            }

            // Check permissions
            const isOwner = comment.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to delete this comment');
            }

            // Soft delete by updating status
            comment.status = 'deleted';
            await this.commentsRepository.save(comment);

            // Update comment count on target entity (this will recalculate total)
            await this.updateCommentCount(comment.commentable_type, comment.commentable_id);

            return true;
        } catch (error) {
            console.error('Delete comment error:', error);
            throw error;
        }
    }

    // Update a reply
    async updateReply(replyId, updateData, userId, userRoles = []) {
        try {
            const reply = await this.repliesRepository.findOne({
                where: { id: parseInt(replyId) },
                relations: ['user']
            });

            if (!reply) {
                throw new Error('Reply not found');
            }

            // Check permissions
            const isOwner = reply.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to update this reply');
            }

            // Validate content if being updated
            if (updateData.content !== undefined) {
                const validatedContent = CommentsValidator.validateContent(updateData.content, 500);
                reply.content = validatedContent;
            }

            // Only admin/moderator can update status
            if (updateData.status !== undefined && (isAdmin || isModerator)) {
                const validStatuses = ['active', 'hidden', 'deleted'];
                if (validStatuses.includes(updateData.status)) {
                    reply.status = updateData.status;
                }
            }

            const updatedReply = await this.repliesRepository.save(reply);
            return updatedReply;
        } catch (error) {
            console.error('Update reply error:', error);
            throw error;
        }
    }

    // Delete a reply
    async deleteReply(replyId, userId, userRoles = []) {
        try {
            const reply = await this.repliesRepository.findOne({
                where: { id: parseInt(replyId) }
            });

            if (!reply) {
                throw new Error('Reply not found');
            }

            // Check permissions
            const isOwner = reply.userId === parseInt(userId);
            const isAdmin = userRoles.includes('admin');
            const isModerator = userRoles.includes('moderator');

            if (!isOwner && !isAdmin && !isModerator) {
                throw new Error('You do not have permission to delete this reply');
            }

            // Soft delete by updating status
            reply.status = 'deleted';
            await this.repliesRepository.save(reply);

            // Update reply count on comment or parent reply
            if (reply.parentReplyId) {
                await this.updateNestedReplyCount(reply.parentReplyId);
            } else {
                await this.updateReplyCount(reply.commentId);
            }

            // Update total comment count on the target entity (gallery/blog)
            const comment = await this.commentsRepository.findOne({
                where: { id: reply.commentId }
            });
            if (comment) {
                await this.updateCommentCount(comment.commentable_type, comment.commentable_id);
            }

            return true;
        } catch (error) {
            console.error('Delete reply error:', error);
            throw error;
        }
    }
}

export { CommentsService };
