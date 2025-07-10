import { config } from 'dotenv';

console.log('=== CHECKING ENVIRONMENTS ===\n');

console.log('1. Default .env:');
config({ path: '.env' });
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

console.log('\n2. Production .env.production:');
config({ path: '.env.production' });
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET);

console.log('\n3. Local .env.local:');
config({ path: '.env.local' });
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Run with: node check - env.js