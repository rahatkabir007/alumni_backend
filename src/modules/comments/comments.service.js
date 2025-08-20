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

    // Get comments for a specific entity with proper like status
    async getComments(commentable_type, commentable_id, queryParams = {}, userId = null) {
        try {
            const {
                page = 1,
                limit = 20,
                sortOrder = 'ASC',
                includeReplies = true,
                maxDepth = 3
            } = queryParams;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
            const offset = (pageNum - 1) * limitNum;

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

            // Include like status for comments if user is authenticated
            if (userId) {
                queryBuilder.leftJoin(
                    'Likes',
                    'commentUserLike',
                    'commentUserLike.likeable_type = :commentLikeableType AND commentUserLike.likeable_id = comment.id AND commentUserLike.userId = :currentUserId',
                    { commentLikeableType: 'comment', currentUserId: parseInt(userId) }
                );
                queryBuilder.addSelect('CASE WHEN commentUserLike.id IS NOT NULL THEN true ELSE false END', 'commentIsLiked');
            }

            // Filter by entity
            queryBuilder.where('comment.commentable_type = :type', { type: commentable_type });
            queryBuilder.andWhere('comment.commentable_id = :id', { id: parsedCommentableId });
            queryBuilder.andWhere('comment.status = :status', { status: 'active' });

            // Apply sorting
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
            queryBuilder.orderBy('comment.createdAt', validSortOrder);

            // Get total count
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(offset).take(limitNum);

            const result = await queryBuilder.getRawAndEntities();

            // Post-process to add like status and fetch nested replies
            const processedComments = [];

            for (let i = 0; i < result.entities.length; i++) {
                const comment = result.entities[i];
                const rawResult = result.raw[i];

                const processedComment = {
                    ...comment,
                    isLikedByCurrentUser: userId ? (rawResult.commentIsLiked === true || rawResult.commentIsLiked === 'true') : false,
                    replies: []
                };

                // Fetch direct replies (parentReplyId IS NULL) if requested
                if (includeReplies) {
                    processedComment.replies = await this.getDirectReplies(comment.id, maxDepth, userId);
                }

                processedComments.push(processedComment);
            }

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return {
                comments: processedComments,
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

    // New method to get direct replies to a comment (where parentReplyId IS NULL)
    async getDirectReplies(commentId, maxDepth, userId = null) {
        if (maxDepth <= 0) {
            return [];
        }

        const queryBuilder = this.repliesRepository.createQueryBuilder('reply');

        queryBuilder.leftJoin('reply.user', 'user');
        queryBuilder.addSelect([
            'user.id',
            'user.name',
            'user.email',
            'user.profilePhoto'
        ]);

        // Include like status if user is authenticated
        if (userId) {
            queryBuilder.leftJoin(
                'Likes',
                'replyUserLike',
                'replyUserLike.likeable_type = :replyLikeableType AND replyUserLike.likeable_id = reply.id AND replyUserLike.userId = :currentUserId',
                { replyLikeableType: 'reply', currentUserId: parseInt(userId) }
            );
            queryBuilder.addSelect('CASE WHEN replyUserLike.id IS NOT NULL THEN true ELSE false END', 'replyIsLiked');
        }

        // Get direct replies to the comment (parentReplyId IS NULL)
        queryBuilder.where('reply.commentId = :commentId', { commentId });
        queryBuilder.andWhere('reply.parentReplyId IS NULL'); // Only direct replies
        queryBuilder.andWhere('reply.status = :status', { status: 'active' });
        queryBuilder.orderBy('reply.createdAt', 'ASC');

        const result = await queryBuilder.getRawAndEntities();

        // Process replies and get their nested replies
        const processedReplies = [];

        for (let i = 0; i < result.entities.length; i++) {
            const reply = result.entities[i];
            const rawResult = result.raw[i];

            const processedReply = {
                ...reply,
                isLikedByCurrentUser: userId ? (rawResult.replyIsLiked === true || rawResult.replyIsLiked === 'true') : false,
                childReplies: await this.getNestedReplies(reply.id, maxDepth - 1, userId)
            };

            processedReplies.push(processedReply);
        }

        return processedReplies;
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

    // Create a reply to a comment OR a nested reply to another reply
    async createReply(replyData, userId) {
        try {
            const { commentId, parentReplyId, content } = replyData;

            // Validate content
            if (!content || content.trim().length === 0) {
                throw new Error('Reply content is required');
            }

            if (content.trim().length > 500) {
                throw new Error('Reply content cannot exceed 500 characters');
            }

            let depth = 0;
            let actualCommentId = commentId;

            if (parentReplyId) {
                // This is a nested reply - validate parent reply exists
                const parentReply = await this.repliesRepository.findOne({
                    where: { id: parentReplyId, status: 'active' }
                });

                if (!parentReply) {
                    throw new Error('Parent reply not found or not available');
                }

                // Set depth and comment ID based on parent
                depth = parentReply.depth + 1;
                actualCommentId = parentReply.commentId;

                // Optional: Limit nesting depth to prevent infinite nesting
                const maxDepth = 5; // Allow up to 5 levels of nesting
                if (depth > maxDepth) {
                    throw new Error(`Maximum reply depth of ${maxDepth} exceeded`);
                }
            } else if (commentId) {
                // This is a direct reply to a comment
                const comment = await this.commentsRepository.findOne({
                    where: { id: commentId, status: 'active' }
                });

                if (!comment) {
                    throw new Error('Comment not found or not available for replies');
                }
            } else {
                throw new Error('Either commentId or parentReplyId is required');
            }

            // Create reply
            const reply = this.repliesRepository.create({
                commentId: parseInt(actualCommentId),
                parentReplyId: parentReplyId ? parseInt(parentReplyId) : null,
                userId: parseInt(userId),
                content: content.trim(),
                depth: depth,
                status: 'active'
            });

            const savedReply = await this.repliesRepository.save(reply);

            // Update reply count on the parent (either comment or parent reply)
            if (parentReplyId) {
                await this.updateNestedReplyCount(parentReplyId);
            } else {
                await this.updateReplyCount(actualCommentId);
            }

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

    // Helper method to update comment count (including replies)
    async updateCommentCount(commentable_type, commentable_id) {
        try {
            // Count both direct comments and all replies to those comments
            const countQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM comments WHERE commentable_type = $1 AND commentable_id = $2 AND status = 'active') +
                    (SELECT COUNT(*) FROM replies r 
                     JOIN comments c ON r.commentId = c.id 
                     WHERE c.commentable_type = $1 AND c.commentable_id = $2 AND r.status = 'active') as total_count
            `;

            const result = await this.dataSource.query(countQuery, [commentable_type, commentable_id]);
            const totalCount = parseInt(result[0].total_count) || 0;

            if (commentable_type === 'gallery') {
                await this.galleryRepository.update(commentable_id, { comment_count: totalCount });
            } else if (commentable_type === 'blog') {
                await this.blogRepository.update(commentable_id, { comment_count: totalCount });
            }
        } catch (error) {
            console.error('Update comment count error:', error);
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

    // Helper method to update nested reply count
    async updateNestedReplyCount(parentReplyId) {
        try {
            const count = await this.repliesRepository.count({
                where: {
                    parentReplyId: parseInt(parentReplyId),
                    status: 'active'
                }
            });

            await this.repliesRepository.update(parentReplyId, { reply_count: count });
        } catch (error) {
            console.error('Update nested reply count error:', error);
        }
    }

    // Helper method to recursively fetch nested replies with proper like status
    async getNestedReplies(parentReplyId, maxDepth, userId = null) {
        if (maxDepth <= 0) {
            return [];
        }

        const queryBuilder = this.repliesRepository.createQueryBuilder('reply');

        queryBuilder.leftJoin('reply.user', 'user');
        queryBuilder.addSelect([
            'user.id',
            'user.name',
            'user.email',
            'user.profilePhoto'
        ]);

        // Include like status if user is authenticated
        if (userId) {
            queryBuilder.leftJoin(
                'Likes',
                'replyUserLike',
                'replyUserLike.likeable_type = :replyLikeableType AND replyUserLike.likeable_id = reply.id AND replyUserLike.userId = :currentUserId',
                { replyLikeableType: 'reply', currentUserId: parseInt(userId) }
            );
            queryBuilder.addSelect('CASE WHEN replyUserLike.id IS NOT NULL THEN true ELSE false END', 'replyIsLiked');
        }

        queryBuilder.where('reply.parentReplyId = :parentReplyId', { parentReplyId });
        queryBuilder.andWhere('reply.status = :status', { status: 'active' });
        queryBuilder.orderBy('reply.createdAt', 'ASC');

        const result = await queryBuilder.getRawAndEntities();

        // Recursively fetch nested replies for each reply
        const processedReplies = [];

        for (let i = 0; i < result.entities.length; i++) {
            const reply = result.entities[i];
            const rawResult = result.raw[i];

            const processedReply = {
                ...reply,
                isLikedByCurrentUser: userId ? (rawResult.replyIsLiked === true || rawResult.replyIsLiked === 'true') : false,
                childReplies: await this.getNestedReplies(reply.id, maxDepth - 1, userId)
            };

            processedReplies.push(processedReply);
        }

        return processedReplies;
    }
}

export { CommentsService };
