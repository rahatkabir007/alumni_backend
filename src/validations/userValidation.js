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
