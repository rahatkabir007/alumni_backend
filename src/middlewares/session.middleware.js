import session from 'express-session';

/**
 * Conditional session middleware that only applies to OAuth routes
 * This prevents the MemoryStore warning for routes that don't need sessions
 */
const sessionConfig = {
    secret: process.env.JWT_SECRET || 'oauth-session-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10 * 60 * 1000, // 10 minutes for OAuth flow
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    name: 'oauth.sid'
};

const sessionMiddleware = session(sessionConfig);

/**
 * Apply session middleware only to OAuth routes
 */
export const conditionalSession = (req, res, next) => {
    // Check if this is an OAuth route that needs session
    const needsSession = req.path.includes('/auth/google') ||
        req.path.includes('/auth/facebook') ||
        req.path.includes('/oauth/');

    if (needsSession) {
        return sessionMiddleware(req, res, next);
    }

    // Skip session for API routes using JWT
    next();
};

export { sessionMiddleware };
