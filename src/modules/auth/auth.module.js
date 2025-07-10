import { AuthController } from './auth.controller.js';

const AuthModule = async (app) => {
    const authController = new AuthController();
    authController.registerRoutes(app);
};

export { AuthModule };