import { config } from 'dotenv';

// Load production environment
config({ path: '.env.production' });

// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

console.log('Testing with production environment locally:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// Import and start your app
import('./src/main.js').catch(console.error);


//to tun this


//1. Run the test script:
// npm run test: prod - local


// or directly with Node.js
// Make sure to have the necessary environment variables set in .env.production
//node test-prod-local.js


// # Test health check
// curl http://localhost:8000/health

// # Test registration with production database
// curl - X POST http://localhost:8000/register \
// -H "Content-Type: application/json" \
// -d '{"name":"Test User","email":"test@example.com","password":"password123"}'