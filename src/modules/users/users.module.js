import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

const UsersModule = async (app) => {
    const usersService = new UsersService();
    const usersController = new UsersController(usersService);
    usersController.registerRoutes(app);
};

export { UsersModule };