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
            // Simple but comprehensive query to count all comments and replies
            const countQuery = `
                SELECT COUNT(*) as total_count FROM (
                    SELECT id FROM comments 
                    WHERE commentable_type = $1 AND commentable_id = $2 AND status = 'active'
                    
                    UNION ALL
                    
                    SELECT r.id FROM replies r
                    INNER JOIN comments c ON r.commentId = c.id
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
}

export { CommentsService };
