import { UserValidationError } from '../validations/userValidation.js';

class ResponseHandler {
    static success(res, data = null, message = 'Operation successful', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    static error(res, error, message = 'Operation failed', statusCode = 400) {
        const isDevelopment = process.env.NODE_ENV === 'development';

        // Handle UserValidationError specifically
        if (error instanceof UserValidationError) {
            return res.status(400).json({
                success: false,
                error: `Validation failed for ${error.field}: ${error.message}`,
                message: error.message,
                field: error.field,
                ...(isDevelopment && { stack: error.stack })
            });
        }

        return res.status(statusCode).json({
            success: false,
            error: message,
            message: error.message || message,
            ...(isDevelopment && { stack: error.stack })
        });
    }

    static created(res, data, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    static unauthorized(res, message = 'Unauthorized access') {
        return res.status(401).json({
            success: false,
            error: message
        });
    }

    static notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            error: message
        });
    }

    static serverError(res, error, message = 'Internal server error') {
        return this.error(res, error, message, 500);
    }

    static forbidden(res, message = 'Forbidden') {
        return res.status(403).json({
            success: false,
            message,
            error: 'Forbidden'
        });
    }

}

export { ResponseHandler };