import passport from 'passport';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../utils/jwtSign.js';
import { AuthService } from './auth.service.js';
import { requireAdmin, roleMiddleware } from '../../middlewares/role.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

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

                    // Redirect to frontend with token
                    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                        id: req.user.id,
                        email: req.user.email,
                        name: req.user.name,
                        provider: req.user.provider,
                        roles: req.user.roles || ['user']
                    }))}`);
                } catch (error) {
                    console.error('Google callback error:', error);
                    res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
                }
            }
        );

        // Facebook OAuth routes
        app.get('/auth/facebook',
            passport.authenticate('facebook', { scope: ['email'] })
        );

        app.get('/auth/facebook/callback',
            passport.authenticate('facebook', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_auth_failed` }),
            (req, res) => {
                try {
                    // Generate JWT token
                    const token = generateToken(req.user.email);

                    // Redirect to frontend with token
                    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                        id: req.user.id,
                        email: req.user.email,
                        name: req.user.name,
                        provider: req.user.provider,
                        roles: req.user.roles || ['user']
                    }))}`);
                } catch (error) {
                    console.error('Facebook callback error:', error);
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
                            id: req.user.id,
                            email: req.user.email,
                            name: req.user.name,
                            provider: req.user.provider,
                            roles: req.user.roles || ['user']
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

        // Get current user profile (protected route) - Apply auth middleware
        app.get('/auth/me', authMiddleware, async (req, res) => {
            try {
                console.log('Auth/me request headers:', {
                    authorization: req.headers.authorization?.substring(0, 20) + '...',
                    'user-agent': req.headers['user-agent']
                });
                console.log('Auth/me decoded user from JWT:', req.user);

                // Extract email from JWT token
                const userEmail = req.user?.email;

                if (!userEmail) {
                    return res.status(401).json({ success: false, message: 'Not authenticated - no email in token' });
                }

                console.log('Looking up user by email:', userEmail);
                const user = await this.authService.getUserByEmail(userEmail);
                console.log("🚀 ~ AuthController ~ Found user:", user ? { id: user.id, email: user.email, name: user.name } : 'null');

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

        // Get user by email endpoint (Admin only)
        app.get('/auth/user/:email', requireAdmin, async (req, res) => {
            try {
                const { email } = req.params;

                if (!email || !email.includes('@')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Valid email address is required'
                    });
                }

                const user = await this.authService.getUserByEmail(email);

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found with this email'
                    });
                }

                res.json({
                    success: true,
                    data: user
                });
            } catch (error) {
                console.error('Get user by email error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user by email',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        // Role management routes (Admin only)
        app.put('/auth/users/:userId/roles', requireAdmin, async (req, res) => {
            try {
                const { userId } = req.params;
                const { roles } = req.body;

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

                const updatedUser = await this.authService.updateUserRoles(parseInt(userId), roles);
                res.json({ success: true, data: updatedUser });
            } catch (error) {
                console.error('Update user roles error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update user roles',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.post('/auth/users/:userId/roles/:role', requireAdmin, async (req, res) => {
            try {
                const { userId, role } = req.params;

                const validRoles = ['user', 'moderator', 'admin'];
                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`
                    });
                }

                const updatedUser = await this.authService.addRoleToUser(parseInt(userId), role);
                res.json({ success: true, data: updatedUser });
            } catch (error) {
                console.error('Add role to user error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to add role to user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

        app.delete('/auth/users/:userId/roles/:role', requireAdmin, async (req, res) => {
            try {
                const { userId, role } = req.params;

                const updatedUser = await this.authService.removeRoleFromUser(parseInt(userId), role);
                res.json({ success: true, data: updatedUser });
            } catch (error) {
                console.error('Remove role from user error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to remove role from user',
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