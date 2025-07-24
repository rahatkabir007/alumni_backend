import { ResponseHandler } from '../utils/responseHandler.js';

/**
 * Middleware to check if user has required roles
 * @param {Array} allowedRoles - Array of roles that can access the endpoint
 * @returns {Function} - Express middleware function
 */
export const requireRoles = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return ResponseHandler.unauthorized(res, 'Authentication required');
        }

        // Get user roles from the authenticated user
        const userRoles = req.user.roles || [];

        // Check if user has any of the required roles
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            return ResponseHandler.forbidden(res, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }

        next();
    };
};

/**
 * Middleware to check admin role specifically
 */
export const requireAdmin = requireRoles(['admin']);

/**
 * Middleware to check admin or moderator roles
 */
export const requireAdminOrModerator = requireRoles(['admin', 'moderator']);

/**
 * Special middleware for role removal - prevents removing admin role unless user is admin
 * and prevents users from removing their own admin role
 */
export const requireRoleRemovalPermission = async (req, res, next) => {
    try {
        const { role } = req.body;
        const targetUserId = parseInt(req.params.id);
        const currentUser = req.user;

        // Only admin can remove admin role
        if (role === 'admin' && !currentUser.roles.includes('admin')) {
            return ResponseHandler.forbidden(res, 'Only admins can remove admin role');
        }

        // Prevent self-removal of admin role (to avoid locking out the system)
        if (role === 'admin' && currentUser.id === targetUserId) {
            return ResponseHandler.forbidden(res, 'Cannot remove your own admin role');
        }

        // Admin can remove any role, moderator can only remove non-admin roles
        if (!currentUser.roles.includes('admin') && role === 'admin') {
            return ResponseHandler.forbidden(res, 'Insufficient permissions to remove admin role');
        }

        // Moderators can remove moderator and user roles (but not admin)
        if (currentUser.roles.includes('moderator') && !currentUser.roles.includes('admin')) {
            if (role !== 'admin') {
                return next();
            }
        }

        // Admin can do anything
        if (currentUser.roles.includes('admin')) {
            return next();
        }

        return ResponseHandler.forbidden(res, 'Insufficient permissions');
    } catch (error) {
        return ResponseHandler.error(res, error, 'Permission check failed');
    }
};