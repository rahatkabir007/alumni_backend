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

    async loginUser(userData) {
        try {
            const user = await this.userRepository.findOne({
                where: { email: userData.email }
            });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if user registered with OAuth (no password)
            if (!user.password && user.provider !== 'email') {
                throw new Error(`Please sign in with ${user.provider}`);
            }

            const isValidPassword = await bcrypt.compare(userData.password, user.password);

            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            const { password, ...userWithoutPassword } = user;
            const token = generateToken(user.email);

            console.log('User logged in successfully:', userWithoutPassword.email);
            return { user: userWithoutPassword, token };
        } catch (error) {
            console.error('Login error in service:', error);
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
                } else if (provider === 'facebook' && !user.facebookId) {
                    user.facebookId = profile.id;
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

    async getUserByEmail(email) {
        try {
            const user = await this.userRepository.findOne({
                where: { email: email }
            });

            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
            return null;
        } catch (error) {
            console.error('Get user by email error:', error);
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

    // New method to update user roles
    async updateUserRoles(userId, roles) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            user.roles = roles;
            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update user roles error:', error);
            throw error;
        }
    }

    // Method to add a role to a user
    async addRoleToUser(userId, role) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Ensure roles is an array
            if (!Array.isArray(user.roles)) {
                user.roles = ['user'];
            }

            // Add role if it doesn't exist
            if (!user.roles.includes(role)) {
                user.roles.push(role);
                const updatedUser = await this.userRepository.save(user);

                const { password, ...userWithoutPassword } = updatedUser;
                return userWithoutPassword;
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Add role to user error:', error);
            throw error;
        }
    }

    // Method to remove a role from a user
    async removeRoleFromUser(userId, role) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Ensure roles is an array
            if (!Array.isArray(user.roles)) {
                user.roles = ['user'];
            }

            // Remove role if it exists (but keep at least 'user' role)
            if (user.roles.includes(role) && !(role === 'user' && user.roles.length === 1)) {
                user.roles = user.roles.filter(r => r !== role);

                // Ensure user always has at least 'user' role
                if (user.roles.length === 0) {
                    user.roles = ['user'];
                }

                const updatedUser = await this.userRepository.save(user);

                const { password, ...userWithoutPassword } = updatedUser;
                return userWithoutPassword;
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Remove role from user error:', error);
            throw error;
        }
    }
}

export { AuthService };