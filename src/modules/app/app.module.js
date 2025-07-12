import express from "express"
import cors from "cors"
import session from "express-session"
import passport from "passport"
import { connectDB } from "../../config/database.js";
import { configurePassport } from "../../config/passport.js";
import { logger } from "../../utils/logger.js"
import { errorMiddleware } from "../../middlewares/error.middleware.js"
import { authMiddleware } from "../../middlewares/auth.middleware.js"
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { UsersModule } from "../users/users.module.js";
import { AuthModule } from "../auth/auth.module.js";

let isDbConnected = false;

const AppModule = async (app) => {
    // Connect to database only once (important for serverless)
    if (!isDbConnected) {
        await connectDB();
        isDbConnected = true;
    }

    // Configure Passport after database connection
    configurePassport();

    // In app.module.js, replace app.use(cors()) with:
    const corsOptions = {
        origin: function (origin, callback) {
            console.log('Request Origin:', origin); // Debug log

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                process.env.FRONTEND_URL,
                'http://localhost:3000',
                'http://localhost:5173',
                'https://cisc-alumni-frontend.vercel.app',
                'https://cihs-alumni.netlify.app',
                'https://localhost:3000',
                'https://localhost:5173'
            ].filter(Boolean);

            if (allowedOrigins.some(allowedOrigin => allowedOrigin === origin)) {
                callback(null, true);
            } else {
                console.log('CORS blocked origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Authorization']
    };

    app.use(cors(corsOptions));
    app.use(express.json());

    // Session middleware for passport
    app.use(session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: process.env.NODE_ENV === 'production' }
    }));

    // Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Root level routes (non-API)
    const appService = new AppService();
    const appController = new AppController(appService);
    appController.registerRoutes(app);

    // Create API router
    const apiRouter = express.Router();

    // Initialize modules on API router
    await AuthModule(apiRouter); // Add OAuth routes
    await UsersModule(apiRouter);

    // Apply auth middleware after OAuth routes
    apiRouter.use(authMiddleware);

    // Mount API router under /api prefix
    app.use('/api', apiRouter);

    app.use(errorMiddleware);
};

export { AppModule };