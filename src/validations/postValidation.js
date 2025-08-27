export class PostValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = 'PostValidationError';
    }
}

export class PostValidator {
    static validateTitle(title, isRequired = false) {
        if (!title || (typeof title === 'string' && title.trim() === '')) {
            if (isRequired) {
                throw new PostValidationError('title', 'Title is required');
            }
            return null;
        }

        if (typeof title !== 'string') {
            throw new PostValidationError('title', 'Title must be a string');
        }

        const sanitized = title.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 255) {
            throw new PostValidationError('title', 'Title cannot exceed 255 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new PostValidationError('title', 'Title contains invalid characters');
        }

        return sanitized;
    }

    static validateBody(body, isRequired = true) {
        if (!body || (typeof body === 'string' && body.trim() === '')) {
            if (isRequired) {
                throw new PostValidationError('body', 'Post body is required');
            }
            return '';
        }

        if (typeof body !== 'string') {
            throw new PostValidationError('body', 'Post body must be a string');
        }

        const sanitized = body.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 10000) {
            throw new PostValidationError('body', 'Post body cannot exceed 10000 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new PostValidationError('body', 'Post body contains invalid characters');
        }

        return sanitized;
    }

    static validateImages(images, isRequired = false) {
        if (!images) {
            if (isRequired) {
                throw new PostValidationError('images', 'Images are required');
            }
            return [];
        }

        if (!Array.isArray(images)) {
            throw new PostValidationError('images', 'Images must be an array');
        }

        if (images.length > 10) {
            throw new PostValidationError('images', 'Cannot have more than 10 images per post');
        }

        const validImages = [];
        for (const image of images) {
            if (typeof image === 'string' && image.trim()) {
                const trimmed = image.trim();
                if (trimmed.length <= 500 && this.isValidUrl(trimmed)) {
                    validImages.push(trimmed);
                }
            }
        }

        return validImages;
    }

    static validateTags(tags) {
        if (!tags || !Array.isArray(tags)) {
            return [];
        }

        if (tags.length > 20) {
            throw new PostValidationError('tags', 'Cannot have more than 20 tags per post');
        }

        const validTags = [];
        for (const tag of tags) {
            if (typeof tag === 'string' && tag.trim()) {
                const sanitized = tag.trim().toLowerCase();
                if (sanitized.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(sanitized)) {
                    validTags.push(sanitized);
                }
            }
        }

        return [...new Set(validTags)]; // Remove duplicates
    }

    static validateVisibility(visibility) {
        const validVisibilities = ['public', 'private', 'alumni_only'];
        if (!validVisibilities.includes(visibility)) {
            return 'public'; // Default visibility
        }
        return visibility;
    }

    static validateStatus(status, isRequired = false) {
        if (!status || (typeof status === 'string' && status.trim() === '')) {
            if (isRequired) {
                throw new PostValidationError('status', 'Status is required');
            }
            return 'pending_approval'; // Default status
        }

        const validStatuses = ['active', 'inactive', 'pending_approval', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new PostValidationError('status', `Status must be one of: ${validStatuses.join(', ')}`);
        }

        return status;
    }

    static validateUserId(userId, isRequired = true) {
        if (!userId && userId !== 0) {
            if (isRequired) {
                throw new PostValidationError('userId', 'User ID is required');
            }
            return null;
        }

        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum) || userIdNum <= 0) {
            throw new PostValidationError('userId', 'User ID must be a valid positive number');
        }

        return userIdNum;
    }

    static validateSortBy(sortBy) {
        const allowedSortFields = ['createdAt', 'updatedAt', 'published_at', 'like_count', 'comment_count', 'title'];

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

    static validatePostCreation(postData, userId) {
        const validatedData = {};

        // Validate required fields
        validatedData.userId = this.validateUserId(userId);
        validatedData.body = this.validateBody(postData.body);

        // Validate optional fields
        validatedData.title = this.validateTitle(postData.title);
        validatedData.images = this.validateImages(postData.images);
        validatedData.tags = this.validateTags(postData.tags);
        validatedData.visibility = this.validateVisibility(postData.visibility || 'public');
        validatedData.status = 'pending_approval'; // Always default for new posts

        return validatedData;
    }

    static validatePostUpdate(updateData, isAdmin = false) {
        const validatedData = {};

        // Validate title if provided
        if (updateData.title !== undefined) {
            validatedData.title = this.validateTitle(updateData.title);
        }

        // Validate body if provided
        if (updateData.body !== undefined) {
            validatedData.body = this.validateBody(updateData.body);
        }

        // Validate images if provided
        if (updateData.images !== undefined) {
            validatedData.images = this.validateImages(updateData.images);
        }

        // Validate tags if provided
        if (updateData.tags !== undefined) {
            validatedData.tags = this.validateTags(updateData.tags);
        }

        // Validate visibility if provided
        if (updateData.visibility !== undefined) {
            validatedData.visibility = this.validateVisibility(updateData.visibility);
        }

        // Only admin/moderator can update status
        if (updateData.status !== undefined && isAdmin) {
            validatedData.status = this.validateStatus(updateData.status);

            // Set published_at when status changes to active
            if (validatedData.status === 'active') {
                validatedData.published_at = new Date();
            }
        }

        return validatedData;
    }

    static validateQueryParams(queryParams = {}) {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            status = '',
            userId = '',
            visibility = '',
            tag = '',
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
                validated.status = '';
            }
        }

        // Validate userId filter
        if (userId) {
            try {
                if (typeof userId === 'string' && userId.trim()) {
                    validated.userId = this.validateUserId(userId.trim(), false);
                } else if (typeof userId === 'number' || !isNaN(parseInt(userId))) {
                    validated.userId = this.validateUserId(userId, false);
                }
            } catch (error) {
                validated.userId = null;
            }
        }

        // Validate visibility filter
        if (visibility && visibility.trim()) {
            validated.visibility = this.validateVisibility(visibility.trim());
        }

        // Validate tag filter
        if (tag && tag.trim()) {
            validated.tag = tag.trim().toLowerCase();
        }

        return validated;
    }
}
