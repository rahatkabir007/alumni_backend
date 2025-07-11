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
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('Google profile:', profile);
            const user = await authService.findOrCreateOAuthUser(profile, 'google');
            return done(null, user);
        } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
        }
    }));

    // Facebook OAuth Strategy (only if credentials are provided)
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        passport.use(new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/facebook/callback`,
            profileFields: ['id', 'emails', 'name']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('Facebook profile:', profile);
                const user = await authService.findOrCreateOAuthUser(profile, 'facebook');
                return done(null, user);
            } catch (error) {
                console.error('Facebook OAuth error:', error);
                return done(error, null);
            }
        }));
    } else {
        console.log('Facebook OAuth not configured - missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
    }

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