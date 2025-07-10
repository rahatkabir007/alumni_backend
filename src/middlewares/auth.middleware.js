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
    '/auth/status'
];

export const authMiddleware = (req, res, next) => {
    // Skip authentication for public routes
    if (publicRoutes.some(route => req.path.startsWith(route)) || req.path === '/') {
        return next();
    }

    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};