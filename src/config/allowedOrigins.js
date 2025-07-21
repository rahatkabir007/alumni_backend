export const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002/',
    'https://localhost:3001',
    'https://localhost:3002',
    "https://cihs-alumni.vercel.app",
    'https://cihs-alumni.netlify.app',
].filter(Boolean); // Filter out undefined/null values here