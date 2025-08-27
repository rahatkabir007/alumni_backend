import { getDataSource } from "../../config/database.js";
import { Post } from "../../entities/Post.js";
import { User } from "../../entities/User.js";
import { PostValidator } from "../../validations/postValidation.js";

class PostsService {
    constructor() {
        this.dataSource = getDataSource();
        this.postRepository = this.dataSource.getRepository(Post);
        this.userRepository = this.dataSource.getRepository(User);
    }

    async createPost(postData, userId) {
        const validatedData = PostValidator.validatePostCreation(postData, userId);
        const post = this.postRepository.create(validatedData);
        return await this.postRepository.save(post);
    }

    async getAllPosts(queryParams = {}, userId = null) {
        const validated = PostValidator.validateQueryParams(queryParams);

        const queryBuilder = this.postRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.user', 'user');

        // Apply filters
        if (validated.status) queryBuilder.andWhere('post.status = :status', { status: validated.status });
        if (validated.userId) queryBuilder.andWhere('post.userId = :filterUserId', { filterUserId: validated.userId });
        if (validated.visibility) queryBuilder.andWhere('post.visibility = :visibility', { visibility: validated.visibility });

        // Tag filter
        if (validated.tag) {
            queryBuilder.andWhere('JSON_SEARCH(post.tags, "one", :tag) IS NOT NULL', { tag: validated.tag });
        }

        queryBuilder.orderBy(`post.${validated.sortBy}`, validated.sortOrder);

        const totalItems = await queryBuilder.getCount();
        queryBuilder.skip(validated.offset).take(validated.limit);

        const posts = await queryBuilder.getMany();

        // Batch check like status if user is authenticated
        const postLikes = userId ? await this.batchCheckLikes(userId, posts.map(p => p.id)) : new Map();

        const processedPosts = posts.map(post => ({
            ...post,
            isLikedByCurrentUser: postLikes.has(post.id)
        }));

        return {
            posts: processedPosts,
            currentPage: validated.page,
            totalPages: Math.ceil(totalItems / validated.limit),
            totalItems,
            itemsPerPage: validated.limit,
            hasNextPage: validated.page < Math.ceil(totalItems / validated.limit),
            hasPrevPage: validated.page > 1
        };
    }

    async getPostById(id, includeDetails = false, userId = null) {
        const postId = typeof id === 'string' ? parseInt(id) : id;
        if (isNaN(postId) || postId <= 0) {
            throw new Error('Invalid post ID');
        }

        const post = await this.postRepository.findOne({
            where: { id: postId },
            relations: ['user']
        });

        if (!post) return null;

        // Check like status and get updated comment count
        const [isLikedByCurrentUser, totalCommentCount] = await Promise.all([
            userId ? this.checkUserLikeStatus(userId, postId) : false,
            this.getActualCommentCount(postId)
        ]);

        // Update comment count if different
        if (post.comment_count !== totalCommentCount) {
            await this.postRepository.update(postId, { comment_count: totalCommentCount });
            post.comment_count = totalCommentCount;
        }

        const processedPost = {
            ...post,
            isLikedByCurrentUser,
            comment_count: totalCommentCount
        };

        if (includeDetails) {
            const { CommentsService } = await import('../comments/comments.service.js');
            const commentsService = new CommentsService();
            const commentsResult = await commentsService.getComments('post', postId, {
                includeReplies: true,
                maxDepth: 5
            }, userId);
            processedPost.comments = commentsResult.comments || [];
        }

        return processedPost;
    }

    async getUserPosts(userId, queryParams = {}, currentUserId = null) {
        const userIdNum = PostValidator.validateUserId(userId);
        const params = { ...queryParams, userId: userIdNum };
        return await this.getAllPosts(params, currentUserId);
    }

    // Helper methods
    async batchCheckLikes(userId, postIds) {
        if (!postIds.length) return new Map();

        try {
            const likes = await this.dataSource
                .getRepository('Likes')
                .createQueryBuilder('like')
                .select(['like.likeable_id'])
                .where('like.userId = :userId', { userId: parseInt(userId) })
                .andWhere('like.likeable_type = :type', { type: 'post' })
                .andWhere('like.likeable_id IN (:...postIds)', { postIds: postIds.map(id => parseInt(id)) })
                .getMany();

            const likesMap = new Map();
            likes.forEach(like => likesMap.set(like.likeable_id, true));
            return likesMap;
        } catch (error) {
            console.error('Batch check likes error:', error);
            return new Map();
        }
    }

    async checkUserLikeStatus(userId, postId) {
        try {
            const like = await this.dataSource
                .getRepository('Likes')
                .findOne({
                    where: {
                        userId: parseInt(userId),
                        likeable_type: 'post',
                        likeable_id: parseInt(postId)
                    }
                });
            return !!like;
        } catch (error) {
            console.error('Check user like status error:', error);
            return false;
        }
    }

    async getActualCommentCount(postId) {
        try {
            const result = await this.dataSource.query(`
                SELECT COUNT(*) as total_count FROM (
                    SELECT id FROM comments 
                    WHERE commentable_type = 'post' AND commentable_id = $1 AND status = 'active'
                    
                    UNION ALL
                    
                    SELECT r.id FROM replies r
                    INNER JOIN comments c ON r."commentId" = c.id
                    WHERE c.commentable_type = 'post' AND c.commentable_id = $1 
                    AND r.status = 'active' AND c.status = 'active'
                ) as combined
            `, [parseInt(postId)]);

            return parseInt(result[0].total_count) || 0;
        } catch (error) {
            console.error('Get actual comment count error:', error);
            return 0;
        }
    }

    async updatePost(id, updateData, userId, userRoles = []) {
        const postId = PostValidator.validateUserId(id);
        const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['user'] });

        if (!post) throw new Error('Post not found');

        const isOwner = post.userId === parseInt(userId);
        const isAdmin = userRoles.includes('admin');
        const isModerator = userRoles.includes('moderator');

        if (!isOwner && !isAdmin && !isModerator) {
            throw new Error('You do not have permission to update this post');
        }

        const validatedData = PostValidator.validatePostUpdate(updateData, isAdmin || isModerator);
        Object.assign(post, validatedData);

        return await this.postRepository.save(post);
    }

    async deletePost(id, userId, userRoles = []) {
        const postId = PostValidator.validateUserId(id);
        const post = await this.postRepository.findOne({ where: { id: postId } });

        if (!post) throw new Error('Post not found');

        const isOwner = post.userId === parseInt(userId);
        const isAdmin = userRoles.includes('admin');
        const isModerator = userRoles.includes('moderator');

        if (!isOwner && !isAdmin && !isModerator) {
            throw new Error('You do not have permission to delete this post');
        }

        const result = await this.postRepository.delete(postId);
        return result.affected > 0;
    }

    async updatePostStatus(id, status, userRoles = []) {
        if (!userRoles.includes('admin') && !userRoles.includes('moderator')) {
            throw new Error('You do not have permission to update post status');
        }

        const postId = PostValidator.validateUserId(id);
        const validatedStatus = PostValidator.validateStatus(status, true);
        const post = await this.postRepository.findOne({ where: { id: postId } });

        if (!post) throw new Error('Post not found');

        post.status = validatedStatus;

        // Set published_at when status changes to active
        if (validatedStatus === 'active' && !post.published_at) {
            post.published_at = new Date();
        }

        return await this.postRepository.save(post);
    }
}

export { PostsService };
