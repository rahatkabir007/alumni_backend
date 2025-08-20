import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

class CommentsController {
    constructor(commentsService) {
        this.commentsService = commentsService;
    }

    registerRoutes(app) {
        // Get comments for entity (public with optional auth)
        app.get('/:type/:id/comments', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.commentsService.getComments(type, id, req.query, userId);
            return ResponseHandler.success(res, result, 'Comments retrieved successfully');
        }));

        // Create comment (authenticated)
        app.post('/:type/:id/comments', authMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            const commentData = { ...req.body, commentable_type: type, commentable_id: id };
            const result = await this.commentsService.createComment(commentData, req.user.id);
            return ResponseHandler.created(res, result, 'Comment created successfully');
        }));

        // Create reply (authenticated)
        app.post('/comments/:commentId/replies', authMiddleware, asyncHandler(async (req, res) => {
            const replyData = { ...req.body, commentId: req.params.commentId };
            const result = await this.commentsService.createReply(replyData, req.user.id);
            return ResponseHandler.created(res, result, 'Reply created successfully');
        }));

        // Create nested reply (authenticated)
        app.post('/replies/:parentReplyId/replies', authMiddleware, asyncHandler(async (req, res) => {
            const replyData = { ...req.body, parentReplyId: req.params.parentReplyId };
            const result = await this.commentsService.createReply(replyData, req.user.id);
            return ResponseHandler.created(res, result, 'Nested reply created successfully');
        }));

        // Toggle like (authenticated)
        app.post('/like', authMiddleware, asyncHandler(async (req, res) => {
            const { likeable_type, likeable_id } = req.body;
            if (!likeable_type || !likeable_id) {
                return ResponseHandler.error(res, new Error('likeable_type and likeable_id are required'));
            }
            const result = await this.commentsService.toggleLike(req.body, req.user.id);
            return ResponseHandler.success(res, result, `Successfully ${result.action}`);
        }));

        // Get like status (public with optional auth)
        app.get('/like-status/:type/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const { type, id } = req.params;
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.commentsService.getLikeStatus(type, id, userId);
            return ResponseHandler.success(res, result, 'Like status retrieved successfully');
        }));
    }
}

export { CommentsController };
