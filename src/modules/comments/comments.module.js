import express from "express";
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

const CommentsModule = (app) => {
    const commentsService = new CommentsService();
    const commentsController = new CommentsController(commentsService);

    const router = express.Router();

    commentsController.registerRoutes(router);

    app.use('/api', router); // Mount on /api so routes become /api/gallery/1/comments etc.
};

export { CommentsModule };
