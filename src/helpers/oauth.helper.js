import { isValidUrl } from './validation.helper.js';

/**
 * OAuth helper functions for profile data extraction
 */

/**
 * Extract and validate user name from OAuth profile
 * @param {Object} profile - OAuth profile object
 * @returns {string} - Extracted and sanitized name
 */
export const extractUserName = (profile) => {
    let name = '';

    // Try different name sources in order of preference
    if (profile.displayName && profile.displayName.trim()) {
        name = profile.displayName.trim();
    } else if (profile.name) {
        // Construct from name object
        const firstName = profile.name.givenName || '';
        const lastName = profile.name.familyName || '';
        name = `${firstName} ${lastName}`.trim();
    } else if (profile._json) {
        // Fallback to raw profile data
        if (profile._json.name) {
            name = profile._json.name;
        } else {
            const firstName = profile._json.first_name || profile._json.given_name || '';
            const lastName = profile._json.last_name || profile._json.family_name || '';
            name = `${firstName} ${lastName}`.trim();
        }
    }

    // Final fallback: use email prefix if no name found
    if (!name || name.trim() === '') {
        const email = profile.emails?.[0]?.value || '';
        if (email) {
            name = email.split('@')[0].replace(/[._-]/g, ' ');
            // Capitalize first letter of each word
            name = name.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }
    }

    // Sanitize name: remove extra whitespace and limit length
    name = name.replace(/\s+/g, ' ').trim();
    if (name.length > 100) {
        name = name.substring(0, 100).trim();
    }

    return name || 'User'; // Ultimate fallback
};

/**
 * Extract and validate profile photo URL from OAuth profile
 * @param {Object} profile - OAuth profile object
 * @returns {string} - Valid photo URL or empty string
 */
export const extractProfilePhoto = (profile) => {
    let photoUrl = '';

    // Try different photo sources
    if (profile.photos && profile.photos.length > 0) {
        photoUrl = profile.photos[0].value;
    } else if (profile._json) {
        // Try different photo field names
        photoUrl = profile._json.picture ||
            profile._json.avatar_url ||
            profile._json.profile_image_url ||
            profile._json.image || '';
    }

    // Validate URL format
    if (photoUrl && isValidUrl(photoUrl)) {
        return photoUrl;
    }

    return ''; // Return empty string if no valid photo found
};

/**
 * Determine if profile photo should be updated
 * @param {Object} user - User object from database
 * @param {string} newProfilePhoto - New profile photo URL
 * @param {string} provider - OAuth provider name
 * @returns {boolean} - True if photo should be updated
 */
export const shouldUpdateProfilePhoto = (user, newProfilePhoto, provider) => {
    // Case 1: No profile photo exists at all
    if (!user.profilePhoto || user.profilePhoto.trim() === '') {
        return true;
    }

    // Case 2: Current photo is from OAuth and new photo is from same provider (allow updates from same provider)
    if (user.profilePhotoSource === provider) {
        return true;
    }

    // Case 3: Current photo is from OAuth but user manually changed it (profilePhotoSource is null or 'manual')
    // Don't overwrite manually set photos
    if (!user.profilePhotoSource || user.profilePhotoSource === 'manual') {
        return false;
    }

    // Case 4: Current photo is from different OAuth provider - don't overwrite
    if (user.profilePhotoSource && user.profilePhotoSource !== provider) {
        return false;
    }

    // Default: don't update if we can't determine the source
    return false;
};
