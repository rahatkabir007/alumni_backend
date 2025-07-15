import jwt from 'jsonwebtoken';
import { AuthService } from '../modules/auth/auth.service.js';

/**
 * Middleware to check if user has required roles
 * @param {string|string[]} requiredRoles - Single role or array of roles
 * @returns {Function} Express middleware function
 */
export const roleMiddleware = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated first
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Access token required'
                });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user with roles
            const authService = new AuthService();
            const user = await authService.getUserByEmail(decoded.email);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Check roles
            const userRoles = user.roles || ['user'];
            const requiredRolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

            const hasRequiredRole = requiredRolesArray.some(role => userRoles.includes(role));

            if (!hasRequiredRole) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    message: `Required roles: ${requiredRolesArray.join(', ')}. User roles: ${userRoles.join(', ')}`
                });
            }

            // Add user info to request
            req.user = { ...decoded, roles: userRoles, fullUser: user };
            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
    };
};

/**
 * Predefined role middlewares for common use cases
 */
export const requireAdmin = roleMiddleware(['admin']);
export const requireModerator = roleMiddleware(['admin', 'moderator']);
export const requireUser = roleMiddleware(['user', 'admin', 'moderator']);