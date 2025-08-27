import express from "express";
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

const PostsModule = (app) => {
    const postsService = new PostsService();
    const postsController = new PostsController(postsService);

    postsController.registerRoutes(app);
};

export { PostsModule };
