import bcrypt from 'bcrypt';
import { generateToken } from "../../utils/jwtSign.js";
import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";

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

    async loginUser(userData) {
        try {
            const user = await this.userRepository.findOne({
                where: { email: userData.email }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user registered with OAuth (no password)
            if (!user.password && user.provider !== 'email') {
                throw new Error(`This email is registered with ${user.provider}. Please use ${user.provider} login.`);
            }

            const isValidPassword = await bcrypt.compare(userData.password, user.password);

            if (!isValidPassword) {
                throw new Error('Invalid password');
            }

            const token = generateToken(user.email);
            const { password, ...userWithoutPassword } = user;

            return { user: userWithoutPassword, token };
        } catch (error) {
            console.error('Login error in service:', error);
            throw error;
        }
    }

    async findOrCreateOAuthUser(profile, provider) {
        try {
            const email = provider === 'google'
                ? profile.emails[0].value
                : (profile.emails && profile.emails[0] ? profile.emails[0].value : null);

            if (!email) {
                throw new Error(`No email found in ${provider} profile`);
            }

            // Check if user already exists
            let user = await this.userRepository.findOne({
                where: { email: email }
            });

            if (user) {
                // Update user info if needed
                const updates = { provider };

                if (provider === 'google') {
                    updates.name = profile.displayName;
                    updates.googleId = profile.id;
                } else if (provider === 'facebook') {
                    updates.name = `${profile.name.givenName} ${profile.name.familyName}`;
                    updates.facebookId = profile.id;
                }

                Object.assign(user, updates);
                await this.userRepository.save(user);
                return user;
            }

            // Create new user
            const userData = {
                email: email,
                password: null, // No password for OAuth users
                provider: provider
            };

            if (provider === 'google') {
                userData.name = profile.displayName;
                userData.googleId = profile.id;
            } else if (provider === 'facebook') {
                userData.name = `${profile.name.givenName} ${profile.name.familyName}`;
                userData.facebookId = profile.id;
            }

            user = this.userRepository.create(userData);
            const savedUser = await this.userRepository.save(user);

            return savedUser;
        } catch (error) {
            console.error(`${provider} OAuth error:`, error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            return await this.userRepository.findOne({
                where: { email },
                select: ['id', 'email', 'name', 'provider', 'created_at']
            });
        } catch (error) {
            console.error('Get user by email error:', error);
            throw error;
        }
    }

    async getUserById(id) {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: ['id', 'email', 'name', 'provider', 'created_at']
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }
}

export { AuthService };