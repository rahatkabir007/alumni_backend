import { authMiddleware } from "../../middlewares/auth.middleware.js";

class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    registerRoutes(app) {
        // Health check endpoint (public)
        app.get('/health', async (req, res) => {
            try {
                // Test database connection
                await this.usersService.getUsers();
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

        // Protected routes (auth required)
        app.get('/users', authMiddleware, async (req, res) => {
            try {
                const result = await this.usersService.getUsers();
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

        app.get('/users/:id', authMiddleware, async (req, res) => {
            try {
                const result = await this.usersService.getUserById(req.params.id);
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

        app.put('/users/:id', authMiddleware, async (req, res) => {
            try {
                const result = await this.usersService.updateUser(req.params.id, req.body);
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Update user error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.delete('/users/:id', authMiddleware, async (req, res) => {
            try {
                const result = await this.usersService.deleteUser(req.params.id);
                if (!result) {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                res.json({ success: true, message: 'User deleted successfully' });
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