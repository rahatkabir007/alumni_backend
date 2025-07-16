import passport from 'passport';
import { generateToken } from '../../utils/jwtSign.js';
import { AuthService } from './auth.service.js';
import { requireAdmin, roleMiddleware } from '../../middlewares/role.middleware.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    registerRoutes(app) {
        // Email/Password Authentication Routes
        app.post('/auth/register', async (req, res) => {
            try {
                const result = await this.authService.registerUser(req.body);
                res.status(201).json({ success: true, data: result });
            } catch (error) {
                console.error('Register error:', error);
                res.status(400).json({
                    success: false,
                    error: 'Registration failed',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Registration failed'
                });
            }
        });

        app.post('/auth/login', async (req, res) => {
            try {
                const result = await this.authService.loginUser(req.body);
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Login error:', error);
                res.status(401).json({
                    success: false,
                    error: 'Login failed',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Invalid credentials'
                });
            }
        });

        // Google OAuth routes
        app.get('/auth/google',
            passport.authenticate('google', { scope: ['profile', 'email'] })
        );

        app.get('/auth/google/callback',
            passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
            (req, res) => {
                try {
                    // Generate JWT token
                    const token = generateToken(req.user.email);

                    // Redirect to frontend with token and minimal user data
                    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                        id: req.user.id
                    }))}`);
                } catch (error) {
                    console.error('Google callback error:', error);
                    res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
                }
            }
        );


        // Auth status endpoint
        app.get('/auth/status', async (req, res) => {
            try {
                if (req.user) {
                    res.json({
                        success: true,
                        user: {
                            id: req.user.id
                        }
                    });
                } else {
                    res.status(401).json({ success: false, message: 'Not authenticated' });
                }
            } catch (error) {
                console.error('Auth status error:', error);
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        });

        // Get current user profile (protected route)
        app.get('/auth/me', async (req, res) => {
            try {
                // Extract email from JWT token
                const userEmail = req.user?.email;

                if (!userEmail) {
                    return res.status(401).json({ success: false, message: 'Not authenticated' });
                }

                const user = await this.authService.getUserByEmail(userEmail);

                if (!user) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                res.json({ success: true, data: user });
            } catch (error) {
                console.error('Get current user error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user profile',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Role management routes (Admin only)
        app.put('/auth/users/:userId/roles', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const { roles } = req.body;
                const currentUserEmail = req.user?.email;

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                if (!Array.isArray(roles) || roles.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Roles must be a non-empty array'
                    });
                }

                const validRoles = ['user', 'moderator', 'admin'];
                const invalidRoles = roles.filter(role => !validRoles.includes(role));

                if (invalidRoles.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles: ${validRoles.join(', ')}`
                    });
                }

                const updatedUser = await this.authService.updateUserRoles(userId, roles, currentUserEmail);
                res.json({
                    success: true,
                    data: updatedUser,
                    message: 'User roles updated successfully'
                });
            } catch (error) {
                console.error('Update user roles error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (error.message === 'Admins cannot modify other admin accounts' ||
                    error.message === 'Maximum number of admins (2) has been reached' ||
                    error.message.includes('At least one admin must remain')) {
                    return res.status(403).json({
                        success: false,
                        error: error.message
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to update user roles',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.post('/auth/users/:userId/roles/:role', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const { role } = req.params;
                const currentUserEmail = req.user?.email;

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                const validRoles = ['user', 'moderator', 'admin'];
                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`
                    });
                }

                const updatedUser = await this.authService.addRoleToUser(userId, role, currentUserEmail);
                res.json({
                    success: true,
                    data: updatedUser,
                    message: `Role '${role}' added to user successfully`
                });
            } catch (error) {
                console.error('Add role to user error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (error.message === 'Admins cannot modify other admin accounts' ||
                    error.message === 'Maximum number of admins (2) has been reached') {
                    return res.status(403).json({
                        success: false,
                        error: error.message
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to add role to user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.delete('/auth/users/:userId/roles/:role', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const { role } = req.params;
                const currentUserEmail = req.user?.email;

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                const updatedUser = await this.authService.removeRoleFromUser(userId, role, currentUserEmail);
                res.json({
                    success: true,
                    data: updatedUser,
                    message: `Role '${role}' removed from user successfully`
                });
            } catch (error) {
                console.error('Remove role from user error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (error.message === 'Admins cannot modify other admin accounts' ||
                    error.message.includes('At least one admin must remain')) {
                    return res.status(403).json({
                        success: false,
                        error: error.message
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to remove role from user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Add endpoint for changing user role (matches frontend API call)
        app.patch('/users/:userId/role', requireAdmin, async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const { roles } = req.body;
                const currentUserEmail = req.user?.email;

                if (isNaN(userId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid user ID'
                    });
                }

                if (!Array.isArray(roles) || roles.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Roles must be a non-empty array'
                    });
                }

                const validRoles = ['user', 'moderator', 'admin'];
                const invalidRoles = roles.filter(role => !validRoles.includes(role));

                if (invalidRoles.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles: ${validRoles.join(', ')}`
                    });
                }

                const updatedUser = await this.authService.updateUserRoles(userId, roles, currentUserEmail);
                res.json({
                    success: true,
                    data: updatedUser,
                    message: 'User role changed successfully'
                });
            } catch (error) {
                console.error('Change user role error:', error);

                if (error.message === 'User not found') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }

                if (error.message === 'Admins cannot modify other admin accounts' ||
                    error.message === 'Maximum number of admins (2) has been reached' ||
                    error.message.includes('At least one admin must remain')) {
                    return res.status(403).json({
                        success: false,
                        error: error.message
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Failed to change user role',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Logout endpoint
        app.post('/auth/logout', (req, res) => {
            // For JWT-based auth, logout is primarily handled client-side
            res.json({
                success: true,
                message: 'Logged out successfully. Token should be removed from client storage.',
                timestamp: new Date().toISOString()
            });
        });
    }
}

export { AuthController };