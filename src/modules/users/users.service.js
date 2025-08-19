import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";
import { PasswordService } from "../../utils/passwordService.js";
import { UserValidator } from "../../validations/userValidation.js";

class UsersService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.userRepository = this.dataSource.getRepository(User);
            this.passwordService = new PasswordService();
        } catch (error) {
            console.error('Error initializing UsersService:', error);
            throw error;
        }
    }

    async getUsers(queryParams = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'created_at',
                sortOrder = 'DESC',
                search = '',
                provider = '',
                isGraduated = '',
                graduation_year = '',
                status = '',
                role = '',
                excludeAdmins = false,
                alumni_type = '',
                verified = false,
            } = queryParams;

            // Validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
            const offset = (pageNum - 1) * limitNum;

            // Validate sort parameters
            const allowedSortFields = [
                'created_at', 'updated_at', 'name', 'email', 'phone', 'location',
                'profession', 'graduation_year', 'batch', 'bio', 'roles',
                'isGraduated', 'left_at', 'joinedYear', 'profilePhotoSource', 'alumni_type', 'status',
                'blood_group', 'profilePhoto',
            ];

            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            // Build query
            const queryBuilder = this.userRepository.createQueryBuilder('user');

            // Select fields (exclude password)
            queryBuilder.select([
                'user.id', 'user.email', 'user.name', 'user.phone', 'user.alumni_type', 'user.branch',
                'user.status', 'user.blood_group', 'user.location', 'user.profession',
                'user.graduation_year', 'user.batch', 'user.bio',
                'user.isGraduated', 'user.left_at', 'user.joinedYear', 'user.profilePhoto',
                'user.profilePhotoSource', 'user.roles', 'user.provider',
                'user.created_at', 'user.updated_at'
            ]);

            // Apply search filter
            if (search && search.trim()) {
                const searchTerm = `%${search.trim()}%`;
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search OR user.profession ILIKE :search OR user.batch ILIKE :search)',
                    { search: searchTerm }
                );
            }

            // Apply provider filter
            if (provider && provider.trim()) {
                queryBuilder.andWhere('user.provider ILIKE :provider', { provider: `%${provider.trim()}%` });
            }
            // Apply isGraduated filter
            if (isGraduated !== '') {
                const graduatedValue = isGraduated === 'true';
                queryBuilder.andWhere('user.isGraduated = :isGraduated', { isGraduated: graduatedValue });
            }

            // Apply graduation year filter
            if (graduation_year && graduation_year.trim()) {
                const year = parseInt(graduation_year.trim());
                if (!isNaN(year)) {
                    queryBuilder.andWhere('user.graduation_year = :graduation_year', { graduation_year: year });
                }
            }

            // Apply status filter (active, inactive, pending, etc.)
            if (status && status.trim()) {
                queryBuilder.andWhere('user.status ILIKE :status', { status: status.trim() });
            }

            // Apply role filter - check if role exists in the roles array
            if (role && role.trim()) {
                // Use CAST instead of :: syntax for better compatibility
                queryBuilder.andWhere(
                    'CAST(user.roles AS TEXT) LIKE :rolePattern',
                    { rolePattern: `%"${role.trim()}"%` }
                );
            }

            // Apply alumni_type filter with special handling for teacher_management
            if (alumni_type && alumni_type.trim()) {
                const trimmedAlumniType = alumni_type.trim();

                if (trimmedAlumniType === 'teacher_management') {
                    // Special case: include both teacher and management types
                    queryBuilder.andWhere('user.alumni_type IN (:...types)', { types: ['teacher', 'management'] });
                } else {
                    // Normal case: exact match
                    queryBuilder.andWhere('user.alumni_type = :alumni_type', { alumni_type: trimmedAlumniType });
                }
            }

            // Apply sorting
            queryBuilder.orderBy(`user.${validSortBy}`, validSortOrder);



            // Execute query
            if (excludeAdmins) {
                // Fix: Use CAST to jsonb and compare with JSON array string
                queryBuilder.andWhere(`CAST(user.roles AS jsonb) @> :adminRole = false`, { adminRole: '["admin"]' });
            }

            if (verified) {
                queryBuilder.andWhere('user.status = :status', { status: 'active' });
            }



            // Get total count for pagination
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(offset).take(limitNum);

            const users = await queryBuilder.getMany();

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalItems / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            // Return flattened structure
            return {
                users,
                currentPage: pageNum,
                totalPages,
                totalItems,
                itemsPerPage: limitNum,
                hasNextPage,
                hasPrevPage,
            };
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    }

    async getUserById(id, includeDetails = false) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const selectFields = [
                'id', 'email', 'name', 'phone', 'location',
                'profession', 'alumni_type', 'branch', 'blood_group', 'status',
                'graduation_year', 'batch', 'bio',
                'isGraduated', 'left_at', 'joinedYear', 'profilePhoto',
                'profilePhotoSource', 'roles', 'provider',
                'created_at', 'updated_at'
            ];

            if (includeDetails) {
                selectFields.push('additional_information', 'verification_fields');
            }

            // ✅ FASTEST: Uses primary key index
            return await this.userRepository.findOne({
                where: { id: userId },
                select: selectFields
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

    async updateUser(id, updateData) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Use centralized validation for all fields
            const fieldsToValidate = {
                name: updateData.name,
                phone: updateData.phone,
                branch: updateData.branch,
                location: updateData.location,
                blood_group: updateData.blood_group,
                batch: updateData.batch,
                isGraduated: updateData.isGraduated,
                joinedYear: updateData.joinedYear,
                graduation_year: updateData.graduation_year,
                left_at: updateData.left_at,
                profession: updateData.profession,
                bio: updateData.bio,
                alumni_type: updateData.alumni_type,
                profilePhotoSource: updateData.profilePhotoSource,
                profilePhoto: updateData.profilePhoto
            };

            // Remove undefined values
            Object.keys(fieldsToValidate).forEach(key => {
                if (fieldsToValidate[key] === undefined) {
                    delete fieldsToValidate[key];
                }
            });

            // Validate all fields using centralized validation
            const validatedData = UserValidator.validateUserUpdate(fieldsToValidate);

            // Handle additional_information field
            if (updateData.additional_information !== undefined) {
                let additionalInfo = updateData.additional_information;
                if (typeof additionalInfo === 'string') {
                    try {
                        additionalInfo = JSON.parse(additionalInfo);
                    } catch (e) {
                        throw new Error('Invalid JSON for additional_information');
                    }
                }
                validatedData.additional_information = UserValidator.validateAdditionalInformation(
                    additionalInfo,
                    user.alumni_type
                );
            }

            // Apply validated changes
            Object.assign(user, validatedData);
            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    async changePassword(id, data) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }
            // Include password field in the query since it's excluded by default
            const user = await this.userRepository.findOne({
                where: { id: userId },
                select: ['id', 'email', 'password', 'name'] // Explicitly include password
            });
            if (!user) {
                throw new Error('User not found');
            }
            if (!data.oldPassword || !data.newPassword) {
                throw new Error('Old and new passwords are required');
            }
            if (data.newPassword.length < 6 || data.newPassword.length > 50) {
                throw new Error('New password must be between 6 and 50 characters');
            }

            // Check if old password is correct
            const isMatch = await this.passwordService.comparePasswords(data.oldPassword, user.password);
            if (!isMatch) {
                throw new Error('Old password is incorrect');
            }

            // Hash new password and update user
            user.password = await this.passwordService.hashPassword(data.newPassword);
            await this.userRepository.save(user);

            return { message: 'Password changed successfully' };
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    async updateAdditionalInformation(id, additionalInfo) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Use centralized validation
            const validatedInfo = UserValidator.validateAdditionalInformation(additionalInfo, user.alumni_type);

            // Merge with existing additional_information
            const existingInfo = user.additional_information || {};
            user.additional_information = { ...existingInfo, ...validatedInfo };

            const updatedUser = await this.userRepository.save(user);
            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update additional information error:', error);
            throw error;
        }
    }

    async updateStatus(id, status) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });

            if (!user) {
                throw new Error('User not found');
            }

            // Validate status
            if (typeof status !== 'string' || status.length > 50) {
                throw new Error('Invalid status');
            }

            user.status = status;
            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update user status error:', error);
            throw error;
        }
    }

    async updateRole(id, role) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });

            if (!user) {
                throw new Error('User not found');
            }

            // Validate role
            if (typeof role !== 'string' || role.length > 50) {
                throw new Error('Invalid role');
            }

            // Ensure roles is an array
            if (!Array.isArray(user.roles)) {
                user.roles = [];
            }

            // Add the new role if it doesn't already exist
            if (!user.roles.includes(role)) {
                user.roles.push(role);
            }

            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update user role error:', error);
            throw error;
        }
    }

    async removeRole(id, role) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });

            if (!user) {
                throw new Error('User not found');
            }

            // Validate role
            if (typeof role !== 'string' || role.length > 50) {
                throw new Error('Invalid role');
            }

            // Remove the role if it exists
            user.roles = user.roles.filter(r => r !== role);

            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Remove user role error:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const result = await this.userRepository.delete(userId);
            return result.affected > 0;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }

    async applyForVerification(id, verificationData = {}) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new Error('User not found');
            }

            // Use centralized validation
            const validatedVerificationData = UserValidator.validateVerificationData(verificationData);

            // If social media is provided in verification, also add it to additional_information
            if (validatedVerificationData.socialMedia && Object.keys(validatedVerificationData.socialMedia).length > 0) {
                const existingAdditionalInfo = user.additional_information || {};
                const existingSocialMedia = existingAdditionalInfo.socialMedia || {};

                // Merge social media data
                const mergedSocialMedia = { ...existingSocialMedia, ...validatedVerificationData.socialMedia };

                user.additional_information = {
                    ...existingAdditionalInfo,
                    socialMedia: mergedSocialMedia
                };
            }

            // Store verification data
            user.verification_fields = validatedVerificationData;

            // Update status to pending verification if not already verified
            if (user.status !== 'active') {
                user.status = 'applied_for_verification';
            }

            const updatedUser = await this.userRepository.save(user);
            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Apply for verification error:', error);
            throw error;
        }
    }
}

export { UsersService };