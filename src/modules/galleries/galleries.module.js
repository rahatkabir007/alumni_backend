import express from "express";
import { GalleriesController } from './galleries.controller.js';
import { GalleriesService } from './galleries.service.js';

const GalleriesModule = (app) => {
    // No need for db dependency anymore - using TypeORM
    const galleriesService = new GalleriesService();
    const galleriesController = new GalleriesController(galleriesService);

    galleriesController.registerRoutes(app);

};

export { GalleriesModule };