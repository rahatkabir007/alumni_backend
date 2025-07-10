import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { User } from '../entities/User.js';

// Load environment config - Fix this part
config(); // This will load .env by default

let dataSource;

const createDatabaseIfNotExists = async () => {
    // Only create database in development (local)
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres', // Connect to default database first
    });

    try {
        await client.connect();
        const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);

        if (result.rows.length === 0) {
            await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`Database ${process.env.DB_NAME} created successfully`);
        }
    } catch (error) {
        console.log('Database might already exist or error occurred:', error.message);
    } finally {
        await client.end();
    }
};

const connectDB = async () => {
    try {
        // Debug: Log environment variables
        console.log('Environment Debug:', {
            NODE_ENV: process.env.NODE_ENV,
            hasJWT_SECRET: !!process.env.JWT_SECRET,
            hasDATABASE_URL: !!process.env.DATABASE_URL,
            hasPOSTGRES_URL: !!process.env.POSTGRES_URL,
            hasDB_HOST: !!process.env.DB_HOST
        });

        // Create database if in development
        await createDatabaseIfNotExists();

        const isProduction = process.env.NODE_ENV === 'production';

        // Use different connection approaches for development vs production
        let connectionConfig;

        if (isProduction) {
            // Production: Use Neon's environment variables
            const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

            if (!dbUrl) {
                throw new Error('DATABASE_URL or POSTGRES_URL is required in production');
            }

            connectionConfig = {
                type: 'postgres',
                url: dbUrl,
                entities: [User],
                synchronize: true, // Enable to create tables in production (first time)
                logging: false,
                ssl: { rejectUnauthorized: false },
                extra: {
                    connectionLimit: 10,
                    acquireTimeoutMillis: 60000,
                    timeout: 60000,
                }
            };
        } else {
            // Development: Use individual connection parameters
            connectionConfig = {
                type: 'postgres',
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT) || 5432,
                username: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                entities: [User],
                synchronize: true, // Auto-sync in development
                logging: false,
                ssl: false
            };
        }

        dataSource = new DataSource(connectionConfig);

        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }

        console.log(`Connected to PostgreSQL (${process.env.NODE_ENV})`);
        return dataSource;
    } catch (error) {
        console.error('Could not connect to PostgreSQL', error);
        throw error;
    }
};

const getDataSource = () => {
    if (!dataSource || !dataSource.isInitialized) {
        throw new Error('Database not initialized. Call connectDB() first.');
    }
    return dataSource;
};

export { connectDB, getDataSource };