import session from 'express-session';

/**
 * Session configuration for OAuth flows
 * Only used for OAuth authentication, not for general API authentication
 */
export const createSessionConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        secret: process.env.JWT_SECRET || 'fallback-oauth-session-secret',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiration on activity
        cookie: {
            secure: isProduction, // HTTPS only in production
            httpOnly: true, // Prevent XSS attacks
            maxAge: 10 * 60 * 1000, // 10 minutes (short-lived for OAuth flow)
            sameSite: isProduction ? 'none' : 'lax' // For cross-origin in production
        },
        name: 'oauth.sid', // Custom session name
        // Add a comment about memory store
        // Note: MemoryStore is only used for OAuth flow completion
        // Main authentication uses JWT tokens, not sessions
    };
};

/**
 * Middleware that only applies sessions to OAuth routes
 */
export const oauthSessionMiddleware = (req, res, next) => {
    // Only apply session middleware to OAuth routes
    const isOAuthRoute = req.path.includes('/auth/google') ||
        req.path.includes('/auth/facebook') ||
        req.path.includes('/oauth');

    if (isOAuthRoute) {
        const sessionMiddleware = session(createSessionConfig());
        return sessionMiddleware(req, res, next);
    }

    // Skip session for non-OAuth routes
    next();
};
