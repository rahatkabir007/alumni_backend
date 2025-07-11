import 'reflect-metadata';
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from 'url';
import { AppModule } from "./modules/app/app.module.js"
import { connectDB } from "./config/database.js";

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first - before any other imports
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
const envPath = path.resolve(__dirname, '..', envFile);

console.log('Loading env file:', envPath);
dotenv.config({ path: envPath });

// Debug: Verify environment variables are loaded
console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    hasGOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    hasDB_PASSWORD: !!process.env.DB_PASSWORD
});

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173", // Vite dev server
    "https://cisc-alumni-frontend.vercel.app",
    process.env.FRONTEND_URL // Add this to your env variables
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

// Initialize application modules
AppModule(app);


// Connect to the database and start the server
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
});
