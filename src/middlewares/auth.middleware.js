import jwt from 'jsonwebtoken';

const publicRoutes = [
    '/auth/register',
    '/auth/login',
    '/health',
    '/auth/google',
    '/auth/google/callback',
    '/auth/status'
];

export const authMiddleware = (req, res, next) => {
    if (publicRoutes.some(route => req.path.startsWith(route)) || req.path === '/') {
        console.log('Public route, skipping auth');
        return next();
    }

    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        console.log('OPTIONS request, skipping auth');
        return next();
    }

    const authHeader = req.headers.authorization;
    console.log('Auth header present:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No valid Bearer token found');
        return res.status(401).json({
            success: false,
            error: 'Access token required'
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('JWT decoded successfully:', decoded.email);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};