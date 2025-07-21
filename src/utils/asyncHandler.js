import { ResponseHandler } from './responseHandler.js';

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error('Async handler error:', error);
            ResponseHandler.serverError(res, error);
        });
    };
};