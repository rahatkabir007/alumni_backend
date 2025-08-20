import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

class CommentsController {
    constructor(commentsService) {
        this.commentsService = commentsService;
    }

    registerRoutes(app) {
        // Get comments for a specific entity (public - with optional auth for like status)
        app.get('/:type/:id/comments', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            // Get userId from auth or query parameter
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.commentsService.getComments(type, id, req.query, userId);
            return ResponseHandler.success(res, result, 'Comments retrieved successfully');
        }));

        // Create a new comment (authenticated)
        app.post('/:type/:id/comments', authMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            const userId = req.user.id;

            const commentData = {
                ...req.body,
                commentable_type: type,
                commentable_id: id
            };

            const result = await this.commentsService.createComment(commentData, userId);
            return ResponseHandler.created(res, result, 'Comment created successfully');
        }));

        // Update a comment (authenticated)
        app.patch('/comments/:commentId', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.commentsService.updateComment(
                req.params.commentId,
                req.body,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Comment updated successfully');
        }));

        // Delete a comment (authenticated)
        app.delete('/comments/:commentId', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.commentsService.deleteComment(
                req.params.commentId,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, null, 'Comment deleted successfully');
        }));

        // Create a reply to a comment (authenticated)
        app.post('/comments/:commentId/replies', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const commentId = req.params.commentId;

            const replyData = {
                ...req.body,
                commentId
            };

            const result = await this.commentsService.createReply(replyData, userId);
            return ResponseHandler.created(res, result, 'Reply created successfully');
        }));

        // Create a nested reply to another reply (authenticated)
        app.post('/replies/:parentReplyId/replies', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const parentReplyId = req.params.parentReplyId;

            const replyData = {
                ...req.body,
                parentReplyId
            };

            const result = await this.commentsService.createReply(replyData, userId);
            return ResponseHandler.created(res, result, 'Nested reply created successfully');
        }));

        // Update a reply (authenticated)
        app.patch('/replies/:replyId', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.commentsService.updateReply(
                req.params.replyId,
                req.body,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Reply updated successfully');
        }));

        // Delete a reply (authenticated)
        app.delete('/replies/:replyId', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.commentsService.deleteReply(
                req.params.replyId,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, null, 'Reply deleted successfully');
        }));

        // Get nested replies for a specific reply (public - with optional auth for like status)
        app.get('/replies/:replyId/nested', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            // Get userId from auth or query parameter
            const userId = req.user?.id || req.query.userId || null;
            const maxDepth = parseInt(req.query.maxDepth) || 3;

            const result = await this.commentsService.getNestedReplies(req.params.replyId, maxDepth, userId);
            return ResponseHandler.success(res, result, 'Nested replies retrieved successfully');
        }));

        // Toggle like on any entity (authenticated)
        app.post('/like', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const { likeable_type, likeable_id } = req.body;

            if (!likeable_type || !likeable_id) {
                return ResponseHandler.error(res,
                    new Error('likeable_type and likeable_id are required'),
                    'likeable_type and likeable_id are required'
                );
            }

            const result = await this.commentsService.toggleLike(req.body, userId);
            return ResponseHandler.success(res, result, `Successfully ${result.action}`);
        }));

        // Get like status for an entity (public - with optional auth for user-specific data)
        app.get('/like-status/:type/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            // Get userId from auth or query parameter
            const userId = req.user?.id || req.query.userId || null;

            const result = await this.commentsService.getLikeStatus(type, id, userId);
            return ResponseHandler.success(res, result, 'Like status retrieved successfully');
        }));
    }
}

export { CommentsController };
