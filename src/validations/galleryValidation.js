/**
 * Comprehensive gallery validation utility
 */

export class GalleryValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = 'GalleryValidationError';
    }
}

export class GalleryValidator {
    static validateImage(image, isRequired = true) {
        if (!image || (typeof image === 'string' && image.trim() === '')) {
            if (isRequired) {
                throw new GalleryValidationError('image', 'Image URL is required');
            }
            return '';
        }

        if (typeof image !== 'string') {
            throw new GalleryValidationError('image', 'Image URL must be a string');
        }

        const trimmed = image.trim();

        if (trimmed.length > 500) {
            throw new GalleryValidationError('image', 'Image URL cannot exceed 500 characters');
        }

        if (!this.isValidUrl(trimmed)) {
            throw new GalleryValidationError('image', 'Image must be a valid URL');
        }

        return trimmed;
    }

    static validateYear(year, isRequired = true) {
        if (!year && year !== 0) {
            if (isRequired) {
                throw new GalleryValidationError('year', 'Year is required');
            }
            return null;
        }

        const yearNum = parseInt(year);
        if (isNaN(yearNum)) {
            throw new GalleryValidationError('year', 'Year must be a valid number');
        }

        const currentYear = new Date().getFullYear();
        const minYear = 1998;

        if (yearNum < minYear || yearNum > currentYear + 1) {
            throw new GalleryValidationError('year', `Year must be between ${minYear} and ${currentYear + 1}`);
        }

        return yearNum;
    }

    static validateTitle(title, isRequired = false) {
        if (!title || (typeof title === 'string' && title.trim() === '')) {
            if (isRequired) {
                throw new GalleryValidationError('title', 'Title is required');
            }
            return null;
        }

        if (typeof title !== 'string') {
            throw new GalleryValidationError('title', 'Title must be a string');
        }

        const sanitized = title.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 255) {
            throw new GalleryValidationError('title', 'Title cannot exceed 255 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new GalleryValidationError('title', 'Title contains invalid characters');
        }

        return sanitized;
    }

    static validateDescription(description, isRequired = false) {
        if (!description || (typeof description === 'string' && description.trim() === '')) {
            if (isRequired) {
                throw new GalleryValidationError('description', 'Description is required');
            }
            return null;
        }

        if (typeof description !== 'string') {
            throw new GalleryValidationError('description', 'Description must be a string');
        }

        const sanitized = description.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 2000) {
            throw new GalleryValidationError('description', 'Description cannot exceed 2000 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new GalleryValidationError('description', 'Description contains invalid characters');
        }

        return sanitized;
    }

    static validateStatus(status, isRequired = false) {
        if (!status || (typeof status === 'string' && status.trim() === '')) {
            if (isRequired) {
                throw new GalleryValidationError('status', 'Status is required');
            }
            return 'pending_approval'; // Default status
        }

        const validStatuses = ['active', 'inactive', 'pending_approval'];
        if (!validStatuses.includes(status)) {
            throw new GalleryValidationError('status', `Status must be one of: ${validStatuses.join(', ')}`);
        }

        return status;
    }

    static validateUserId(userId, isRequired = true) {
        if (!userId && userId !== 0) {
            if (isRequired) {
                throw new GalleryValidationError('userId', 'User ID is required');
            }
            return null;
        }

        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum) || userIdNum <= 0) {
            throw new GalleryValidationError('userId', 'User ID must be a valid positive number');
        }

        return userIdNum;
    }

    static validateSortBy(sortBy) {
        const allowedSortFields = ['createdAt', 'updatedAt', 'year', 'like_count', 'comment_count', 'title'];

        if (!sortBy || !allowedSortFields.includes(sortBy)) {
            return 'createdAt'; // Default sort field
        }

        return sortBy;
    }

    static validateSortOrder(sortOrder) {
        const validOrders = ['ASC', 'DESC'];
        const upperOrder = sortOrder ? sortOrder.toUpperCase() : 'DESC';

        if (!validOrders.includes(upperOrder)) {
            return 'DESC'; // Default sort order
        }

        return upperOrder;
    }

    static validatePagination(page, limit) {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

        return {
            page: pageNum,
            limit: limitNum,
            offset: (pageNum - 1) * limitNum
        };
    }

    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    /**
     * Validate gallery creation data
     * @param {Object} galleryData - The gallery data to validate
     * @param {number} userId - The user ID creating the gallery
     * @returns {Object} - Validated gallery data
     */
    static validateGalleryCreation(galleryData, userId) {
        const validatedData = {};

        // Validate required fields
        validatedData.userId = this.validateUserId(userId);
        validatedData.image = this.validateImage(galleryData.image);
        validatedData.year = this.validateYear(galleryData.year);

        // Validate optional fields
        validatedData.title = this.validateTitle(galleryData.title);
        validatedData.description = this.validateDescription(galleryData.description);
        validatedData.status = 'pending_approval'; // Always default for new galleries

        return validatedData;
    }

    /**
     * Validate gallery update data
     * @param {Object} updateData - The data to update
     * @param {boolean} isAdmin - Whether the user is admin/moderator
     * @returns {Object} - Validated update data
     */
    static validateGalleryUpdate(updateData, isAdmin = false) {
        const validatedData = {};

        // Validate title if provided
        if (updateData.title !== undefined) {
            validatedData.title = this.validateTitle(updateData.title);
        }

        // Validate description if provided
        if (updateData.description !== undefined) {
            validatedData.description = this.validateDescription(updateData.description);
        }

        // Validate year if provided
        if (updateData.year !== undefined) {
            validatedData.year = this.validateYear(updateData.year);
        }

        // Validate image if provided
        if (updateData.image !== undefined) {
            validatedData.image = this.validateImage(updateData.image);
        }

        // Only admin/moderator can update status
        if (updateData.status !== undefined && isAdmin) {
            validatedData.status = this.validateStatus(updateData.status);
        }

        return validatedData;
    }

    /**
     * Validate query parameters for gallery filtering
     * @param {Object} queryParams - Query parameters
     * @returns {Object} - Validated query parameters
     */
    static validateQueryParams(queryParams = {}) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            status = '',
            year = '',
            userId = '',
            includeUser = false
        } = queryParams;

        const pagination = this.validatePagination(page, limit);
        const validSortBy = this.validateSortBy(sortBy);
        const validSortOrder = this.validateSortOrder(sortOrder);

        const validated = {
            ...pagination,
            sortBy: validSortBy,
            sortOrder: validSortOrder,
            includeUser: includeUser === 'true' || includeUser === true
        };

        // Validate status filter
        if (status && status.trim()) {
            try {
                validated.status = this.validateStatus(status.trim(), false);
            } catch (error) {
                // Ignore invalid status filters
                validated.status = '';
            }
        }

        // Validate year filter
        if (year && typeof year === 'string' && year.trim()) {
            try {
                validated.year = this.validateYear(year.trim(), false);
            } catch (error) {
                // Ignore invalid year filters
                validated.year = null;
            }
        } else if (year && typeof year === 'number') {
            try {
                validated.year = this.validateYear(year, false);
            } catch (error) {
                validated.year = null;
            }
        }

        // Validate userId filter - handle both string and number types
        if (userId) {
            try {
                if (typeof userId === 'string' && userId.trim()) {
                    validated.userId = this.validateUserId(userId.trim(), false);
                } else if (typeof userId === 'number' || !isNaN(parseInt(userId))) {
                    validated.userId = this.validateUserId(userId, false);
                }
            } catch (error) {
                // Ignore invalid userId filters
                validated.userId = null;
            }
        }

        return validated;
    }
}
