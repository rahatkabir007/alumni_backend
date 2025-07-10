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

    // Middlewares
    app.use(cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }));
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

    const appService = new AppService();
    const appController = new AppController(appService);

    appController.registerRoutes(app);

    // Initialize modules
    await AuthModule(app); // Add OAuth routes
    await UsersModule(app);

    // Apply auth middleware after OAuth routes
    app.use(authMiddleware);

    app.use(errorMiddleware);
};

export { AppModule };