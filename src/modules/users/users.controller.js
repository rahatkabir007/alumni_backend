import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireAdmin, roleMiddleware } from "../../middlewares/role.middleware.js";
import { getUserInfoFromToken, validateUserId, canAccessUser } from "../../helpers/auth.helper.js";

class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    registerRoutes(app) {
        // Health check endpoint (public)
        app.get('/health', async (req, res) => {
            try {
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

        // Get users with advanced filtering, search, pagination, and stats
        // Supports: ?search=john&role=admin&stats=true&page=1&limit=10&sortBy=created_at&sortOrder=desc
        app.get('/users', requireAdmin, async (req, res) => {
            try {
                const {
                    page = 1,
                    limit = 10,
                    search = '',
                    role = 'all',
                    sortBy = 'created_at',
                    sortOrder = 'desc',
                    stats = 'false' // Include stats in response
                } = req.query;

                const options = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    search: search?.trim() || '',
                    role: role?.trim() || 'all',
                    sortBy,
                    sortOrder,
                    includeStats: stats === 'true'
                };

                // Validate parameters
                const validSortFields = ['id', 'name', 'email', 'created_at', 'updated_at'];
                if (!validSortFields.includes(options.sortBy)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid sortBy field. Valid options: ${validSortFields.join(', ')}`
                    });
                }

                const validSortOrders = ['asc', 'desc'];
                if (!validSortOrders.includes(options.sortOrder.toLowerCase())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid sortOrder. Must be "asc" or "desc"'
                    });
                }

                const validRoles = ['all', 'user', 'admin', 'moderator'];
                if (!validRoles.includes(options.role)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid role filter. Valid options: ${validRoles.join(', ')}`
                    });
                }

                const result = await this.usersService.getUsers(options);
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

        // Get or update specific user by ID (supports both GET and PUT)
        // GET /users/123 - get user by ID
        // PUT /users/123 - update user by ID
        // Special case: /users/me resolves to current user's ID
        // app.route('/users/:id')
        //     .get(this.handleUserAccess.bind(this), async (req, res) => {
        //         try {
        //             const userId = req.resolvedUserId;
        //             const result = await this.usersService.getUserById(userId);

        //             if (!result) {
        //                 return res.status(404).json({
        //                     success: false,
        //                     error: 'User not found'
        //                 });
        //             }
        //             res.json({ success: true, data: result });
        //         } catch (error) {
        //             console.error('Get user by ID error:', error);
        //             res.status(500).json({
        //                 success: false,
        //                 error: 'Failed to fetch user',
        //                 message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        //             });
        //         }
        //     })
        //     .put(this.handleUserAccess.bind(this), async (req, res) => {
        //         try {
        //             const userId = req.resolvedUserId;
        //             const isCurrentUser = req.isCurrentUser;

        //             // If updating own profile, use updateCurrentUser (limited fields)
        //             // If admin updating any user, use updateUser (all fields)
        //             const result = isCurrentUser
        //                 ? await this.usersService.updateCurrentUser(req.user.email, req.body)
        //                 : await this.usersService.updateUser(userId, req.body);

        //             res.json({
        //                 success: true,
        //                 data: result,
        //                 message: 'User updated successfully'
        //             });
        //         } catch (error) {
        //             console.error('Update user error:', error);

        //             if (error.message === 'User not found') {
        //                 return res.status(404).json({
        //                     success: false,
        //                     error: 'User not found'
        //                 });
        //             }

        //             if (error.message === 'Invalid profile photo URL format') {
        //                 return res.status(400).json({
        //                     success: false,
        //                     error: 'Invalid profile photo URL format'
        //                 });
        //             }

        //             res.status(500).json({
        //                 success: false,
        //                 error: 'Failed to update user',
        //                 message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        //             });
        //         }
        //     })
        //     .delete(requireAdmin, async (req, res) => {
        //         try {
        //             const userId = req.params.id === 'me'
        //                 ? (await this.getUserIdFromToken(req)).userId
        //                 : parseInt(req.params.id);

        //             if (isNaN(userId)) {
        //                 return res.status(400).json({
        //                     success: false,
        //                     error: 'Invalid user ID'
        //                 });
        //             }

        //             // Prevent admin from deleting themselves
        //             const currentUser = await this.getUserIdFromToken(req);
        //             if (currentUser.userId === userId) {
        //                 return res.status(400).json({
        //                     success: false,
        //                     error: 'You cannot delete your own account'
        //                 });
        //             }

        //             const result = await this.usersService.deleteUser(userId);
        //             if (!result) {
        //                 return res.status(404).json({
        //                     success: false,
        //                     error: 'User not found'
        //                 });
        //             }

        //             res.json({
        //                 success: true,
        //                 message: 'User deleted successfully'
        //             });
        //         } catch (error) {
        //             console.error('Delete user error:', error);
        //             res.status(500).json({
        //                 success: false,
        //                 error: 'Failed to delete user',
        //                 message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        //             });
        //         }
        //     });

        // Bulk operations for users (admin only)
        app.route('/users/bulk')
            .patch(requireAdmin, async (req, res) => {
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
            })
            .delete(requireAdmin, async (req, res) => {
                try {
                    const { userIds } = req.body;

                    if (!Array.isArray(userIds) || userIds.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'User IDs array is required and cannot be empty'
                        });
                    }

                    // Prevent admin from deleting themselves
                    const currentUser = await this.getUserIdFromToken(req);
                    if (userIds.includes(currentUser.userId)) {
                        return res.status(400).json({
                            success: false,
                            error: 'You cannot delete your own account'
                        });
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

        // Get user by email endpoint (protected route)
        app.get('/users/:email', authMiddleware, async (req, res) => {
            try {
                const { email } = req.params;
                const currentUserEmail = req.user?.email;

                if (!email || !email.includes('@')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Valid email address is required'
                    });
                }

                console.log(email,)

                // Get current user info to check permissions
                const currentUser = await this.usersService.getUserByEmail(email);
                if (!currentUser) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication failed'
                    });
                }

                // Check if user is accessing their own profile or is admin
                const isOwnProfile = currentUserEmail === email;
                const isAdmin = currentUser.roles?.includes('admin');

                if (!isOwnProfile && !isAdmin) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied. You can only access your own profile or need admin privileges.'
                    });
                }

