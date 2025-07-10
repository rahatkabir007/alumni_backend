class AppController {
    constructor(appService) {
        this.appService = appService;
    }

    registerRoutes(app) {
        app.get('/', (req, res) => {
            res.json("Server Is Running")
            // this.appService.getHomePage(req, res);
        });
    }
}

export { AppController };
