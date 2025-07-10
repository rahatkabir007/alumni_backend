import 'reflect-metadata';
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { AppModule } from "./modules/app/app.module.js"
import { connectDB } from "./config/database.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
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
