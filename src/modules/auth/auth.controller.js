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
        // Email/Password Authentication Routes (JWT-based, no sessions)
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

        // OAuth routes (session-based for flow completion, then JWT)
        // Note: Sessions are only used temporarily during OAuth flow
        // Final authentication uses JWT tokens
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            app.get('/auth/google',
                passport.authenticate('google', { scope: ['profile', 'email'] })
            );

            app.get('/auth/google/callback',
                passport.authenticate('google', {
                    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
                }),
                (req, res) => {
                    try {
                        // Generate JWT token (replaces session-based auth)
                        const token = generateToken(req.user.email);

                        // // Clear OAuth session after successful authentication
                        // req.session.destroy((err) => {
                        //     if (err) console.log('Session cleanup error:', err);
                        // });

                        // Redirect to frontend with JWT token
                        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                            id: req.user.id,
                            email: req.user.email,
                        }))}`);
                    } catch (error) {
                        console.error('Google callback error:', error);
                        res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
                    }
                }
            );
        } else {
            // Fallback routes when Google OAuth is not configured
            app.get('/auth/google', (req, res) => {
                res.status(501).json({
                    success: false,
                    error: 'Google OAuth not configured',
                    message: 'Google OAuth is not available on this server'
                });
            });

            app.get('/auth/google/callback', (req, res) => {
                res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_not_configured`);
            });
        }

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

        // Get current user profile (protected route) - Apply auth middleware
        app.get('/auth/me', authMiddleware, async (req, res) => {
            try {
                console.log('Auth/me request user:', req.user);

                // Extract email from JWT token
                const userEmail = req.user?.email;

                if (!userEmail) {
                    return res.status(401).json({ success: false, message: 'Not authenticated' });
                }

                const user = await this.authService.getUserByEmail(userEmail);
                console.log("🚀 ~ AuthController ~ app.get ~ user:", user);

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


        // Logout endpoint
        app.post('/auth/logout', (req, res) => {
            // For JWT-based auth, logout is primarily handled client-side
            res.json({
                success: true,
                message: 'Logged out successfully. Token should be removed from client storage.',
                timestamp: new Date().toISOString()
            });
        });

        // Test JWT token endpoint (development only)
        if (process.env.NODE_ENV === 'development') {
            app.post('/auth/test-token', async (req, res) => {
                try {
                    const { email } = req.body;

                    if (!email) {
                        return res.status(400).json({
                            success: false,
                            error: 'Email required'
                        });
                    }

                    const token = generateToken(email);

                    // Immediately verify the token
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);

                    res.json({
                        success: true,
                        data: {
                            token,
                            decoded,
                            secret_info: {
                                length: process.env.JWT_SECRET?.length,
                                preview: process.env.JWT_SECRET?.substring(0, 10) + '...'
                            }
                        }
                    });
                } catch (error) {
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            });
        }
    }
}

export { AuthController };