import bcrypt from 'bcrypt';
import { getDataSource } from '../../config/database.js';
import { User } from '../../entities/User.js';
import { generateToken } from '../../utils/jwtSign.js';
import { extractProfilePhoto, extractUserName, shouldUpdateProfilePhoto } from '../../helpers/oauth.helper.js';

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
                // If user exists and has a password, they can't register again
                if (existingUser.password) {
                    throw new Error('User already exists with this email');
                }

                // If user exists but only has OAuth (no password), allow them to set a password
                if (!existingUser.password && existingUser.provider && existingUser.provider !== 'email') {
                    console.log(`Allowing ${existingUser.provider} user to set password for email login`);

                    const hashedPassword = await bcrypt.hash(userData.password, 10);

                    // Update existing user with password and combined provider
                    existingUser.password = hashedPassword;
                    existingUser.name = userData.name || existingUser.name; // Keep existing name if no new name provided
                    existingUser.provider = `${existingUser.provider},email`; // Combine providers

                    const savedUser = await this.userRepository.save(existingUser);
                    const { email, roles, id, name } = savedUser;

                    const userWithoutPassword = { email, roles, id, name };

                    return {
                        user: userWithoutPassword,
                        message: 'Password added successfully. You can now login with both email/password and Google.'
                    };
                }
            }

            // Create new user with email/password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const user = this.userRepository.create({
                email: userData.email,
                password: hashedPassword,
                name: userData.name,
                alumni_type: userData.alumni_type || null,
                status: "pending",
                roles: ['user'],
                provider: 'email'
            });

            const savedUser = await this.userRepository.save(user);
            const { email, roles, id, name, alumni_type, status } = savedUser;

            const userWithoutPassword = { email, roles, id, name, alumni_type, status };

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

            // Check if user registered with OAuth provider and has no password
            if (!user.password && user.provider && user.provider !== 'email') {
                throw new Error(`This email is registered with ${user.provider}. You can register with email/password to enable login with both methods.`);
            }

            // Check if user has no password but provider is email (edge case)
            if (!user.password) {
                throw new Error('Account setup incomplete. Please reset your password or contact support.');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            const { password: _, name, id, roles, profilePhoto, profilePhotoSource } = user;

            const userWithoutPassword = {
                email: user.email,
                name,
                id,
                roles,
                profilePhoto,
                profilePhotoSource,
                provider: user.provider
            };

            const token = generateToken({
                email: user.email,
                id: user.id,
                roles: user.roles // Include roles in JWT token
            });

            return { user: userWithoutPassword, token };
        } catch (error) {
            console.error('Login error in service:', error);
            throw error;
        }
    }

    async getAuthenticatedUserData(user, includeDetails = true) {
        try {
            if (!user || !user.email) {
                throw new Error('User not authenticated');
            }

            const userData = await this.userRepository.findOne({
                where: { email: user.email }
            });

            if (!userData) {
                throw new Error('User not found');
            }

            const selectFields = [
                'id', 'email', 'name', 'phone', 'location',
                'profession', 'alumni_type', 'blood_group', 'status',
                'graduation_year', 'batch', 'bio', 'isActive',
                'isGraduated', 'left_at', 'joinedYear', 'profilePhoto',
                'profilePhotoSource', 'roles', 'provider',
                'created_at', 'updated_at'
            ];

            if (includeDetails) {
                selectFields.push('additional_information');
            }

            return await this.userRepository.findOne({
                where: { id: userData.id },
                select: selectFields
            });
        } catch (error) {
            console.error('Error fetching authenticated user data:', error);
            throw error;
        }
    }

    async findOrCreateOAuthUser(profile, provider) {
        try {
            const email = profile.emails[0].value;
            const extractedName = extractUserName(profile);
            const extractedPhoto = extractProfilePhoto(profile);

            console.log('OAuth Profile Data:', {
                email,
                name: extractedName,
                photo: extractedPhoto,
                provider,
                status: 'pending',
            });

            let user = await this.userRepository.findOne({
                where: { email: email }
            });

            if (user) {
                // User exists - update OAuth info and potentially photo
                if (user.provider === 'email' && user.password) {
                    // Link OAuth account to existing email account
                    if (provider === 'google' && !user.googleId) {
                        user.googleId = profile.id;
                        user.provider = 'email,google';

                        // Update profile photo if it should be updated
                        if (extractedPhoto && shouldUpdateProfilePhoto(user, extractedPhoto, provider)) {
                            user.profilePhoto = extractedPhoto;
                            user.profilePhotoSource = provider;
                        }
                    }
                } else if (user.provider && user.provider.includes('email')) {
                    // User has both email and OAuth - just update OAuth info
                    if (provider === 'google' && !user.googleId) {
                        user.googleId = profile.id;
                        // Provider already contains both, no need to update
                    }

                    // Update profile photo if it should be updated
                    if (extractedPhoto && shouldUpdateProfilePhoto(user, extractedPhoto, provider)) {
                        user.profilePhoto = extractedPhoto;
                        user.profilePhotoSource = provider;
                    }
                } else {
                    // Update existing OAuth-only user
                    if (provider === 'google' && !user.googleId) {
                        user.googleId = profile.id;
                    }

                    // Update profile photo if it should be updated
                    if (extractedPhoto && shouldUpdateProfilePhoto(user, extractedPhoto, provider)) {
                        user.profilePhoto = extractedPhoto;
                        user.profilePhotoSource = provider;
                    }

                    // Update name if it's empty or from same provider
                    if (!user.name || user.name.trim() === '' || user.provider === provider) {
                        user.name = extractedName;
                    }
                }

                user = await this.userRepository.save(user);
            } else {
                // Create new user with OAuth only
                const userData = {
                    email: email,
                    name: extractedName,
                    provider: provider,
                    roles: ['user'],
                    profilePhoto: extractedPhoto || '',
                    profilePhotoSource: extractedPhoto ? provider : null,
                };

                if (provider === 'google') {
                    userData.googleId = profile.id;
                }

                // console.log('Creating new OAuth user:', userData);

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
                const { email, roles, id } = user;
                return { email, roles, id };
            }
            return null;
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

}

export { AuthService };