import { logger } from "../utils/logger.js";

function errorMiddleware(err, req, res, next) {
    logger.error('Error occurred:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }

    if (err.name === 'QueryFailedError') {
        return res.status(500).json({ error: 'Database error occurred' });
    }

    res.status(500).json({ error: 'Internal server error' });
}

export { errorMiddleware };
