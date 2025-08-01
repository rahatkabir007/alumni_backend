import { logger } from "../utils/logger.js";
import { UserValidationError } from "../validations/userValidation.js";

function errorMiddleware(err, req, res, next) {
    logger.error('Error occurred:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }

    if (err instanceof UserValidationError) {
        return res.status(400).json({
            success: false,
            error: `Validation failed for ${err.field}: ${err.message}`,
            field: err.field
        });
    }

    if (err.name === 'QueryFailedError') {
        return res.status(500).json({ error: 'Database error occurred' });
    }

    res.status(500).json({ error: 'Internal server error' });
}

export { errorMiddleware };
