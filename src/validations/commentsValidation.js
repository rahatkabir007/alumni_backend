export class CommentsValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = 'CommentsValidationError';
    }
}

export class CommentsValidator {
    static validateContent(content, maxLength = 1000, isRequired = true) {
        if (!content || (typeof content === 'string' && content.trim() === '')) {
            if (isRequired) {
                throw new CommentsValidationError('content', 'Content is required');
            }
            return '';
        }

        if (typeof content !== 'string') {
            throw new CommentsValidationError('content', 'Content must be a string');
        }

        const trimmed = content.trim();

        if (trimmed.length > maxLength) {
            throw new CommentsValidationError('content', `Content cannot exceed ${maxLength} characters`);
        }

        if (/<script|javascript:|on\w+=/i.test(trimmed)) {
            throw new CommentsValidationError('content', 'Content contains invalid characters');
        }

        return trimmed;
    }

    static validateCommentableType(type) {
        const validTypes = ['gallery', 'blog'];
        if (!validTypes.includes(type)) {
            throw new CommentsValidationError('commentable_type', `Type must be one of: ${validTypes.join(', ')}`);
        }
        return type;
    }

    static validateId(id, fieldName = 'id') {
        const numId = parseInt(id);
        if (isNaN(numId) || numId <= 0) {
            throw new CommentsValidationError(fieldName, `${fieldName} must be a valid positive number`);
        }
        return numId;
    }

    static validateLikeableType(type) {
        const validTypes = ['gallery', 'blog', 'comment', 'reply'];
        if (!validTypes.includes(type)) {
            throw new CommentsValidationError('likeable_type', `Type must be one of: ${validTypes.join(', ')}`);
        }
        return type;
    }

    static validatePagination(queryParams) {
        const page = Math.max(1, parseInt(queryParams.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 20));
        const sortOrder = ['ASC', 'DESC'].includes(queryParams.sortOrder?.toUpperCase())
            ? queryParams.sortOrder.toUpperCase()
            : 'ASC';
        const maxDepth = Math.min(10, Math.max(1, parseInt(queryParams.maxDepth) || 3));

        return {
            page,
            limit,
            offset: (page - 1) * limit,
            sortOrder,
            maxDepth,
            includeReplies: queryParams.includeReplies !== 'false'
        };
    }
}
