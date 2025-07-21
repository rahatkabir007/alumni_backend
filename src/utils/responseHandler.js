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

        return res.status(statusCode).json({
            success: false,
            error: message,
            message: isDevelopment ? error.message : message,
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
}

export { ResponseHandler };