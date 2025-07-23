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
                graduation_year = ''
            } = queryParams;

            // Validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
            const offset = (pageNum - 1) * limitNum;

            // Validate sort parameters
            const allowedSortFields = [
                'id', 'email', 'name', 'created_at', 'updated_at',
                'graduation_year', 'batch', 'profession', 'provider'
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
                    'id', 'email', 'name', 'phone', 'location', 'profession', 'alumni_type',
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