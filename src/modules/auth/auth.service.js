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
                roles: ['user'],
                provider: 'email'
            });

            const savedUser = await this.userRepository.save(user);
            const { email, roles, id } = savedUser;

            const userWithoutPassword = { email, roles, id };

            return { user: userWithoutPassword };
        } catch (error) {
            console.error('Registration error in service:', error);
            throw error;
        }
    }

    async loginUser(email, password) {
        try {
            const user = await this.userRepository.findOne({
                where: { email }
            });

            if (!user) {
                throw new Error('User not found');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            const { password: _, name, id, roles } = user;

            const userWithoutPassword = { email: user?.email, name, id, roles };

            const token = generateToken({
                email: user.email,
                id: user.id
            });

            return { user: userWithoutPassword, token };
        } catch (error) {
            console.error('Login error in service:', error);
            throw error;
        }
    }

    async getAuthenticatedUserData(user) {
        try {
            console.log(user)
            if (!user || !user.email) {
                throw new Error('User not authenticated');
            }

            const userData = await this.userRepository.findOne({
                where: { email: user.email }
            });

            if (!userData) {
                throw new Error('User not found');
            }

            const { password, ...userWithoutPassword } = userData;
            return userWithoutPassword;
        } catch (error) {
            console.error('Error fetching authenticated user data:', error);
            throw error;
        }
    }

    async findOrCreateOAuthUser(profile, provider) {
        try {
            const email = profile.emails[0].value;
            let user = await this.userRepository.findOne({
                where: { email: email }
            });

            if (user) {
                // Update provider info if user exists
                if (provider === 'google' && !user.googleId) {
                    user.googleId = profile.id;
                }
                user = await this.userRepository.save(user);
            } else {
                // Create new user with default role
                const userData = {
                    email: email,
                    name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
                    provider: provider,
                    roles: ['user'], // Default role as array
                };

                if (provider === 'google') {
                    userData.googleId = profile.id;
                } else if (provider === 'facebook') {
                    userData.facebookId = profile.id;
                }

                user = this.userRepository.create(userData);
                user = await this.userRepository.save(user);
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('OAuth user creation/login error:', error);
            throw error;
        }
    }


    async getUserById(id) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: id }
            });

            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
            return null;
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

}

export { AuthService };