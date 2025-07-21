import passport from 'passport';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../utils/jwtSign.js';
import { AuthService } from './auth.service.js';
import { requireAdmin, roleMiddleware } from '../../middlewares/role.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { tokenBlacklist } from '../../utils/tokenBlacklist.js';
import { ResponseHandler } from '../../utils/responseHandler.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    registerRoutes(app) {
        // Email/Password Authentication Routes
        app.post('/auth/register', asyncHandler(async (req, res) => {
            const result = await this.authService.registerUser(req.body);
            return ResponseHandler.created(res, result, 'User registered successfully');
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

        app.post('/auth/login/google',
            passport.authenticate('google-token', { session: false }),
            asyncHandler(async (req, res) => {
                if (!req.user) {
                    return ResponseHandler.unauthorized(res, 'Google authentication failed');
                }

                const user = await this.authService.loginWithGoogle(req.user);
                return ResponseHandler.success(res, user, 'Google login successful');
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
    }
}

export { AuthController };