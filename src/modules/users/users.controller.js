import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAdmin, requireAdminOrModerator, requireRoleRemovalPermission } from "../../middlewares/role.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    registerRoutes(app) {
        // Health check endpoint (public)
        app.get('/health', asyncHandler(async (req, res) => {
            // Test database connection
            await this.usersService.getUsers();
            const healthData = {
                success: true,
                message: 'API is healthy',
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            };
            return ResponseHandler.success(res, healthData, 'Health check passed');
        }));

        // Enhanced users endpoint with pagination, sorting, and search
        app.get('/users', asyncHandler(async (req, res) => {
            const result = await this.usersService.getUsers(req.query);
            return ResponseHandler.success(res, result, 'Users retrieved successfully');
        }));

        app.get('/users/verified', asyncHandler(async (req, res) => {
            const result = await this.usersService.getUsers(req.query, { verified: true });
            return ResponseHandler.success(res, result, 'Users retrieved successfully');
        }));


        // Get user by ID with optional profile details
        app.get('/users/:id', asyncHandler(async (req, res) => {
            const includeDetails = req.query.includeDetails === 'true';
            const result = await this.usersService.getUserById(req.params.id, includeDetails);

            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }

            return ResponseHandler.success(res, result, 'User retrieved successfully');
        }));

        // Get current user's complete profile (for authenticated user)
        app.get('/users/me/profile', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.getUserById(req.user.id, true);

            if (!result) {
                return ResponseHandler.notFound(res, 'User profile not found');
            }

            return ResponseHandler.success(res, result, 'User profile retrieved successfully');
        }));

        // Update basic user profile (works for all alumni types)
        app.patch('/users/:id', authMiddleware, asyncHandler(async (req, res) => {
            const targetUserId = parseInt(req.params.id);
            const currentUser = req.user;

            // Check if user can update this profile
            const canUpdate = currentUser.id === targetUserId ||
                currentUser.roles.includes('admin') ||
                currentUser.roles.includes('moderator');

            if (!canUpdate) {
                return ResponseHandler.forbidden(res, 'You can only update your own profile');
            }

            const result = await this.usersService.updateUser(req.params.id, req.body);
            return ResponseHandler.success(res, result, 'User updated successfully');
        }));

        // Update user's additional information (replaces all profile-specific endpoints)
        app.patch('/users/:id/additional-info', authMiddleware, asyncHandler(async (req, res) => {
            const targetUserId = parseInt(req.params.id);
            const currentUser = req.user;

            const canUpdate = currentUser.id === targetUserId ||
                currentUser.roles.includes('admin') ||
                currentUser.roles.includes('moderator');

            if (!canUpdate) {
                return ResponseHandler.forbidden(res, 'You can only update your own profile');
            }

            const result = await this.usersService.updateAdditionalInformation(req.params.id, req.body);
            return ResponseHandler.success(res, result, 'Additional information updated successfully');
        }));

        // Convenience endpoint for current user
        app.patch('/users/me/additional-info', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.updateAdditionalInformation(req.user.id, req.body);
            return ResponseHandler.success(res, result, 'Your additional information updated successfully');
        }));

        // Update status - Only admin and moderator
        app.patch('/users/:id/status', authMiddleware, requireAdminOrModerator, asyncHandler(async (req, res) => {
            const { status } = req.body;
            if (!status) {
                return ResponseHandler.error(res, new Error('Status is required'), 'Status is required');
            }
            const result = await this.usersService.updateStatus(req.params.id, status);
            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }
            return ResponseHandler.success(res, result, 'User status updated successfully');
        }));

        // Add role - Only admin and moderator can assign roles
        app.patch('/users/:id/role', authMiddleware, requireAdminOrModerator, asyncHandler(async (req, res) => {
            const { role } = req.body;
            if (!role) {
                return ResponseHandler.error(res, new Error('Role is required'), 'Role is required');
            }

            // Only admin can assign admin role
            if (role === 'admin' && !req.user.roles.includes('admin')) {
                return ResponseHandler.forbidden(res, 'Only admins can assign admin role');
            }

            const result = await this.usersService.updateRole(req.params.id, role);
            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }
            return ResponseHandler.success(res, result, 'User role updated successfully');
        }));

        // Remove role - Special permission checking
        app.patch('/users/:id/role/remove', authMiddleware, requireRoleRemovalPermission, asyncHandler(async (req, res) => {
            const { role } = req.body;
            if (!role) {
                return ResponseHandler.error(res, new Error('Role is required'), 'Role is required');
            }
            const result = await this.usersService.removeRole(req.params.id, role);
            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }
            return ResponseHandler.success(res, result, 'User role removed successfully');
        }));

        // Delete user - Only admin
        app.delete('/users/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
            const targetUserId = parseInt(req.params.id);
            const currentUser = req.user;

            // Prevent admin from deleting themselves (to avoid system lockout)
            if (currentUser.id === targetUserId) {
                return ResponseHandler.forbidden(res, 'Cannot delete your own account');
            }

            const result = await this.usersService.deleteUser(req.params.id);

            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }

            return ResponseHandler.success(res, null, 'User deleted successfully');
        }));
    }
}

export { UsersController };