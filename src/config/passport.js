import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { AuthService } from '../modules/auth/auth.service.js';

const configurePassport = () => {
    const authService = new AuthService();

    // Debug: Check if environment variables are loaded
    console.log('Passport Environment Debug:', {
        hasGOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        hasGOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_CLIENT_ID_VALUE: process.env.GOOGLE_CLIENT_ID
    });

    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('Google profile received:', {
                id: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                photo: profile.photos?.[0]?.value
            });

            const user = await authService.findOrCreateOAuthUser(profile, 'google');
            return done(null, user);
        } catch (error) {
            console.error('Google OAuth error:', error);

            // Handle provider conflict errors with detailed info
            if (error.message.includes('already registered with')) {
                return done(null, false, {
                    message: error.message,
                    type: 'provider_conflict',
                    details: {
                        email: profile.emails?.[0]?.value,
                        conflictProvider: error.message.includes('email/password') ? 'email' :
                            error.message.includes('Facebook') ? 'facebook' : 'unknown',
                        attemptedProvider: 'google'
                    }
                });
            }

            // Handle other OAuth errors
            return done(null, false, {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Google authentication failed',
                type: 'oauth_error',
                provider: 'google'
            });
        }
    }));


    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await authService.getUserById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};

export { configurePassport };