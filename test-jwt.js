import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('JWT Secret:', process.env.JWT_SECRET);

// Test token generation
const testEmail = 'test@example.com';
const token = jwt.sign({ email: testEmail }, process.env.JWT_SECRET, { expiresIn: "10h" });

console.log('Generated token:', token);
console.log('Token length:', token.length);

// Test token verification
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
} catch (error) {
    console.error('Token verification failed:', error.message);
}

// Test with jwt.io format
console.log('\n--- For jwt.io testing ---');
console.log('Token:', token);
console.log('Secret:', process.env.JWT_SECRET);
console.log('Algorithm: HS256');