                const user = await this.usersService.getUserByEmail(email);

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                res.json({ success: true, data: user });
            } catch (error) {
                console.error('Get user by email error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Update user by email endpoint
        app.put('/users/:email', authMiddleware, async (req, res) => {
            try {
                const { email } = req.params;
                const currentUserEmail = req.user?.email;

                if (!email || !email.includes('@')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Valid email address is required'
                    });
                }

                // Get current user info to check permissions
                const currentUser = await this.usersService.getUserByEmail(currentUserEmail);
                if (!currentUser) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication failed'
                    });
                }

                // Check if user is updating their own profile or is admin
                const isOwnProfile = currentUserEmail === email;
                const isAdmin = currentUser.roles?.includes('admin');

                if (!isOwnProfile && !isAdmin) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied. You can only update your own profile or need admin privileges.'
                    });
                }

                // If updating own profile, use updateCurrentUser (limited fields)
                // If admin updating any user, use updateUser (all fields)
                const result = isOwnProfile
                    ? await this.usersService.updateCurrentUser(email, req.body)
                    : await this.usersService.updateUserByEmail(email, req.body);

                res.json({
                    success: true,
                    data: result,
                    message: 'User updated successfully'
                });
            } catch (error) {
                console.error('Update user by email error:', error);

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
    }

    // Middleware to handle user access control and resolve "me" to actual user ID
    async handleUserAccess(req, res, next) {
        try {
            const paramId = req.params.id;

            // Handle "me" special case
            if (paramId === 'me') {
                const userInfo = await getUserInfoFromToken(req, this.usersService);
                req.resolvedUserId = userInfo.userId;
                req.isCurrentUser = true;
                return next();
            }

            // Handle numeric ID
            const userId = validateUserId(paramId);

            // Check if user is accessing their own profile or is admin
            const currentUser = await getUserInfoFromToken(req, this.usersService);
            const isCurrentUser = currentUser.userId === userId;
            const hasAccess = canAccessUser(userId, currentUser.userId, currentUser.roles);

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. You can only access your own profile or need admin privileges.'
                });
            }

            req.resolvedUserId = userId;
            req.isCurrentUser = isCurrentUser;
            next();
        } catch (error) {
            console.error('Handle user access error:', error);
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
    }

    // Helper method to extract user info from JWT token
    async getUserIdFromToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Access token required');
        }

        const token = authHeader.substring(7);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

        const user = await this.usersService.getUserByEmail(decoded.email);
        if (!user) {
            throw new Error('User not found');
        }

        return {
            userId: user.id,
            email: user.email,
            roles: user.roles || ['user']
        };
    }
}

export { UsersController };