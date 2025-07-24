import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";
import {
    sanitizeName,
    validatePhone,
    validateLocation,
    validateProfession,
    validateGraduationYear,
    validateBatch,
    validateBio,
    validateLeftAtYear
} from "../../helpers/validation.helper.js";

class UsersService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.userRepository = this.dataSource.getRepository(User);
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
                isActive = '',
                isGraduated = '',
                graduation_year = '',
                status = '',
                role = ''
            } = queryParams;

            // Validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
            const offset = (pageNum - 1) * limitNum;

            // Validate sort parameters
            const allowedSortFields = [
                'created_at', 'updated_at', 'name', 'email', 'phone', 'location',
                'profession', 'graduation_year', 'batch', 'bio', 'isActive', 'roles',
                'isGraduated', 'left_at', 'profilePhotoSource', 'alumni_type', 'status',
                'blood_group', 'profilePhoto',
            ];

            const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            // Build query
            const queryBuilder = this.userRepository.createQueryBuilder('user');

            // Select fields (exclude password)
            queryBuilder.select([
                'user.id',
                'user.email',
                'user.name',
                'user.phone',
                'user.alumni_type',
                'user.status',
                'user.blood_group',
                'user.location',
                'user.profession',
                'user.graduation_year',
                'user.batch',
                'user.bio',
                'user.isActive',
                'user.isGraduated',
                'user.left_at',
                'user.profilePhoto',
                'user.profilePhotoSource',
                'user.roles',
                'user.provider',
                'user.created_at',
                'user.updated_at'
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

            // Apply isActive filter
            if (isActive !== '') {
                const activeValue = isActive === 'true';
                queryBuilder.andWhere('user.isActive = :isActive', { isActive: activeValue });
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
            // Apply sorting
            queryBuilder.orderBy(`user.${validSortBy}`, validSortOrder);

            // Get total count for pagination
            const totalItems = await queryBuilder.getCount();

            // Apply pagination
            queryBuilder.skip(offset).take(limitNum);

            // Execute query
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
                // // Optional: Include applied filters and sorting for debugging
                // appliedFilters: {
                //     search: search || null,
                //     provider: provider || null,
                //     isActive: isActive || null,
                //     isGraduated: isGraduated || null,
                //     graduation_year: graduation_year || null,
                //     status: status || null,
                //     role: role || null,
                //     sortBy: validSortBy,
                //     sortOrder: validSortOrder
                // }
            };
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    }
    async getUserById(id) {
        try {
            const userId = parseInt(id);
            if (isNaN(userId)) {
                throw new Error('Invalid user ID');
            }

            return await this.userRepository.findOne({
                where: { id: userId },
                select: [
                    'id', 'email', 'name', 'phone', 'location', 'profession', 'alumni_type', 'blood_group', 'status',
                    'graduation_year', 'batch', 'bio', 'isActive', 'isGraduated',
                    'left_at', 'profilePhoto', 'profilePhotoSource', 'roles',
                    'provider', 'created_at', 'updated_at'
                ]
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

            // Validate and sanitize allowed fields
            const allowedFields = [
                'name', 'phone', 'location', 'profession', 'graduation_year',
                'batch', 'bio', 'isGraduated', 'left_at'
            ];

            const validatedData = {};

            // Validate each field if provided
            if (updateData.name !== undefined) {
                validatedData.name = sanitizeName(updateData.name);
            }

            if (updateData.phone !== undefined) {
                validatedData.phone = validatePhone(updateData.phone);
            }

            if (updateData.location !== undefined) {
                validatedData.location = validateLocation(updateData.location);
            }

            if (updateData.profession !== undefined) {
                validatedData.profession = validateProfession(updateData.profession);
            }

            if (updateData.graduation_year !== undefined) {
                validatedData.graduation_year = validateGraduationYear(updateData.graduation_year);
            }

            if (updateData.batch !== undefined) {
                validatedData.batch = validateBatch(updateData.batch);
            }

            if (updateData.bio !== undefined) {
                validatedData.bio = validateBio(updateData.bio);
            }

            if (updateData.isGraduated !== undefined) {
                validatedData.isGraduated = updateData.isGraduated === true || updateData.isGraduated === 'true';
            }

            if (updateData.left_at !== undefined) {
                validatedData.left_at = validateLeftAtYear(updateData.left_at);
            }

            if (updateData.blood_group !== undefined) {
                if (['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(updateData.blood_group)) {
                    validatedData.blood_group = updateData.blood_group;
                } else {
                    throw new Error('Invalid blood group');
                }
            }
            if (updateData.alumni_type !== undefined) {
                if (['student', 'teacher', 'management'].includes(updateData.alumni_type)) {
                    validatedData.alumni_type = updateData.alumni_type;
                }
                else {
                    throw new Error('Invalid alumni type');
                }
            }
            if (updateData.profilePhotoSource !== undefined) {
                if (['google', 'manual'].includes(updateData.profilePhotoSource)) {
                    validatedData.profilePhotoSource = updateData.profilePhotoSource;
                } else {
                    throw new Error('Invalid profile photo source');
                }
            }
            if (updateData.profilePhoto !== undefined) {
                if (typeof updateData.profilePhoto === 'string' && updateData.profilePhoto.length <= 500) {
                    validatedData.profilePhoto = updateData.profilePhoto;
                } else {
                    throw new Error('Invalid profile photo URL');
                }
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
}

export { UsersService };