import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAdminOrModerator } from "../../middlewares/role.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { GalleriesService } from "./galleries.service.js";
import { CommentsService } from "../comments/comments.service.js";

class GalleriesController {
    /**
     * @param {GalleriesService} galleriesService
     */
    constructor(galleriesService) {
        this.galleriesService = galleriesService;
        this.commentsService = new CommentsService();
    }

    registerRoutes(app) {

        // Get all galleries (public - with optional auth for like status)
        app.get('/gallery', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            // Get userId from auth or query parameter
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.galleriesService.getAllGalleries(req.query, userId);
            return ResponseHandler.success(res, result, 'Galleries retrieved successfully');
        }));


        // Get current user's galleries (authenticated)
        app.get('/gallery/my', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const result = await this.galleriesService.getUserGalleries(userId, req.query, userId);
            return ResponseHandler.success(res, result, 'Your galleries retrieved successfully');
        }));

        // Create new gallery (authenticated users only)
        app.post('/gallery', authMiddleware, asyncHandler(async (req, res) => {

            const userId = req.user.id;
            const galleryData = req.body;

            if (!galleryData.image) {
                return ResponseHandler.error(res,
                    new Error('Image URL is required'),
                    'Image URL is required'
                );
            }

            if (!galleryData.year) {
                return ResponseHandler.error(res,
                    new Error('Year is required'),
                    'Year is required'
                );
            }

            const result = await this.galleriesService.createGallery(galleryData, userId);
            return ResponseHandler.created(res, result, 'Gallery created successfully');
        }));


        // Get galleries by user ID (public - with optional auth for like status)
        app.get('/gallery/user/:userId', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            // Get current user ID from auth or query parameter
            const currentUserId = req.user?.id || req.query.currentUserId || null;
            const result = await this.galleriesService.getUserGalleries(req.params.userId, req.query, currentUserId);
            return ResponseHandler.success(res, result, 'User galleries retrieved successfully');
        }));

        // Get gallery by ID with optional details (public - with optional auth for like status)
        app.get('/gallery/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const includeDetails = req.query.includeDetails === 'true';
            // Get userId from auth or query parameter
            const userId = req.user?.id || req.query.userId || null;
            const result = await this.galleriesService.getGalleryById(req.params.id, includeDetails, userId);

            if (!result) {
                return ResponseHandler.notFound(res, 'Gallery not found');
            }

            return ResponseHandler.success(res, result, 'Gallery retrieved successfully');
        }));


        // Update gallery by ID (owner, admin, or moderator)
        app.patch('/gallery/:id', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];
            const updateData = req.body;

            const result = await this.galleriesService.updateGallery(
                req.params.id,
                updateData,
                userId,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Gallery updated successfully');
        }));

        // Update gallery status (admin or moderator only)
        app.patch('/gallery/:id/status', authMiddleware, requireAdminOrModerator, asyncHandler(async (req, res) => {
            const { status } = req.body;
            const userRoles = req.user.roles || [];

            if (!status) {
                return ResponseHandler.error(res,
                    new Error('Status is required'),
                    'Status is required'
                );
            }

            const result = await this.galleriesService.updateGalleryStatus(
                req.params.id,
                status,
                userRoles
            );

            return ResponseHandler.success(res, result, 'Gallery status updated successfully');
        }));

        // Delete gallery by ID (owner, admin, or moderator)
        app.delete('/gallery/:id', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const userRoles = req.user.roles || [];

            const result = await this.galleriesService.deleteGallery(
                req.params.id,
                userId,
                userRoles
            );

            if (!result) {
                return ResponseHandler.notFound(res, 'Gallery not found');
            }

            return ResponseHandler.success(res, null, 'Gallery deleted successfully');
        }));


        // Toggle like on gallery (authenticated)
        app.post('/gallery/:id/like', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.user.id;
            const galleryId = req.params.id;

            const likeData = {
                likeable_type: 'gallery',
                likeable_id: galleryId
            };

            const result = await this.commentsService.toggleLike(likeData, userId);
            return ResponseHandler.success(res, result, `Gallery ${result.action} successfully`);
        }));

        // Get like status for gallery (public - with optional auth)
        app.get('/gallery/:id/like-status', optionalAuthMiddleware, asyncHandler(async (req, res) => {
            const galleryId = req.params.id;
            const userId = req.user?.id || req.query.userId || null;

            const result = await this.commentsService.getLikeStatus('gallery', galleryId, userId);
            return ResponseHandler.success(res, result, 'Gallery like status retrieved successfully');
        }));

    }
}

export { GalleriesController };