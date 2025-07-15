import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";

class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    registerRoutes(app) {
        // Health check endpoint (public)
        app.get('/health', async (req, res) => {
            try {
                // Test database connection
                await this.usersService.getUserStats();
                res.json({
                    success: true,
                    message: 'API is healthy',
                    environment: process.env.NODE_ENV,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Database connection failed',
                    message: error.message
                });
            }
        });

        // User self-update endpoint (protected - users can update their own profile)
        app.put('/users/me', authMiddleware, async (req, res) => {
            try {
                const userEmail = req.user?.email;

                if (!userEmail) {
                    return res.status(401).json({
                        success: false,
                        message: 'Not authenticated'
                    });
                }

                const result = await this.usersService.updateCurrentUser(userEmail, req.body);
                res.json({
                    success: true,
                    data: result,
                    message: 'Profile updated successfully'
                });
            } catch (error) {
                console.error('Update current user error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (error.message === 'Invalid profile photo URL format') {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid profile photo URL format'
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to update profile',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Get all users with pagination, search, and filtering
        app.get('/users', requireAdmin, async (req, res) => {
            try {
                const {
                    page = 1,
                    limit = 10,
                    search = '',
                    status = 'all',
                    role = 'all',
                    sortBy = 'created_at',
                    sortOrder = 'desc'
                } = req.query;

                // Debug logging
                console.log('Users query parameters:', {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    search,
                    status,
                    role,
                    sortBy,
                    sortOrder
                });

                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    search: search?.trim() || '',
                    status,
                    role: role?.trim() || 'all',
                    sortBy,
                    sortOrder
                };

                // Validate sortBy field
                const validSortFields = ['id', 'name', 'email', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
                if (!validSortFields.includes(options.sortBy)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid sortBy field. Valid options: ${validSortFields.join(', ')}`
                    });
                }

                // Validate sortOrder
                const validSortOrders = ['asc', 'desc', 'ASC', 'DESC'];
                if (!validSortOrders.includes(options.sortOrder)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid sortOrder. Must be "asc" or "desc"'
                    });
                }

                // Validate role filter
                const validRoles = ['all', 'user', 'admin', 'moderator'];
                if (!validRoles.includes(options.role)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid role filter. Valid options: ${validRoles.join(', ')}`
                    });
                }

                const result = await this.usersService.getUsers(options);

                console.log('Users query result:', {
                    total: result.total,
                    usersCount: result.users.length,
                    currentPage: result.currentPage
                });

                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Get users error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch users',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Get user statistics
        app.get('/users/stats', requireAdmin, async (req, res) => {
            try {
                const result = await this.usersService.getUserStats();
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Get user stats error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user statistics',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Search users
        app.get('/users/search', requireAdmin, async (req, res) => {
            try {
                const { q: query, limit = 10 } = req.query;

                if (!query) {
                    return res.status(400).json({
                        success: false,
                        error: 'Search query is required'
                    });
                }

                const result = await this.usersService.searchUsers(query, parseInt(limit));
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Search users error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to search users',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Bulk update users
        app.patch('/users/bulk-update', requireAdmin, async (req, res) => {
            try {
                const { userIds, updateData } = req.body;

                if (!Array.isArray(userIds) || userIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'User IDs array is required and cannot be empty'
                    });
                }

                if (!updateData || Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Update data is required'
                    });
                }

                const result = await this.usersService.bulkUpdateUsers(userIds, updateData);
                res.json({
                    success: true,
                    data: result,
                    message: `Successfully updated ${result.affected} users`
                });
            } catch (error) {
                console.error('Bulk update users error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to bulk update users',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Bulk delete users
        app.delete('/users/bulk-delete', requireAdmin, async (req, res) => {
            try {
                const { userIds } = req.body;

                if (!Array.isArray(userIds) || userIds.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'User IDs array is required and cannot be empty'
                    });
                }

                // Prevent admin from deleting themselves
                const currentUserEmail = req.user?.email;
                if (currentUserEmail) {
                    const currentUser = await this.usersService.getUserByEmail(currentUserEmail);
                    if (currentUser && userIds.includes(currentUser.id)) {
                        return res.status(400).json({
                            success: false,
                            error: 'You cannot delete your own account'
                        });
                    }
                }

                const result = await this.usersService.bulkDeleteUsers(userIds);
                res.json({
                    success: true,
                    data: result,
                    message: `Successfully deleted ${result.affected} users`
                });
            } catch (error) {
                console.error('Bulk delete users error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to bulk delete users',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.get('/users/:id', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.id);

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                const result = await this.usersService.getUserById(userId);
                if (!result) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Get user by ID error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Update user by ID
        app.put('/users/:id', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.id);

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                const result = await this.usersService.updateUser(userId, req.body);
                res.json({
                    success: true,
                    data: result,
                    message: 'User updated successfully'
                });
            } catch (error) {
                console.error('Update user error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to update user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Admin-only: Delete user by ID
        app.delete('/users/:id', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.id);

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                // Prevent admin from deleting themselves
                const currentUserEmail = req.user?.email;
                if (currentUserEmail) {
                    const currentUser = await this.usersService.getUserByEmail(currentUserEmail);

                    if (currentUser && currentUser.id === userId) {
                        return res.status(400).json({
                            success: false,
                            error: 'You cannot delete your own account'
                        });
                    }
                }

                const result = await this.usersService.deleteUser(userId);
                if (!result) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                res.json({
                    success: true,
                    message: 'User deleted successfully'
                });
            } catch (error) {
                console.error('Delete user error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });
    }
}

export { UsersController };