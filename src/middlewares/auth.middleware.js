import jwt from 'jsonwebtoken';

const publicRoutes = [
    '/',
    '/register',
    '/login',
    '/health',
    '/auth/google',
    '/auth/google/callback',
    '/auth/facebook',
    '/auth/facebook/callback',
    '/auth/status',
    // Add API prefixed routes
    '/api/auth/register',
    '/api/auth/login',
    '/api/health',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/facebook',
    '/api/auth/facebook/callback',
    '/api/auth/status'
];

export const authMiddleware = (req, res, next) => {

};