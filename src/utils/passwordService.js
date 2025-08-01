import bcrypt from 'bcrypt';

class PasswordService {
    constructor() {
        this.saltRounds = 12;
    }

    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            throw new Error('Failed to hash password');
        }
    }

    async comparePasswords(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error('Failed to compare passwords');
        }
    }
}

export { PasswordService };
