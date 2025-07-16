/**
 * Validation helper functions for user data
 */

/**
 * Sanitize and validate user names
 * @param {string} name - The name to sanitize
 * @returns {string} - Sanitized name
 * @throws {Error} - If validation fails
 */
export const sanitizeName = (name) => {
    if (!name || typeof name !== 'string') {
        throw new Error('Name must be a non-empty string');
    }

    // Remove extra whitespace and limit length
    const sanitized = name.replace(/\s+/g, ' ').trim();

    if (sanitized.length === 0) {
        throw new Error('Name cannot be empty');
    }

    if (sanitized.length > 100) {
        throw new Error('Name cannot exceed 100 characters');
    }

    // Check for potentially harmful characters (basic XSS prevention)
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
        throw new Error('Name contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate profile photo URLs
 * @param {string} photoUrl - The URL to validate
 * @returns {string} - Validated URL or empty string
 * @throws {Error} - If validation fails
 */
export const validateProfilePhoto = (photoUrl) => {
    if (!photoUrl) {
        return ''; // Allow empty string
    }

    if (typeof photoUrl !== 'string') {
        throw new Error('Profile photo must be a valid URL string');
    }

    // Validate URL format
    if (!isValidUrl(photoUrl)) {
        throw new Error('Invalid profile photo URL format');
    }

    // Check URL length
    if (photoUrl.length > 500) {
        throw new Error('Profile photo URL cannot exceed 500 characters');
    }

    return photoUrl;
};

/**
 * Validate URL format
 * @param {string} string - The URL string to validate
 * @returns {boolean} - True if valid URL
 */
export const isValidUrl = (string) => {
    try {
        const url = new URL(string);
        // Only allow http and https protocols
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};
