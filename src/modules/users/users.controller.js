import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { ResponseHandler } from "../../utils/responseHandler.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }

    registerRoutes(app) {
        // Health check endpoint (public)
        app.get('/health', asyncHandler(async (req, res) => {
            // Test database connection
            await this.usersService.getUsers();
            const healthData = {
                success: true,
                message: 'API is healthy',
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            };
            return ResponseHandler.success(res, healthData, 'Health check passed');
        }));

        // Enhanced users endpoint with pagination, sorting, and search
        app.get('/users', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.getUsers(req.query);
            return ResponseHandler.success(res, result, 'Users retrieved successfully');
        }));

        // Get user by ID
        app.get('/users/:id', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.getUserById(req.params.id);

            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }

            return ResponseHandler.success(res, result, 'User retrieved successfully');
        }));

        // Update user
        app.patch('/users/:id', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.updateUser(req.params.id, req.body);
            return ResponseHandler.success(res, result, 'User updated successfully');
        }));

        app.patch('/users/:id/status', authMiddleware, asyncHandler(async (req, res) => {
            const { status } = req.body;
            if (!status) {
                return ResponseHandler.error(res, new Error('Status is required'), 'Status is required');
            }
            const result = await this.usersService.updateStatus(req.params.id, status);
            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }
            return ResponseHandler.success(res, result, 'User status updated successfully');
        }));


        app.patch('/users/:id/role', authMiddleware, asyncHandler(async (req, res) => {
            const { role } = req.body;
            if (!role) {
                return ResponseHandler.error(res, new Error('Role is required'), 'Role is required');
            }
            const result = await this.usersService.updateRole(req.params.id, role);
            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }
            return ResponseHandler.success(res, result, 'User role updated successfully');
        }));

        // Delete user
        app.delete('/users/:id', authMiddleware, asyncHandler(async (req, res) => {
            const result = await this.usersService.deleteUser(req.params.id);

            if (!result) {
                return ResponseHandler.notFound(res, 'User not found');
            }

            return ResponseHandler.success(res, null, 'User deleted successfully');
        }));
    }
}

export { UsersController };