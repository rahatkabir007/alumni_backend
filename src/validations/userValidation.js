/**
 * Comprehensive user validation utility
 */

export class UserValidationError extends Error {
    constructor(field, message) {
        super(message);
        this.field = field;
        this.name = 'UserValidationError';
    }
}

export class UserValidator {
    static validateName(name, isRequired = false) {
        if (!name || (typeof name === 'string' && name.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('name', 'Name is required');
            }
            return '';
        }

        if (typeof name !== 'string') {
            throw new UserValidationError('name', 'Name must be a string');
        }

        const sanitized = name.replace(/\s+/g, ' ').trim();

        if (sanitized.length === 0 && isRequired) {
            throw new UserValidationError('name', 'Name cannot be empty');
        }

        if (sanitized.length > 100) {
            throw new UserValidationError('name', 'Name cannot exceed 100 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new UserValidationError('name', 'Name contains invalid characters');
        }

        return sanitized;
    }

    static validatePhone(phone, isRequired = false) {
        if (!phone || (typeof phone === 'string' && phone.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('phone', 'Phone number is required');
            }
            return '';
        }

        if (typeof phone !== 'string') {
            throw new UserValidationError('phone', 'Phone must be a string');
        }

        const sanitized = phone.trim();

        if (sanitized.length > 20) {
            throw new UserValidationError('phone', 'Phone number cannot exceed 20 characters');
        }

        if (!/^[\d\s\-\(\)\+]+$/.test(sanitized)) {
            throw new UserValidationError('phone', 'Phone number contains invalid characters');
        }

        return sanitized;
    }

    static validateBranch(branch, isRequired = false) {
        if (!branch || (typeof branch === 'string' && branch.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('branch', 'Branch is required');
            }
            return null;
        }

        const validBranches = ['Jamalkhan', 'Patiya'];
        if (!validBranches.includes(branch)) {
            throw new UserValidationError('branch', `Branch must be one of: ${validBranches.join(', ')}`);
        }

        return branch;
    }

    static validateLocation(location, isRequired = false) {
        if (!location || (typeof location === 'string' && location.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('location', 'Location is required');
            }
            return '';
        }

        if (typeof location !== 'string') {
            throw new UserValidationError('location', 'Location must be a string');
        }

        const sanitized = location.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 500) {
            throw new UserValidationError('location', 'Location cannot exceed 500 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new UserValidationError('location', 'Location contains invalid characters');
        }

        return sanitized;
    }

    static validateBloodGroup(bloodGroup, isRequired = false) {
        if (!bloodGroup || (typeof bloodGroup === 'string' && bloodGroup.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('blood_group', 'Blood group is required');
            }
            return '';
        }

        const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        if (!validBloodGroups.includes(bloodGroup)) {
            throw new UserValidationError('blood_group', `Blood group must be one of: ${validBloodGroups.join(', ')}`);
        }

        return bloodGroup;
    }

    static validateBatch(batch, isRequired = false) {
        if (!batch || (typeof batch === 'string' && batch.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('batch', 'Batch is required');
            }
            return '';
        }

        if (typeof batch !== 'string') {
            throw new UserValidationError('batch', 'Batch must be a string');
        }

        const sanitized = batch.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 100) {
            throw new UserValidationError('batch', 'Batch cannot exceed 100 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new UserValidationError('batch', 'Batch contains invalid characters');
        }

        return sanitized;
    }

    static validateIsGraduated(isGraduated, isRequired = false) {
        if (isGraduated === null || isGraduated === undefined) {
            if (isRequired) {
                throw new UserValidationError('isGraduated', 'Graduation status is required');
            }
            return null;
        }

        return isGraduated === true || isGraduated === 'true' || isGraduated === 1;
    }

    static validateGraduationYear(graduationYear, isGraduated, isRequired = false) {
        // If user is graduated, graduation year is required
        const shouldBeRequired = isRequired || isGraduated === true;

        if (!graduationYear && graduationYear !== 0) {
            if (shouldBeRequired) {
                throw new UserValidationError('graduation_year', 'Graduation year is required for graduated students');
            }
            return null;
        }

        const year = parseInt(graduationYear);
        if (isNaN(year)) {
            throw new UserValidationError('graduation_year', 'Graduation year must be a valid number');
        }

        const currentYear = new Date().getFullYear();
        const minYear = 1998;

        if (year < minYear || year > currentYear + 10) {
            throw new UserValidationError('graduation_year', `Graduation year must be between ${minYear} and ${currentYear + 10}`);
        }

        return year;
    }

    static validateLeftAtYear(leftAtYear, isGraduated, isRequired = false) {
        // If user is not graduated, left at year is required
        const shouldBeRequired = isRequired || isGraduated === false;

        if (!leftAtYear && leftAtYear !== 0) {
            if (shouldBeRequired) {
                throw new UserValidationError('left_at', 'Left at year is required for non-graduated students');
            }
            return null;
        }

        const year = parseInt(leftAtYear);
        if (isNaN(year)) {
            throw new UserValidationError('left_at', 'Left at year must be a valid number');
        }

        const currentYear = new Date().getFullYear();
        const minYear = 1998;

        if (year < minYear || year > currentYear) {
            throw new UserValidationError('left_at', `Left at year must be between ${minYear} and ${currentYear}`);
        }

        return year;
    }

    static validateJoinedYear(joinedYear, isRequired = false) {
        if (!joinedYear && joinedYear !== 0) {
            if (isRequired) {
                throw new UserValidationError('joinedYear', 'Joined year is required');
            }
            return null;
        }

        const year = parseInt(joinedYear);
        if (isNaN(year)) {
            throw new UserValidationError('joinedYear', 'Joined year must be a valid number');
        }

        const currentYear = new Date().getFullYear();
        const minYear = 1998;

        if (year < minYear || year > currentYear + 10) {
            throw new UserValidationError('joinedYear', `Joined year must be between ${minYear} and ${currentYear + 10}`);
        }

        return year;
    }

    static validateProfession(profession, isRequired = false) {
        if (!profession || (typeof profession === 'string' && profession.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('profession', 'Profession is required');
            }
            return '';
        }

        if (typeof profession !== 'string') {
            throw new UserValidationError('profession', 'Profession must be a string');
        }

        const sanitized = profession.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 200) {
            throw new UserValidationError('profession', 'Profession cannot exceed 200 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new UserValidationError('profession', 'Profession contains invalid characters');
        }

        return sanitized;
    }

    static validateBio(bio, isRequired = false) {
        if (!bio || (typeof bio === 'string' && bio.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('bio', 'Bio is required');
            }
            return '';
        }

        if (typeof bio !== 'string') {
            throw new UserValidationError('bio', 'Bio must be a string');
        }

        const sanitized = bio.replace(/\s+/g, ' ').trim();

        if (sanitized.length > 2000) {
            throw new UserValidationError('bio', 'Bio cannot exceed 2000 characters');
        }

        if (/<script|javascript:|on\w+=/i.test(sanitized)) {
            throw new UserValidationError('bio', 'Bio contains invalid characters');
        }

        return sanitized;
    }

    static validateAlumniType(alumniType, isRequired = false) {
        if (!alumniType || (typeof alumniType === 'string' && alumniType.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('alumni_type', 'Alumni type is required');
            }
            return null;
        }

        const validTypes = ['student', 'teacher', 'management'];
        if (!validTypes.includes(alumniType)) {
            throw new UserValidationError('alumni_type', `Alumni type must be one of: ${validTypes.join(', ')}`);
        }

        return alumniType;
    }

    static validateProfilePhotoSource(profilePhotoSource, isRequired = false) {
        if (!profilePhotoSource || (typeof profilePhotoSource === 'string' && profilePhotoSource.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('profilePhotoSource', 'Profile photo source is required');
            }
            return null;
        }

        const validSources = ['google', 'manual'];
        if (!validSources.includes(profilePhotoSource)) {
            throw new UserValidationError('profilePhotoSource', `Profile photo source must be one of: ${validSources.join(', ')}`);
        }

        return profilePhotoSource;
    }

    static validateProfilePhoto(profilePhoto, isRequired = false) {
        if (!profilePhoto || (typeof profilePhoto === 'string' && profilePhoto.trim() === '')) {
            if (isRequired) {
                throw new UserValidationError('profilePhoto', 'Profile photo is required');
            }
            return '';
        }

        if (typeof profilePhoto !== 'string') {
            throw new UserValidationError('profilePhoto', 'Profile photo must be a string');
        }

        const trimmed = profilePhoto.trim();

        if (trimmed.length > 500) {
            throw new UserValidationError('profilePhoto', 'Profile photo URL cannot exceed 500 characters');
        }

        if (!this.isValidUrl(trimmed)) {
            throw new UserValidationError('profilePhoto', 'Profile photo must be a valid URL');
        }

        return trimmed;
    }

    static validateYear(year) {
        if (!year) return null;
        const numYear = parseInt(year);
        if (isNaN(numYear) || numYear < 1950 || numYear > new Date().getFullYear() + 10) {
            return null;
        }
        return numYear;
    }

    static validateSocialMedia(socialMedia) {
        if (!socialMedia || typeof socialMedia !== 'object') {
            return {};
        }

        const validated = {};
        const allowedPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram', 'github', 'website'];

        for (const [platform, url] of Object.entries(socialMedia)) {
            if (allowedPlatforms.includes(platform.toLowerCase()) && url && typeof url === 'string') {
                const trimmedUrl = url.trim();
                if (trimmedUrl.length <= 500 && this.isValidUrl(trimmedUrl)) {
                    validated[platform.toLowerCase()] = trimmedUrl;
                }
            }
        }

        return validated;
    }

    static validateAdditionalInformation(additionalInfo, alumniType) {
        if (!additionalInfo || typeof additionalInfo !== 'object') {
            return {};
        }

        const validated = {};

        // Common fields for all alumni types
        if (additionalInfo.achievements && Array.isArray(additionalInfo.achievements)) {
            validated.achievements = additionalInfo.achievements
                .filter(achievement => typeof achievement === 'string' && achievement.trim().length > 0)
                .map(achievement => achievement.trim())
                .slice(0, 50); // Limit to 50 achievements
        }

        if (additionalInfo.education && Array.isArray(additionalInfo.education)) {
            validated.education = additionalInfo.education
                .filter(edu => edu && typeof edu === 'object')
                .map(edu => ({
                    degree: edu.degree ? String(edu.degree).trim().substring(0, 200) : '',
                    institution: edu.institution ? String(edu.institution).trim().substring(0, 200) : '',
                    year: this.validateYear(edu.year),
                    grade: edu.grade ? String(edu.grade).trim().substring(0, 50) : ''
                }))
                .slice(0, 20); // Limit to 20 education records
        }

        if (additionalInfo.experience && Array.isArray(additionalInfo.experience)) {
            validated.experience = additionalInfo.experience
                .filter(exp => exp && typeof exp === 'object')
                .map(exp => ({
                    position: exp.position ? String(exp.position).trim().substring(0, 200) : '',
                    organization: exp.organization ? String(exp.organization).trim().substring(0, 200) : '',
                    institution: exp.institution ? String(exp.institution).trim().substring(0, 200) : '',
                    period: exp.period ? String(exp.period).trim().substring(0, 100) : '',
                    description: exp.description ? String(exp.description).trim().substring(0, 1000) : ''
                }))
                .slice(0, 20); // Limit to 20 experience records
        }

        // Student-specific fields
        if (alumniType === 'student') {
            if (additionalInfo.class) {
                validated.class = String(additionalInfo.class).trim().substring(0, 10);
            }

            if (additionalInfo.currentPosition) {
                validated.currentPosition = String(additionalInfo.currentPosition).trim().substring(0, 200);
            }

            if (additionalInfo.organization) {
                validated.organization = String(additionalInfo.organization).trim().substring(0, 200);
            }

            if (additionalInfo.joinedYear) {
                validated.joinedYear = this.validateYear(additionalInfo.joinedYear);
            }

            if (additionalInfo.graduatedYear) {
                validated.graduatedYear = this.validateYear(additionalInfo.graduatedYear);
            }

            if (additionalInfo.quotes) {
                validated.quotes = String(additionalInfo.quotes).trim().substring(0, 2000);
            }

            if (additionalInfo.socialMedia && typeof additionalInfo.socialMedia === 'object') {
                validated.socialMedia = this.validateSocialMedia(additionalInfo.socialMedia);
            }

            if (additionalInfo.socialContributions && Array.isArray(additionalInfo.socialContributions)) {
                validated.socialContributions = additionalInfo.socialContributions
                    .filter(contrib => typeof contrib === 'string' && contrib.trim().length > 0)
                    .map(contrib => contrib.trim().substring(0, 500))
                    .slice(0, 20);
            }
        }

        // Teacher/Management-specific fields
        if (alumniType === 'teacher' || alumniType === 'management') {
            if (additionalInfo.designation) {
                validated.designation = String(additionalInfo.designation).trim().substring(0, 100);
            }

            if (additionalInfo.department) {
                validated.department = String(additionalInfo.department).trim().substring(0, 100);
            }

            if (additionalInfo.period) {
                validated.period = String(additionalInfo.period).trim().substring(0, 50);
            }

            if (additionalInfo.subject) {
                validated.subject = String(additionalInfo.subject).trim().substring(0, 100);
            }

            if (additionalInfo.specialization) {
                validated.specialization = String(additionalInfo.specialization).trim().substring(0, 200);
            }

            if (additionalInfo.quote) {
                validated.quote = String(additionalInfo.quote).trim().substring(0, 2000);
            }

            if (additionalInfo.officeHours) {
                validated.officeHours = String(additionalInfo.officeHours).trim().substring(0, 100);
            }

            if (additionalInfo.publications && Array.isArray(additionalInfo.publications)) {
                validated.publications = additionalInfo.publications
                    .filter(pub => pub && typeof pub === 'object')
                    .map(pub => ({
                        title: pub.title ? String(pub.title).trim().substring(0, 300) : '',
                        year: this.validateYear(pub.year),
                        publisher: pub.publisher ? String(pub.publisher).trim().substring(0, 200) : ''
                    }))
                    .slice(0, 50);
            }

            if (additionalInfo.studentsFeedback && Array.isArray(additionalInfo.studentsFeedback)) {
                validated.studentsFeedback = additionalInfo.studentsFeedback
                    .filter(feedback => feedback && typeof feedback === 'object')
                    .map(feedback => ({
                        name: feedback.name ? String(feedback.name).trim().substring(0, 100) : '',
                        batch: feedback.batch ? String(feedback.batch).trim().substring(0, 50) : '',
                        feedback: feedback.feedback ? String(feedback.feedback).trim().substring(0, 1000) : ''
                    }))
                    .slice(0, 100);
            }
            if (additionalInfo.socialMedia && typeof additionalInfo.socialMedia === 'object') {
                validated.socialMedia = this.validateSocialMedia(additionalInfo.socialMedia);
            }
        }

        return validated;
    }

    static validateVerificationData(verificationData) {
        if (!verificationData || typeof verificationData !== 'object') {
            throw new Error('Verification data is required');
        }

        const validated = {};

        // Validate verification images - REQUIRED
        if (!verificationData.verification_images || !Array.isArray(verificationData.verification_images)) {
            throw new Error('Verification images are required');
        }

        const validImages = verificationData.verification_images
            .filter(url => url && typeof url === 'string' && this.isValidUrl(url))
            .map(url => url.trim())
            .slice(0, 10); // Limit to 10 images

        if (validImages.length === 0) {
            throw new Error('At least one valid verification image URL is required');
        }

        validated.verification_images = validImages;

        // Validate social media links - OPTIONAL
        if (verificationData.socialMedia && typeof verificationData.socialMedia === 'object') {
            const validatedSocialMedia = this.validateSocialMedia(verificationData.socialMedia);
            if (Object.keys(validatedSocialMedia).length > 0) {
                validated.socialMedia = validatedSocialMedia;
            }
        }

        // Add timestamp for verification request
        validated.submitted_at = new Date().toISOString();
        validated.status = 'pending';

        return validated;
    }

    static isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    /**
     * Validate all user update fields at once
     * @param {Object} updateData - The data to validate
     * @param {Object} options - Validation options
     * @param {boolean} options.requireAll - Whether all fields are required
     * @param {Object} options.required - Specific fields that are required
     * @returns {Object} - Validated data
     */
    static validateUserUpdate(updateData, options = {}) {
        const { requireAll = false, required = {} } = options;
        const validatedData = {};
        const errors = [];

        try {
            // Validate name
            if (updateData.name !== undefined) {
                validatedData.name = this.validateName(updateData.name, requireAll || required.name);
            }

            // Validate phone
            if (updateData.phone !== undefined) {
                validatedData.phone = this.validatePhone(updateData.phone, requireAll || required.phone);
            }

            // Validate branch
            if (updateData.branch !== undefined) {
                validatedData.branch = this.validateBranch(updateData.branch, requireAll || required.branch);
            }

            // Validate location
            if (updateData.location !== undefined) {
                validatedData.location = this.validateLocation(updateData.location, requireAll || required.location);
            }

            // Validate blood group
            if (updateData.blood_group !== undefined) {
                validatedData.blood_group = this.validateBloodGroup(updateData.blood_group, requireAll || required.blood_group);
            }

            // Validate batch
            if (updateData.batch !== undefined) {
                validatedData.batch = this.validateBatch(updateData.batch, requireAll || required.batch);
            }

            // Validate isGraduated
            if (updateData.isGraduated !== undefined) {
                validatedData.isGraduated = this.validateIsGraduated(updateData.isGraduated, requireAll || required.isGraduated);
            }

            // Validate joined year
            if (updateData.joinedYear !== undefined) {
                validatedData.joinedYear = this.validateJoinedYear(updateData.joinedYear, requireAll || required.joinedYear);
            }

            // Validate profession
            if (updateData.profession !== undefined) {
                validatedData.profession = this.validateProfession(updateData.profession, requireAll || required.profession);
            }

            // Validate bio
            if (updateData.bio !== undefined) {
                validatedData.bio = this.validateBio(updateData.bio, requireAll || required.bio);
            }

            // Validate alumni type
            if (updateData.alumni_type !== undefined) {
                validatedData.alumni_type = this.validateAlumniType(updateData.alumni_type, requireAll || required.alumni_type);
            }

            // Validate profile photo source
            if (updateData.profilePhotoSource !== undefined) {
                validatedData.profilePhotoSource = this.validateProfilePhotoSource(updateData.profilePhotoSource, requireAll || required.profilePhotoSource);
            }

            // Validate profile photo
            if (updateData.profilePhoto !== undefined) {
                validatedData.profilePhoto = this.validateProfilePhoto(updateData.profilePhoto, requireAll || required.profilePhoto);
            }

            // Validate graduation year (depends on isGraduated)
            if (updateData.graduation_year !== undefined || updateData.isGraduated !== undefined) {
                const isGraduated = validatedData.isGraduated !== undefined ? validatedData.isGraduated : updateData.isGraduated;
                if (updateData.graduation_year !== undefined) {
                    validatedData.graduation_year = this.validateGraduationYear(
                        updateData.graduation_year,
                        isGraduated,
                        requireAll || required.graduation_year
                    );
                }
            }

            // Validate left at year (depends on isGraduated)
            if (updateData.left_at !== undefined || updateData.isGraduated !== undefined) {
                const isGraduated = validatedData.isGraduated !== undefined ? validatedData.isGraduated : updateData.isGraduated;
                if (updateData.left_at !== undefined) {
                    validatedData.left_at = this.validateLeftAtYear(
                        updateData.left_at,
                        isGraduated,
                        requireAll || required.left_at
                    );
                }
            }

        } catch (error) {
            if (error instanceof UserValidationError) {
                errors.push({ field: error.field, message: error.message });
            } else {
                throw error;
            }
        }

        if (errors.length > 0) {
            const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('; ');
            throw new Error(`Validation failed: ${errorMessage}`);
        }

        return validatedData;
    }
}
