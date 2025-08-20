import { getDataSource } from "../../config/database.js";
import { Comments } from "../../entities/Comments.js";
import { Replies } from "../../entities/Replies.js";
import { Likes } from "../../entities/Likes.js";
import { Gallery } from "../../entities/Gallery.js";
import { Blog } from "../../entities/Blog.js";
import { User } from "../../entities/User.js";

class CommentsService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.commentsRepository = this.dataSource.getRepository(Comments);
            this.repliesRepository = this.dataSource.getRepository(Replies);
            this.likesRepository = this.dataSource.getRepository(Likes);
            this.galleryRepository = this.dataSource.getRepository(Gallery);
            this.blogRepository = this.dataSource.getRepository(Blog);
            this.userRepository = this.dataSource.getRepository(User);
        } catch (error) {
            console.error('Error initializing CommentsService:', error);
            throw error;
        }
    }

    // Create a new comment
    async createComment(commentData, userId) {
        try {
            const { commentable_type, commentable_id, content } = commentData;

            // Validate content
            if (!content || content.trim().length === 0) {
                throw new Error('Comment content is required');
            }

            if (content.trim().length > 1000) {
                throw new Error('Comment content cannot exceed 1000 characters');
            }

            // Validate commentable_type
            const validTypes = ['gallery', 'blog'];
            if (!validTypes.includes(commentable_type)) {
                throw new Error('Invalid commentable type');
            }

            // Verify that the target entity exists
            let targetExists = false;
            if (commentable_type === 'gallery') {
                const gallery = await this.galleryRepository.findOne({ where: { id: commentable_id } });
                targetExists = !!gallery;
            } else if (commentable_type === 'blog') {
                const blog = await this.blogRepository.findOne({ where: { id: commentable_id } });
                targetExists = !!blog;
            }

            if (!targetExists) {
                throw new Error(`${commentable_type} not found`);
            }

            // Create comment
            const comment = this.commentsRepository.create({
                userId: parseInt(userId),
                commentable_type,
                commentable_id: parseInt(commentable_id),
                content: content.trim(),
                status: 'active'
            });

            const savedComment = await this.commentsRepository.save(comment);

            // Update comment count on target entity
            await this.updateCommentCount(commentable_type, commentable_id);

            return savedComment;
        } catch (error) {
            console.error('Create comment error:', error);
            throw error;
        }
    }

    // Get comments for a specific entity
    async getComments(commentable_type, commentable_id, queryParams = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                sortOrder = 'ASC',
                includeReplies = true
            } = queryParams;

            // Fix: Ensure proper type handling for pagination
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
            const offset = (pageNum - 1) * limitNum;

            // Fix: Ensure commentable_id is properly parsed as integer
            const parsedCommentableId = parseInt(commentable_id);
            if (isNaN(parsedCommentableId)) {
                throw new Error('Invalid commentable ID');
            }

            const queryBuilder = this.commentsRepository.createQueryBuilder('comment');

            // Use leftJoin and manually select specific user fields only
            queryBuilder.leftJoin('comment.user', 'user');
            queryBuilder.addSelect([
                'user.id',
                'user.name',
                'user.email',
                'user.profilePhoto'
            ]);

            // Include replies if requested with specific user info only
            if (includeReplies) {
                queryBuilder.leftJoin('comment.replies', 'replies', 'replies.status = :replyStatus', { replyStatus: 'active' });
                queryBuilder.leftJoin('replies.user', 'replyUser');
                queryBuilder.addSelect([
                    'replies.id',
                    'replies.content',
                    'replies.like_count',
                    'replies.createdAt',
                    'replies.updatedAt',
                    'replyUser.id',
                    'replyUser.name',
                    'replyUser.email',
                    'replyUser.profilePhoto'
                ]);
            }

            // Filter by entity
            queryBuilder.where('comment.commentable_type = :type', { type: commentable_type });
            queryBuilder.andWhere('comment.commentable_id = :id', { id: parsedCommentableId });
            queryBuilder.andWhere('comment.status = :status', { status: 'active' });

            // Apply sorting
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
            queryBuilder.orderBy('comment.createdAt', validSortOrder);

            if (includeReplies) {
                queryBuilder.addOrderBy('replies.createdAt', 'ASC');
            }

            // Get total count
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(offset).take(limitNum);

            const comments = await queryBuilder.getMany();

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return {
                comments,
                currentPage: pageNum,
                totalPages,
                totalItems,
                itemsPerPage: limitNum,
                hasNextPage,
                hasPrevPage,
            };
        } catch (error) {
            console.error('Get comments error:', error);
            throw error;
        }
    }

    // Update a comment
    async updateComment(commentId, updateData, userId, userRoles = []) {
        try {
            const comment = await this.commentsRepository.findOne({
                where: { id: commentId },
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
                if (!updateData.content || updateData.content.trim().length === 0) {
                    throw new Error('Comment content cannot be empty');
                }

                if (updateData.content.trim().length > 1000) {
                    throw new Error('Comment content cannot exceed 1000 characters');
                }

                comment.content = updateData.content.trim();
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
                where: { id: commentId }
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

            // Update comment count on target entity
            await this.updateCommentCount(comment.commentable_type, comment.commentable_id);

            return true;
        } catch (error) {
            console.error('Delete comment error:', error);
            throw error;
        }
    }

    // Create a reply to a comment
    async createReply(replyData, userId) {
        try {
            const { commentId, content } = replyData;

            // Validate content
            if (!content || content.trim().length === 0) {
                throw new Error('Reply content is required');
            }

            if (content.trim().length > 500) {
                throw new Error('Reply content cannot exceed 500 characters');
            }

            // Verify comment exists and is active
            const comment = await this.commentsRepository.findOne({
                where: { id: commentId, status: 'active' }
            });

            if (!comment) {
                throw new Error('Comment not found or not available for replies');
            }

            // Create reply
            const reply = this.repliesRepository.create({
                commentId: parseInt(commentId),
                userId: parseInt(userId),
                content: content.trim(),
                status: 'active'
            });

            const savedReply = await this.repliesRepository.save(reply);

            // Update reply count on comment
            await this.updateReplyCount(commentId);

            return savedReply;
        } catch (error) {
            console.error('Create reply error:', error);
            throw error;
        }
    }

    // Update a reply
    async updateReply(replyId, updateData, userId, userRoles = []) {
        try {
            const reply = await this.repliesRepository.findOne({
                where: { id: replyId },
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
                if (!updateData.content || updateData.content.trim().length === 0) {
                    throw new Error('Reply content cannot be empty');
                }

                if (updateData.content.trim().length > 500) {
                    throw new Error('Reply content cannot exceed 500 characters');
                }

                reply.content = updateData.content.trim();
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
                where: { id: replyId }
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

            // Update reply count on comment
            await this.updateReplyCount(reply.commentId);

            return true;
        } catch (error) {
            console.error('Delete reply error:', error);
            throw error;
        }
    }

    // Toggle like on an entity (gallery, blog, comment, reply)
    async toggleLike(likeData, userId) {
        try {
            const { likeable_type, likeable_id } = likeData;

            // Validate likeable_type
            const validTypes = ['gallery', 'blog', 'comment', 'reply'];
            if (!validTypes.includes(likeable_type)) {
                throw new Error('Invalid likeable type');
            }

            // Check if like already exists
            const existingLike = await this.likesRepository.findOne({
                where: {
                    userId: parseInt(userId),
                    likeable_type,
                    likeable_id: parseInt(likeable_id)
                }
            });

            if (existingLike) {
                // Unlike - remove the like
                await this.likesRepository.delete(existingLike.id);
                await this.updateLikeCount(likeable_type, likeable_id);
                return { action: 'unliked', liked: false };
            } else {
                // Like - create new like
                const like = this.likesRepository.create({
                    userId: parseInt(userId),
                    likeable_type,
                    likeable_id: parseInt(likeable_id)
                });

                await this.likesRepository.save(like);
                await this.updateLikeCount(likeable_type, likeable_id);
                return { action: 'liked', liked: true };
            }
        } catch (error) {
            console.error('Toggle like error:', error);
            throw error;
        }
    }

    // Get like status for an entity
    async getLikeStatus(likeable_type, likeable_id, userId) {
        try {
            if (!userId) {
                return { liked: false, likeCount: 0 };
            }

            const like = await this.likesRepository.findOne({
                where: {
                    userId: parseInt(userId),
                    likeable_type,
                    likeable_id: parseInt(likeable_id)
                }
            });

            const likeCount = await this.likesRepository.count({
                where: {
                    likeable_type,
                    likeable_id: parseInt(likeable_id)
                }
            });

            return {
                liked: !!like,
                likeCount
            };
        } catch (error) {
            console.error('Get like status error:', error);
            throw error;
        }
    }

    // Helper method to update comment count
    async updateCommentCount(commentable_type, commentable_id) {
        try {
            const count = await this.commentsRepository.count({
                where: {
                    commentable_type,
                    commentable_id: parseInt(commentable_id),
                    status: 'active'
                }
            });

            if (commentable_type === 'gallery') {
                await this.galleryRepository.update(commentable_id, { comment_count: count });
            } else if (commentable_type === 'blog') {
                await this.blogRepository.update(commentable_id, { comment_count: count });
            }
        } catch (error) {
            console.error('Update comment count error:', error);
        }
    }

    // Helper method to update reply count
    async updateReplyCount(commentId) {
        try {
            const count = await this.repliesRepository.count({
                where: {
                    commentId: parseInt(commentId),
                    status: 'active'
                }
            });

            await this.commentsRepository.update(commentId, { reply_count: count });
        } catch (error) {
            console.error('Update reply count error:', error);
        }
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
                await this.galleryRepository.update(likeable_id, { like_count: count });
            } else if (likeable_type === 'blog') {
                await this.blogRepository.update(likeable_id, { like_count: count });
            } else if (likeable_type === 'comment') {
                await this.commentsRepository.update(likeable_id, { like_count: count });
            } else if (likeable_type === 'reply') {
                await this.repliesRepository.update(likeable_id, { like_count: count });
            }
        } catch (error) {
            console.error('Update like count error:', error);
        }
    }
}

export { CommentsService };
