import express from "express"
import cors from "cors"
import session from "express-session"
import passport from "passport"
import { GalleriesModule } from "../galleries/galleries.module.js";
import { connectDB } from "../../config/database.js";
import { configurePassport } from "../../config/passport.js";
import { logger } from "../../utils/logger.js"
import { errorMiddleware } from "../../middlewares/error.middleware.js"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { UsersModule } from "../users/users.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { allowedOrigins } from "../../config/allowedOrigins.js";

let isDbConnected = false;

const AppModule = async (app) => {
    // Connect to database only once (important for serverless)
    if (!isDbConnected) {
        await connectDB();
        isDbConnected = true;
    }

    // Configure Passport after database connection
    configurePassport();

    // CORS configuration - ONLY place where CORS is configured
    const corsOptions = {
        origin: function (origin, callback) {
            console.log('Request Origin:', origin);

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                console.log('No origin - allowing request');
                return callback(null, true);
            }

            // Filter out undefined/null values from allowedOrigins
            const validOrigins = allowedOrigins.filter(Boolean);
            console.log('Valid allowed origins:', validOrigins);

            // Check if origin is in our allowed list
            const isAllowedOrigin = validOrigins.some(allowedOrigin => allowedOrigin === origin);

            if (isAllowedOrigin) {
                console.log('✅ Origin in allowed list - allowing request');
            } else {
                console.log('⚠️ Origin NOT in allowed list but allowing anyway for development');
            }

            // Always allow the request (for development flexibility)
            callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Authorization']
    };

    // Apply CORS middleware
    app.use(cors(corsOptions));

    // Handle preflight requests explicitly
    app.options('*', cors(corsOptions));

    // Session middleware for passport (only for OAuth routes)
    app.use(session({
        secret: process.env.JWT_SECRET || 'fallback-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 10 * 60 * 1000 // 10 minutes for OAuth flow
        },
        name: 'oauth.sid'
    }));

    // Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Root level routes (non-API)
    const appService = new AppService();
    const appController = new AppController(appService);
    appController.registerRoutes(app);

    // Initialize auth module directly on app (not on API router) to handle /auth routes

    // Create API router for other modules
    const apiRouter = express.Router();
    // Mount API router under /api prefix
    app.use('/api', apiRouter);
    // Error handling middleware (should be last)
        GalleriesModule(app);
app.use(errorMiddleware);

    // Initialize other modules on API router
    await AuthModule(apiRouter);
    await UsersModule(apiRouter);

    // Apply auth middleware to API routes (after auth routes are registered)
    // apiRouter.use(authMiddleware);


};

export { AppModule };