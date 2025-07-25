import 'reflect-metadata';
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import { AppModule } from "./modules/app/app.module.js";
import { connectDB } from "./config/database.js";

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
const envPath = path.resolve(__dirname, '..', envFile);

dotenv.config({ path: envPath });

// Debug: Verify critical environment variables are loaded
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    hasJWT_SECRET: !!process.env.JWT_SECRET
});

const app = express();
const port = process.env.PORT || 8000;

// Basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to the database FIRST, then initialize modules
connectDB().then(async () => {
    console.log('✅ Database connected successfully');

    // Initialize application modules AFTER database connection
    await AppModule(app);

    app.listen(port, () => {
        console.log(`🚀 Server is running on http://localhost:${port}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});