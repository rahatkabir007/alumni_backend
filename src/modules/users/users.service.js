import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";
import { Like, In } from "typeorm";
import {
    sanitizeName,
    validateProfilePhoto,
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

    async getUsers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                status = 'all',
                role = 'all',
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = options;

            const skip = (page - 1) * limit;

            // Build query builder for complex filtering
            const queryBuilder = this.userRepository.createQueryBuilder('user');

            // Select specific fields (including new fields)
            queryBuilder.select([
                'user.id',
                'user.email',
                'user.name',
                'user.phone',
                'user.location',
                'user.profession',
                'user.graduation_year',
                'user.batch',
                'user.bio',
                'user.isActive',
                'user.isGraduated',
                'user.left_at',
                'user.profilePhoto',
                'user.roles',
                'user.created_at',
                'user.updated_at'
            ]);

            // Apply search filter (expanded to include new fields)
            if (search && search.trim() !== '') {
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search OR user.profession ILIKE :search OR user.location ILIKE :search OR user.batch ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Apply role filter
            if (role !== 'all' && role.trim() !== '') {
                queryBuilder.andWhere(
                    'user.roles::jsonb ? :role',
                    { role: role }
                );
            }

            // Apply status filter (active/inactive)
            if (status !== 'all' && status.trim() !== '') {
                if (status === 'active') {
                    queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
                } else if (status === 'inactive') {
                    queryBuilder.andWhere('user.isActive = :isActive', { isActive: false });
                }
            }

            // Apply sorting
            const sortField = this.mapSortField(sortBy);
            const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            queryBuilder.orderBy(`user.${sortField}`, sortDirection);

            // Apply pagination
            queryBuilder.skip(skip).take(limit);

            // Execute query
            const [users, total] = await queryBuilder.getManyAndCount();

            const totalPages = Math.ceil(total / limit);

            return {
                users,
                total,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            };
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    }

    // Helper method to map frontend sort fields to database fields
    mapSortField(sortBy) {
        const fieldMapping = {
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'name': 'name',
            'email': 'email',
            'id': 'id',
            'graduation_year': 'graduation_year',
            'left_at': 'left_at'
        };

        return fieldMapping[sortBy] || 'created_at';
    }

    async getUserById(id) {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: [
                    'id', 'email', 'name', 'phone', 'location', 'profession',
                    'graduation_year', 'batch', 'bio', 'isActive', 'isGraduated',
                    'left_at', 'profilePhoto', 'roles', 'created_at', 'updated_at'
                ]
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            return await this.userRepository.findOne({
                where: { email },
                select: [
                    'id', 'email', 'name', 'phone', 'location', 'profession',
                    'graduation_year', 'batch', 'bio', 'isActive', 'isGraduated',
                    'left_at', 'profilePhoto', 'roles', 'created_at', 'updated_at'
                ]
            });
        } catch (error) {
            console.error('Get user by email error:', error);
            throw error;
        }
    }

    async searchUsers(query, limit = 10) {
        try {
            const queryBuilder = this.userRepository.createQueryBuilder('user');

            queryBuilder
                .select([
                    'user.id', 'user.email', 'user.name', 'user.profession',
                    'user.batch', 'user.profilePhoto', 'user.roles'
                ])
                .where('user.name ILIKE :query OR user.email ILIKE :query OR user.profession ILIKE :query OR user.batch ILIKE :query',
                    { query: `%${query}%` })
                .andWhere('user.isActive = :isActive', { isActive: true }) // Only show active users in search
                .limit(limit);

            return await queryBuilder.getMany();
        } catch (error) {
            console.error('Search users error:', error);
            throw error;
        }
    }

    async getUserStats() {
        try {
            const queryBuilder = this.userRepository.createQueryBuilder('user');

            // Get total count
            const total = await this.userRepository.count();

            // Count by roles using JSON operations
            const roleStats = await queryBuilder
                .select([
                    'COUNT(CASE WHEN user.roles::jsonb ? \'admin\' THEN 1 END) as admin_count',
                    'COUNT(CASE WHEN user.roles::jsonb ? \'moderator\' THEN 1 END) as moderator_count',
                    'COUNT(CASE WHEN user.roles::jsonb ? \'user\' THEN 1 END) as user_count'
                ])
                .getRawOne();

            // Count by provider
            const providerStats = await this.userRepository
                .createQueryBuilder('user')
                .select([
                    'COUNT(CASE WHEN user.provider = \'email\' THEN 1 END) as email_count',
                    'COUNT(CASE WHEN user.provider = \'google\' THEN 1 END) as google_count',
                    'COUNT(CASE WHEN user.provider = \'facebook\' THEN 1 END) as facebook_count'
                ])
                .getRawOne();

            // Recent users (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentUsers = await this.userRepository
                .createQueryBuilder('user')
                .where('user.created_at >= :date', { date: thirtyDaysAgo })
                .getCount();

            return {
                total,
                byRole: {
                    admin: parseInt(roleStats.admin_count) || 0,
                    moderator: parseInt(roleStats.moderator_count) || 0,
                    user: parseInt(roleStats.user_count) || 0
                },
                byProvider: {
                    email: parseInt(providerStats.email_count) || 0,
                    google: parseInt(providerStats.google_count) || 0,
                    facebook: parseInt(providerStats.facebook_count) || 0
                },
                recentUsers
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            throw error;
        }
    }

    async updateUser(id, updateData) {
        try {
            const user = await this.userRepository.findOne({ where: { id } });

            if (!user) {
                throw new Error('User not found');
            }

            // Expanded allowed fields to include new properties
            const allowedFields = [
                'name', 'phone', 'location', 'profession', 'graduation_year',
                'batch', 'bio', 'isActive', 'isGraduated', 'left_at', 'profilePhoto'
            ];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = this.validateAndSanitizeField(field, updateData[field]);
                }
            });

            // Special handling for isGraduated and left_at logic
            if (updateData.isGraduated !== undefined) {
                filteredData.isGraduated = Boolean(updateData.isGraduated);

                // If user is graduated, clear left_at year
                if (filteredData.isGraduated) {
                    filteredData.left_at = null;
                }
            }

            // Validate left_at only if user is not graduated
            if (updateData.left_at !== undefined && !filteredData.isGraduated && user.isGraduated === false) {
                filteredData.left_at = validateLeftAtYear(updateData.left_at);
            }

            Object.assign(user, filteredData);
            const updatedUser = await this.userRepository.save(user);

            const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = updatedUser;
            return userWithoutSensitiveData;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    async updateCurrentUser(userEmail, updateData) {
        try {
            const user = await this.userRepository.findOne({
                where: { email: userEmail }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Users can update their own profile information (excluding admin flags)
            const allowedFields = [
                'name', 'phone', 'location', 'profession', 'graduation_year',
                'batch', 'bio', 'isGraduated', 'left_at', 'profilePhoto'
            ];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = this.validateAndSanitizeField(field, updateData[field]);
                }
            });

            // Special handling for isGraduated and left_at logic
            if (updateData.isGraduated !== undefined) {
                filteredData.isGraduated = Boolean(updateData.isGraduated);

                // If user is graduated, clear left_at year
                if (filteredData.isGraduated) {
                    filteredData.left_at = null;
                }
            }

            // Validate left_at only if user is not graduated
            if (updateData.left_at !== undefined && !filteredData.isGraduated && user.isGraduated === false) {
                filteredData.left_at = validateLeftAtYear(updateData.left_at);
            }

            Object.assign(user, filteredData);
            const updatedUser = await this.userRepository.save(user);

            const { password, googleId, facebookId, provider, ...userWithoutSensitiveData } = updatedUser;
            return userWithoutSensitiveData;
        } catch (error) {
            console.error('Update current user error:', error);
            throw error;
        }
    }

    // Helper method to validate and sanitize individual fields
    validateAndSanitizeField(field, value) {
        switch (field) {
            case 'name':
                return sanitizeName(value);
            case 'phone':
                return validatePhone(value);
            case 'location':
                return validateLocation(value);
            case 'profession':
                return validateProfession(value);
            case 'graduation_year':
                return validateGraduationYear(value);
            case 'batch':
                return validateBatch(value);
            case 'bio':
                return validateBio(value);
            case 'left_at':
                return validateLeftAtYear(value);
            case 'profilePhoto':
                const validatedPhoto = validateProfilePhoto(value);
                // Mark as manually set if updating photo
                if (validatedPhoto !== value) {
                    return { profilePhoto: validatedPhoto, profilePhotoSource: 'manual' };
                }
                return validatedPhoto;
            case 'isActive':
                return Boolean(value);
            case 'isGraduated':
                return Boolean(value);
            default:
                return value;
        }
    }

    async bulkUpdateUsers(userIds, updateData) {
        try {
            const allowedFields = ['name', 'profilePhoto'];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            const result = await this.userRepository.update(
                { id: In(userIds) },
                filteredData
            );

            return {
                affected: result.affected,
                userIds
            };
        } catch (error) {
            console.error('Bulk update users error:', error);
            throw error;
        }
    }

    async bulkDeleteUsers(userIds) {
        try {
            const result = await this.userRepository.delete({ id: In(userIds) });
            return {
                affected: result.affected,
                deletedIds: userIds
            };
        } catch (error) {
            console.error('Bulk delete users error:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const result = await this.userRepository.delete(id);
            return result.affected > 0;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }
}

export { UsersService };