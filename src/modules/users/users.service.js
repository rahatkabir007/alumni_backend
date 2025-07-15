import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";
import { Like, In } from "typeorm";

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

            // Select specific fields
            queryBuilder.select([
                'user.id',
                'user.email',
                'user.name',
                'user.profilePhoto',
                'user.roles',
                'user.created_at',
                'user.updated_at'
            ]);

            // Apply search filter
            if (search && search.trim() !== '') {
                queryBuilder.andWhere(
                    '(user.name ILIKE :search OR user.email ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Apply role filter
            if (role !== 'all' && role.trim() !== '') {
                // Use JSON contains operator for PostgreSQL
                queryBuilder.andWhere(
                    'user.roles::jsonb ? :role',
                    { role: role }
                );
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
            'id': 'id'
        };

        return fieldMapping[sortBy] || 'created_at';
    }

    async getUserById(id) {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: ['id', 'email', 'name', 'profilePhoto', 'roles', 'created_at', 'updated_at']
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
                select: ['id', 'email', 'name', 'profilePhoto', 'roles', 'created_at', 'updated_at']
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
                .select(['user.id', 'user.email', 'user.name', 'user.profilePhoto', 'user.roles'])
                .where('user.name ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
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

            // Don't allow updating password or sensitive fields through this method
            const allowedFields = ['name', 'profilePhoto'];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

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

            // Allow users to update their own profile information
            const allowedFields = ['name', 'profilePhoto'];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            // Validate profilePhoto URL format if provided
            if (filteredData.profilePhoto !== undefined) {
                if (filteredData.profilePhoto && !this.isValidUrl(filteredData.profilePhoto)) {
                    throw new Error('Invalid profile photo URL format');
                }
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

    // Helper method to validate URL format
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
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