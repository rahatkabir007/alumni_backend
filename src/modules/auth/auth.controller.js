import passport from 'passport';
import { generateToken } from '../../utils/jwtSign.js';
import { AuthService } from './auth.service.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    registerRoutes(app) {
        // Email/Password Authentication Routes
        app.post('/register', async (req, res) => {
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

        app.post('/login', async (req, res) => {
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
                        provider: req.user.provider
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
                        provider: req.user.provider
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
                            provider: req.user.provider
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

        // Logout endpoint
        app.post('/auth/logout', (req, res) => {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Logout failed' });
                }
                res.json({ success: true, message: 'Logged out successfully' });
            });
        });
    }
}

export { AuthController };