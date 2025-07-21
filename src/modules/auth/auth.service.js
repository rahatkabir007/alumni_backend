import bcrypt from 'bcrypt';
import { getDataSource } from '../../config/database.js';
import { User } from '../../entities/User.js';
import { generateToken } from '../../utils/jwtSign.js';

class AuthService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.userRepository = this.dataSource.getRepository(User);
        } catch (error) {
            console.error('Error initializing AuthService:', error);
            throw error;
        }
    }

    async registerUser(userData) {
        try {
            console.log('Registration attempt for:', userData.email);

            // Check if user already exists
            const existingUser = await this.userRepository.findOne({
                where: { email: userData.email }
            });

            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const user = this.userRepository.create({
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                roles: ['user'], // Default role as array
                provider: 'email'
            });

            const savedUser = await this.userRepository.save(user);
            const { password, ...userWithoutPassword } = savedUser;

            // Generate token for immediate login after registration
            const token = generateToken(savedUser.email);

            console.log('User registered successfully:', userWithoutPassword.email);
            return { user: userWithoutPassword, token };
        } catch (error) {
            console.error('Registration error in service:', error);
            throw error;
        }
    }



}

export { AuthService };