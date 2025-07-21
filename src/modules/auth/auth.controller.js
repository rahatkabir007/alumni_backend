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
                res.status(400).json({
                    success: false,
                    error: 'Registration failed',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Registration failed'
                });
            }
        });

        app.post('/auth/login', authMiddleware, async (req, res) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return res.status(400).json({
                        success: false,
                        error: 'Email and password are required'
                    });
                }
                const user = await this.authService.loginUser(email, password);
                res.status(200).json({ success: true, data: user });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: 'Login failed',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
                });
            }
        })



        app.get('/auth/me', authMiddleware, async (req, res) => {
            try {
                const user = req.user;
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        error: 'User not authenticated'
                    });
                }
                const userData = await this.authService.getAuthenticatedUserData(user);
                res.status(200).json({ success: true, data: userData });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch user',
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
                });
            }
        });

    }
}

export { AuthController };