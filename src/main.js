import 'reflect-metadata';
import express from "express";
import cors from "cors";
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

console.log('Loading env file:', envPath);
dotenv.config({ path: envPath });
// const envResult = dotenv.config({ path: envPath });

// if (envResult.error) {
//     console.warn('Warning: Could not load env file:', envResult.error.message);
//     // Try loading default .env file as fallback
//     dotenv.config();
// }

// Debug: Verify critical environment variables are loaded
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    hasJWT_SECRET: !!process.env.JWT_SECRET,
    hasGOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    hasGOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    hasDB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME
});

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://cihs-alumni.vercel.app",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        console.log('Request Origin:', origin); // Debug: Log the incoming origin
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error('CORS Error: Origin not allowed', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Initialize application modules
AppModule(app);

// Connect to the database and start the server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});