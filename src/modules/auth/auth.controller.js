import passport from 'passport';
import { AuthService } from './auth.service.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { tokenBlacklist } from '../../utils/tokenBlacklist.js';
import { ResponseHandler } from '../../utils/responseHandler.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateToken } from '../../utils/jwtSign.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    registerRoutes(app) {
        // Email/Password Authentication Routes
        app.post('/auth/register', asyncHandler(async (req, res) => {
            const result = await this.authService.registerUser(req.body);

            // Check if this was a password addition for existing OAuth user
            const message = result.message || 'User registered successfully';

            return ResponseHandler.created(res, result, message);
        }));

        app.post('/auth/login', asyncHandler(async (req, res) => {
            const { email, password } = req.body;

            if (!email || !password) {
                return ResponseHandler.error(res,
                    new Error('Email and password are required'),
                    'Email and password are required'
                );
            }

            const user = await this.authService.loginUser(email, password);
            return ResponseHandler.success(res, user, 'Login successful');
        }));

        app.get('/auth/google',
            passport.authenticate('google', { scope: ['profile', 'email', 'phone'] })
        );

        app.get('/auth/google/callback',
            passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
            asyncHandler(async (req, res) => {
                try {
                    const user = req.user;
                    if (!user) {
                        return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
                    }

                    const token = generateToken({
                        email: user.email,
                        id: user.id,
                        roles: user.roles || ['user'], // Include roles in JWT token
                        isProfileCompleted: user.isProfileCompleted || false,
                    });

                    console.log('Google login successful:', token);

                    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
                        id: req.user.id,
                        email: req.user.email,
                        name: req.user.name,
                        provider: req.user.provider,
                        roles: req.user.roles || ['user'],
                        isProfileCompleted: user.isProfileCompleted || false
                    }))}`);

                } catch (error) {
                    console.error('Google callback error:', error);
                    res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
                }
            })
        );

        app.post('/auth/logout', authMiddleware, asyncHandler(async (req, res) => {
            const token = req.token;

            if (token) {
                tokenBlacklist.addToken(token);
                console.log('Token blacklisted successfully');
            }

            return ResponseHandler.success(res, null, 'Logged out successfully');
        }));

        app.get('/auth/me', authMiddleware, asyncHandler(async (req, res) => {
            const user = req.user;

            if (!user) {
                return ResponseHandler.unauthorized(res, 'User not authenticated');
            }

            const userData = await this.authService.getAuthenticatedUserData(user);
            return ResponseHandler.success(res, userData, 'User data retrieved successfully');
        }));

        app.post('/auth/complete-profile', authMiddleware, asyncHandler(async (req, res) => {
            const userId = req.body.userId;
            const profileData = req.body;

            if (!profileData || Object.keys(profileData).length === 0) {
                return ResponseHandler.error(res, new Error('Profile data is required'), 'Profile data is required');
            }


            const updatedUser = await this.authService.completeUserProfile(userId, profileData);
            const token = generateToken({
                email: updatedUser.email,
                id: updatedUser.id,
                roles: updatedUser.roles || ['user'],
                isProfileCompleted: true,
            });
            return ResponseHandler.success(res, { user: updatedUser, token }, 'Profile completed successfully');
        }));
    }
}

export { AuthController };