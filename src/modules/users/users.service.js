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

            if (alumni_type && alumni_type.trim()) {
                queryBuilder.andWhere('user.alumni_type  ILIKE :alumni_type', { alumni_type: alumni_type.trim() });
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
                selectFields.push('additional_information');
            }

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

            // Handle base user fields
            const validatedData = {};

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
            if (updateData.joinedYear !== undefined) {
                const joinedYear = parseInt(updateData.joinedYear);
                if (!isNaN(joinedYear) && joinedYear >= 1998 && joinedYear <= new Date().getFullYear() + 10) {
                    validatedData.joinedYear = joinedYear;
                } else {
                    throw new Error('Invalid joined year');
                }
            }

            if (updateData.blood_group !== undefined) {
                if (['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(updateData.blood_group) || updateData.blood_group === "") {
                    validatedData.blood_group = updateData.blood_group;
                } else {
                    throw new Error('Invalid blood group');
                }
            }

            if (updateData.branch !== undefined) {
                if (['Jamalkhan', 'Patiya'].includes(updateData.branch)) {
                    validatedData.branch = updateData.branch;
                } else {
                    throw new Error('Invalid branch');
                }
            }

            if (updateData.alumni_type !== undefined) {
                if (['student', 'teacher', 'management'].includes(updateData.alumni_type)) {
                    validatedData.alumni_type = updateData.alumni_type;
                } else {
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
                validatedData.additional_information = this.validateAdditionalInformation(
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

            // Validate and merge additional information
            const validatedInfo = this.validateAdditionalInformation(additionalInfo, user.alumni_type);

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

    validateAdditionalInformation(additionalInfo, alumniType) {
        if (!additionalInfo || typeof additionalInfo !== 'object') {
            return {};
        }

        const validated = {};

        // Common fields for all alumni types
        if (additionalInfo.achievements && Array.isArray(additionalInfo.achievements)) {
            validated.achievements = additionalInfo.achievements
                .filter(achievement => typeof achievement === 'string' && achievement.trim().length > 0)
                .map(achievement => achievement.trim())
                .slice(0, 50); // Limit to 50 achievements
        }

        if (additionalInfo.education && Array.isArray(additionalInfo.education)) {
            validated.education = additionalInfo.education
                .filter(edu => edu && typeof edu === 'object')
                .map(edu => ({
                    degree: edu.degree ? String(edu.degree).trim().substring(0, 200) : '',
                    institution: edu.institution ? String(edu.institution).trim().substring(0, 200) : '',
                    year: this.validateYear(edu.year),
                    grade: edu.grade ? String(edu.grade).trim().substring(0, 50) : ''
                }))
                .slice(0, 20); // Limit to 20 education records
        }

        if (additionalInfo.experience && Array.isArray(additionalInfo.experience)) {
            validated.experience = additionalInfo.experience
                .filter(exp => exp && typeof exp === 'object')
                .map(exp => ({
                    position: exp.position ? String(exp.position).trim().substring(0, 200) : '',
                    organization: exp.organization ? String(exp.organization).trim().substring(0, 200) : '',
                    institution: exp.institution ? String(exp.institution).trim().substring(0, 200) : '',
                    period: exp.period ? String(exp.period).trim().substring(0, 100) : '',
                    description: exp.description ? String(exp.description).trim().substring(0, 1000) : ''
                }))
                .slice(0, 20); // Limit to 20 experience records
        }

        // Student-specific fields
        if (alumniType === 'student') {
            if (additionalInfo.class) {
                validated.class = String(additionalInfo.class).trim().substring(0, 10);
            }

            if (additionalInfo.currentPosition) {
                validated.currentPosition = String(additionalInfo.currentPosition).trim().substring(0, 200);
            }

            if (additionalInfo.organization) {
                validated.organization = String(additionalInfo.organization).trim().substring(0, 200);
            }

            if (additionalInfo.joinedYear) {
                validated.joinedYear = this.validateYear(additionalInfo.joinedYear);
            }

            if (additionalInfo.graduatedYear) {
                validated.graduatedYear = this.validateYear(additionalInfo.graduatedYear);
            }

            if (additionalInfo.quotes) {
                validated.quotes = String(additionalInfo.quotes).trim().substring(0, 2000);
            }

            if (additionalInfo.socialMedia && typeof additionalInfo.socialMedia === 'object') {
                validated.socialMedia = this.validateSocialMedia(additionalInfo.socialMedia);
            }

            if (additionalInfo.socialContributions && Array.isArray(additionalInfo.socialContributions)) {
                validated.socialContributions = additionalInfo.socialContributions
                    .filter(contrib => typeof contrib === 'string' && contrib.trim().length > 0)
                    .map(contrib => contrib.trim().substring(0, 500))
                    .slice(0, 20);
            }
        }

        // Teacher/Management-specific fields
        if (alumniType === 'teacher' || alumniType === 'management') {
            if (additionalInfo.designation) {
                validated.designation = String(additionalInfo.designation).trim().substring(0, 100);
            }

            if (additionalInfo.department) {
                validated.department = String(additionalInfo.department).trim().substring(0, 100);
            }

            if (additionalInfo.period) {
                validated.period = String(additionalInfo.period).trim().substring(0, 50);
            }

            if (additionalInfo.subject) {
                validated.subject = String(additionalInfo.subject).trim().substring(0, 100);
            }

            if (additionalInfo.specialization) {
                validated.specialization = String(additionalInfo.specialization).trim().substring(0, 200);
            }

            if (additionalInfo.quote) {
                validated.quote = String(additionalInfo.quote).trim().substring(0, 2000);
            }

            if (additionalInfo.officeHours) {
                validated.officeHours = String(additionalInfo.officeHours).trim().substring(0, 100);
            }

            if (additionalInfo.publications && Array.isArray(additionalInfo.publications)) {
                validated.publications = additionalInfo.publications
                    .filter(pub => pub && typeof pub === 'object')
                    .map(pub => ({
                        title: pub.title ? String(pub.title).trim().substring(0, 300) : '',
                        year: this.validateYear(pub.year),
                        publisher: pub.publisher ? String(pub.publisher).trim().substring(0, 200) : ''
                    }))
                    .slice(0, 50);
            }

            if (additionalInfo.studentsFeedback && Array.isArray(additionalInfo.studentsFeedback)) {
                validated.studentsFeedback = additionalInfo.studentsFeedback
                    .filter(feedback => feedback && typeof feedback === 'object')
                    .map(feedback => ({
                        name: feedback.name ? String(feedback.name).trim().substring(0, 100) : '',
                        batch: feedback.batch ? String(feedback.batch).trim().substring(0, 50) : '',
                        feedback: feedback.feedback ? String(feedback.feedback).trim().substring(0, 1000) : ''
                    }))
                    .slice(0, 100);
            }
        }

        return validated;
    }

    validateYear(year) {
        if (!year) return null;
        const numYear = parseInt(year);
        if (isNaN(numYear) || numYear < 1950 || numYear > new Date().getFullYear() + 10) {
            return null;
        }
        return numYear;
    }

    validateSocialMedia(socialMedia) {
        if (!socialMedia || typeof socialMedia !== 'object') {
            return {};
        }

        const validated = {};
        const allowedPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram'];

        for (const [platform, url] of Object.entries(socialMedia)) {
            if (allowedPlatforms.includes(platform) && url && typeof url === 'string') {
                if (url.length <= 500 && this.isValidUrl(url)) {
                    validated[platform] = url;
                }
            }
        }

        return validated;
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
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