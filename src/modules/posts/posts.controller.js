import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAdminOrModerator } from "../../middlewares/role.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { PostsService } from "./posts.service.js";
import { CommentsService } from "../comments/comments.service.js";

class PostsController {
    constructor(postsService) {
        this.postsService = postsService;
        this.commentsService = new CommentsService();
    }

    registerRoutes(app) {
        // Get all posts (public - with optional auth for like status)
        app.get('/posts', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.postsService.getAllPosts(req.query, userId);
            return ResponseHandler.success(res, result, 'Posts retrieved successfully');
        }));

        // Get current user's posts (authenticated)
        app.get('/posts/my', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const result = await this.postsService.getUserPosts(userId, req.query, userId);
            return ResponseHandler.success(res, result, 'Your posts retrieved successfully');
        }));

        // Create new post (authenticated users only)
        app.post('/posts', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const postData = req.body;

            if (!postData.body) {
                return ResponseHandler.error(res,
                    new Error('Post body is required'),
                    'Post body is required'
                );
            }

            const result = await this.postsService.createPost(postData, userId);
            return ResponseHandler.created(res, result, 'Post created successfully');
        }));

        // Get posts by user ID (public - with optional auth for like status)
        app.get('/posts/user/:userId', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const currentUserId = req.user?.id || req.query.currentUserId || null;
            const result = await this.postsService.getUserPosts(req.params.userId, req.query, currentUserId);
            return ResponseHandler.success(res, result, 'User posts retrieved successfully');
        }));

        // Get post by ID with optional details (public - with optional auth for like status)
        app.get('/posts/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const includeDetails = req.query.includeDetails === 'true';
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.postsService.getPostById(req.params.id, includeDetails, userId);

            if (!result) {
                return ResponseHandler.notFound(res, 'Post not found');
            }

            return ResponseHandler.success(res, result, 'Post retrieved successfully');
        }));

        // Update post by ID (owner, admin, or moderator)
        app.patch('/posts/:id', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            const updateData = req.body;

            const result = await this.postsService.updatePost(
                req.params.id,
                updateData,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Post updated successfully');
        }));

        // Update post status (admin or moderator only)
        app.patch('/posts/:id/status', authMiddleware, requireAdminOrModerator, asyncHandler(async (req, res) => {
            const { status } = req.body;
            const userRoles = req.user.roles || [];

            if (!status) {
                return ResponseHandler.error(res,
                    new Error('Status is required'),
                    'Status is required'
                );
            }

            const result = await this.postsService.updatePostStatus(
                req.params.id,
                status,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Post status updated successfully');
        }));

        // Delete post by ID (owner, admin, or moderator)
        app.delete('/posts/:id', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.postsService.deletePost(
                req.params.id,
                userId,
                userRoles
            );

            if (!result) {
                return ResponseHandler.notFound(res, 'Post not found');
            }

            return ResponseHandler.success(res, null, 'Post deleted successfully');
        }));

        // Toggle like on post (authenticated)
        app.post('/posts/:id/like', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const postId = req.params.id;

            const likeData = {
                likeable_type: 'post',
                likeable_id: postId
            };

            const result = await this.commentsService.toggleLike(likeData, userId);
            return ResponseHandler.success(res, result, `Post ${result.action} successfully`);
        }));

        // Get like status for post (public - with optional auth)
        app.get('/posts/:id/like-status', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const postId = req.params.id;
            const userId = req.user?.id || req.query.userId || null;

            const result = await this.commentsService.getLikeStatus('post', postId, userId);
            return ResponseHandler.success(res, result, 'Post like status retrieved successfully');
        }));
    }
}

export { PostsController };
