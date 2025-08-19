import { ResponseHandler } from './responseHandler.js';

/**
 * Wraps async route handlers to catch errors and pass them to error middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error('Async handler error:', error);
            ResponseHandler.serverError(res, error);
        });
    };
};