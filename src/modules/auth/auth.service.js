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
                // Check if user exists with a different provider
                if (existingUser.provider !== 'email') {
                    throw new Error(`An account with this email already exists. Please sign in with ${existingUser.provider === 'google' ? 'Google' : existingUser.provider === 'facebook' ? 'Facebook' : existingUser.provider}.`);
                }
                throw new Error('User already exists with this email');
            }

            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const user = this.userRepository.create({
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                profilePhoto: userData.profilePhoto || '',
                roles: ['user'], // Default role as array
                provider: 'email'
            });

            const savedUser = await this.userRepository.save(user);

            // Generate token for immediate login after registration
            const token = generateToken(savedUser.email);

            console.log('User registered successfully:', savedUser.email);
            return {
                user: { id: savedUser.id }, // Only return user ID
                token
            };
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

            // Check if user was registered with OAuth provider
            if (user.provider !== 'email') {
                throw new Error(`This email is associated with ${user.provider === 'google' ? 'Google' : user.provider === 'facebook' ? 'Facebook' : user.provider} sign-in. Please use ${user.provider === 'google' ? 'Google' : user.provider === 'facebook' ? 'Facebook' : user.provider} to log in.`);
            }

            // Check if user registered with OAuth (no password)
            if (!user.password && user.provider !== 'email') {
                throw new Error(`Please sign in with ${user.provider}`);
            }

            const isValidPassword = await bcrypt.compare(userData.password, user.password);

            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            const token = generateToken(user.email);

            console.log('User logged in successfully:', user.email);
            return {
                user: { id: user.id }, // Only return user ID
                token
            };
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
                // Check if user exists but with different provider
                if (user.provider !== provider) {
                    throw new Error(`This email is already registered with ${user.provider === 'email' ? 'email/password' : user.provider === 'google' ? 'Google' : user.provider === 'facebook' ? 'Facebook' : user.provider}. Please use that method to sign in or use a different email.`);
                }

                // Update provider info and profile photo if user exists with same provider
                let hasUpdates = false;

                if (provider === 'google' && !user.googleId) {
                    user.googleId = profile.id;
                    hasUpdates = true;
                } else if (provider === 'facebook' && !user.facebookId) {
                    user.facebookId = profile.id;
                    hasUpdates = true;
                }

                // Update profile photo from OAuth provider if not set or update with latest
                const newProfilePhoto = profile.photos?.[0]?.value || '';
                if (newProfilePhoto && (!user.profilePhoto || user.profilePhoto === '')) {
                    user.profilePhoto = newProfilePhoto;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    user = await this.userRepository.save(user);
                }
            } else {
                // Create new user with default role and profile photo from OAuth
                const userData = {
                    email: email,
                    name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
                    profilePhoto: profile.photos?.[0]?.value || '', // Set profile photo from OAuth
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

                console.log(`New ${provider} user created with profile photo:`, {
                    email: user.email,
                    name: user.name,
                    profilePhoto: user.profilePhoto
                });
            }

            const { password, googleId, facebookId, provider: userProvider, ...userWithoutSensitiveData } = user;
            return userWithoutSensitiveData;
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
                const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = user;
                return userWithoutSensitiveData;
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
                const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = user;
                return userWithoutSensitiveData;
            }
            return null;
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

    // New method to update user roles
    async updateUserRoles(userId, roles, currentUserEmail = null) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Admin protection: Check if current user is trying to modify another admin
            if (currentUserEmail) {
                const currentUser = await this.userRepository.findOne({
                    where: { email: currentUserEmail }
                });

                // Prevent admin from updating another admin's roles
                if (user.roles && user.roles.includes('admin') && currentUser && currentUser.id !== userId) {
                    throw new Error('Admins cannot modify other admin accounts');
                }
            }

            // Admin limit validation (commented for future use)
            /*
            // Check if trying to add admin role and limit is reached
            if (roles.includes('admin') && !user.roles.includes('admin')) {
                const currentAdminCount = await this.userRepository.count({
                    where: { roles: Like('%"admin"%') }
                });

                if (currentAdminCount >= 2) {
                    throw new Error('Maximum number of admins (2) has been reached');
                }
            }
            */

            user.roles = roles;
            const updatedUser = await this.userRepository.save(user);

            const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = updatedUser;
            return userWithoutSensitiveData;
        } catch (error) {
            console.error('Update user roles error:', error);
            throw error;
        }
    }

    // Method to add a role to a user
    async addRoleToUser(userId, role, currentUserEmail = null) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Admin protection: Check if current user is trying to modify another admin
            if (currentUserEmail) {
                const currentUser = await this.userRepository.findOne({
                    where: { email: currentUserEmail }
                });

                // Prevent admin from updating another admin's roles
                if (user.roles && user.roles.includes('admin') && currentUser && currentUser.id !== userId) {
                    throw new Error('Admins cannot modify other admin accounts');
                }
            }

            // Ensure roles is an array
            if (!Array.isArray(user.roles)) {
                user.roles = ['user'];
            }

            // Admin limit validation (commented for future use)
            /*
            // Check if trying to add admin role and limit is reached
            if (role === 'admin' && !user.roles.includes('admin')) {
                const currentAdminCount = await this.userRepository.count({
                    where: { roles: Like('%"admin"%') }
                });

                if (currentAdminCount >= 2) {
                    throw new Error('Maximum number of admins (2) has been reached');
                }
            }
            */

            // Add role if it doesn't exist
            if (!user.roles.includes(role)) {
                user.roles.push(role);
                const updatedUser = await this.userRepository.save(user);

                const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = updatedUser;
                return userWithoutSensitiveData;
            }

            const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = user;
            return userWithoutSensitiveData;
        } catch (error) {
            console.error('Add role to user error:', error);
            throw error;
        }
    }

    // Method to remove a role from a user
    async removeRoleFromUser(userId, role, currentUserEmail = null) {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Admin protection: Check if current user is trying to modify another admin
            if (currentUserEmail) {
                const currentUser = await this.userRepository.findOne({
                    where: { email: currentUserEmail }
                });

                // Prevent admin from updating another admin's roles
                if (user.roles && user.roles.includes('admin') && currentUser && currentUser.id !== userId) {
                    throw new Error('Admins cannot modify other admin accounts');
                }

                // Prevent admin from removing their own admin role if they are the only admin
                if (role === 'admin' && currentUser && currentUser.id === userId) {
                    const adminCount = await this.userRepository.count({
                        where: { roles: Like('%"admin"%') }
                    });

                    if (adminCount <= 1) {
                        throw new Error('Cannot remove admin role. At least one admin must remain in the system');
                    }
                }
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

                const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = updatedUser;
                return userWithoutSensitiveData;
            }

            const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = user;
            return userWithoutSensitiveData;
        } catch (error) {
            console.error('Remove role from user error:', error);
            throw error;
        }
    }

    // Helper method to get admin count (for future use)
    async getAdminCount() {
        try {
            return await this.userRepository.count({
                where: { roles: Like('%"admin"%') }
            });
        } catch (error) {
            console.error('Get admin count error:', error);
            throw error;
        }
    }
}

export { AuthService };