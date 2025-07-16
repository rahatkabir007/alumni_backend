import jwt from 'jsonwebtoken';

/**
 * Authentication helper functions
 */

/**
 * Extract user info from JWT token
 * @param {Object} req - Express request object
 * @returns {Object} - User information from token
 * @throws {Error} - If token is invalid or user not found
 */
export const getUserInfoFromToken = async (req, usersService) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Access token required');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await usersService.getUserByEmail(decoded.email);
    if (!user) {
        throw new Error('User not found');
    }

    return {
        userId: user.id,
        email: user.email,
        roles: user.roles || ['user']
    };
};

/**
 * Validate user ID parameter
 * @param {string} paramId - The ID parameter from request
 * @returns {number} - Parsed user ID
 * @throws {Error} - If ID is invalid
 */
export const validateUserId = (paramId) => {
    const userId = parseInt(paramId);
    if (isNaN(userId)) {
        throw new Error('Invalid user ID');
    }
    return userId;
};

/**
 * Check if user can access resource
 * @param {number} requestedUserId - ID of user being accessed
 * @param {number} currentUserId - ID of current authenticated user
 * @param {string[]} userRoles - Roles of current user
 * @returns {boolean} - True if access is allowed
 */
export const canAccessUser = (requestedUserId, currentUserId, userRoles) => {
    const isOwnProfile = currentUserId === requestedUserId;
    const isAdmin = userRoles.includes('admin');
    return isOwnProfile || isAdmin;
};
