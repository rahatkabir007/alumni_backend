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
 * Validate phone number
 * @param {string} phone - The phone number to validate
 * @returns {string} - Validated phone or empty string
 * @throws {Error} - If validation fails
 */
export const validatePhone = (phone) => {
    if (!phone) {
        return ''; // Allow empty string
    }

    if (typeof phone !== 'string') {
        throw new Error('Phone must be a string');
    }

    const sanitized = phone.trim();

    if (sanitized.length > 20) {
        throw new Error('Phone number cannot exceed 20 characters');
    }

    // Basic phone validation (digits, spaces, dashes, parentheses, plus)
    if (!/^[\d\s\-\(\)\+]+$/.test(sanitized)) {
        throw new Error('Phone number contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate location/address
 * @param {string} location - The location to validate
 * @returns {string} - Validated location or empty string
 * @throws {Error} - If validation fails
 */
export const validateLocation = (location) => {
    if (!location) {
        return ''; // Allow empty string
    }

    if (typeof location !== 'string') {
        throw new Error('Location must be a string');
    }

    const sanitized = location.replace(/\s+/g, ' ').trim();

    if (sanitized.length > 500) {
        throw new Error('Location cannot exceed 500 characters');
    }

    // Check for potentially harmful characters
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
        throw new Error('Location contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate profession
 * @param {string} profession - The profession to validate
 * @returns {string} - Validated profession or empty string
 * @throws {Error} - If validation fails
 */
export const validateProfession = (profession) => {
    if (!profession) {
        return ''; // Allow empty string
    }

    if (typeof profession !== 'string') {
        throw new Error('Profession must be a string');
    }

    const sanitized = profession.replace(/\s+/g, ' ').trim();

    if (sanitized.length > 255) {
        throw new Error('Profession cannot exceed 255 characters');
    }

    // Check for potentially harmful characters
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
        throw new Error('Profession contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate graduation year
 * @param {number|string} year - The year to validate
 * @returns {number|null} - Validated year or null
 * @throws {Error} - If validation fails
 */
export const validateGraduationYear = (year) => {
    if (year === null || year === undefined || year === '') {
        return null; // Allow null/empty
    }

    const numYear = parseInt(year);

    if (isNaN(numYear)) {
        throw new Error('Graduation year must be a valid number');
    }

    const currentYear = new Date().getFullYear();
    const minYear = 1950; // Reasonable minimum year

    if (numYear < minYear || numYear > currentYear + 10) {
        throw new Error(`Graduation year must be between ${minYear} and ${currentYear + 10}`);
    }

    return numYear;
};

/**
 * Validate batch/class
 * @param {string} batch - The batch to validate
 * @returns {string} - Validated batch or empty string
 * @throws {Error} - If validation fails
 */
export const validateBatch = (batch) => {
    if (!batch) {
        return ''; // Allow empty string
    }

    if (typeof batch !== 'string') {
        throw new Error('Batch must be a string');
    }

    const sanitized = batch.replace(/\s+/g, ' ').trim();

    if (sanitized.length > 100) {
        throw new Error('Batch cannot exceed 100 characters');
    }

    // Check for potentially harmful characters
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
        throw new Error('Batch contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate bio/description
 * @param {string} bio - The bio to validate
 * @returns {string} - Validated bio or empty string
 * @throws {Error} - If validation fails
 */
export const validateBio = (bio) => {
    if (!bio) {
        return ''; // Allow empty string
    }

    if (typeof bio !== 'string') {
        throw new Error('Bio must be a string');
    }

    const sanitized = bio.replace(/\s+/g, ' ').trim();

    if (sanitized.length > 2000) {
        throw new Error('Bio cannot exceed 2000 characters');
    }

    // Check for potentially harmful characters (basic XSS prevention)
    if (/<script|javascript:|on\w+=/i.test(sanitized)) {
        throw new Error('Bio contains invalid characters');
    }

    return sanitized;
};

/**
 * Validate left_at year (when user left school)
 * @param {number|string} year - The year to validate
 * @returns {number|null} - Validated year or null
 * @throws {Error} - If validation fails
 */
export const validateLeftAtYear = (year) => {
    if (year === null || year === undefined || year === '') {
        return null; // Allow null/empty
    }

    const numYear = parseInt(year);

    if (isNaN(numYear)) {
        throw new Error('Left at year must be a valid number');
    }

    const currentYear = new Date().getFullYear();
    const minYear = 1998; // Reasonable minimum year

    if (numYear < minYear || numYear > currentYear) {
        throw new Error(`Left at year must be between ${minYear} and ${currentYear}`);
    }

    return numYear;
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
