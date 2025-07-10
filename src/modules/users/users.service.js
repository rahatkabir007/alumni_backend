import { getDataSource } from "../../config/database.js";
import { User } from "../../entities/User.js";

class UsersService {
    constructor() {
        try {
            this.dataSource = getDataSource();
            this.userRepository = this.dataSource.getRepository(User);
        } catch (error) {
            console.error('Error initializing UsersService:', error);
            throw error;
        }
    }

    async getUsers() {
        try {
            return await this.userRepository.find({
                select: ['id', 'email', 'name', 'provider', 'created_at']
            });
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    }

    async getUserById(id) {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: ['id', 'email', 'name', 'provider', 'created_at']
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }

    async updateUser(id, updateData) {
        try {
            const user = await this.userRepository.findOne({ where: { id } });

            if (!user) {
                throw new Error('User not found');
            }

            // Don't allow updating password or sensitive fields through this method
            const allowedFields = ['name'];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            Object.assign(user, filteredData);
            const updatedUser = await this.userRepository.save(user);

            const { password, ...userWithoutPassword } = updatedUser;
            return userWithoutPassword;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const result = await this.userRepository.delete(id);
            return result.affected > 0;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }
}

export { UsersService };