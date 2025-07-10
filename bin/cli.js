#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';

program
    .command('generate <name>')
    .description('Generate a new module')
    .action((name) => {
        const baseDir = path.join(process.cwd(), 'src', 'modules', name);
        fs.ensureDirSync(baseDir);

        const capitalizedModuleName = capitalize(name);
        const files = [
            //Controller
            {
                name: `${name}.controller.js`,
                content: `
import { ${capitalizedModuleName}Service } from "./${name}.service.js";

class ${capitalizedModuleName}Controller {
    /**
     * @param {${capitalizedModuleName}Service} ${name}Service
     */
    constructor(${name}Service) {
        this.${name}Service = ${name}Service;
    }

    registerRoutes(app) {
        app.create('/', (req, res) => {
             try {
                const result = this.${name}Service.create(req);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.toString() });
            }
        });
    }
}

export { ${capitalizedModuleName}Controller };
        `.trim()
            },
            //Service
            {
                name: `${name}.service.js`,
                content: `

class ${capitalizedModuleName}Service {
constructor(db) {
        this.${name}Collection = db?.collection('${name}');
    } 
    create(req, res) {
        
    }
}

export { ${capitalizedModuleName}Service };
        `.trim()
            },
            //Module
            {
                name: `${name}.module.js`,
                content: `
import express from "express"
import { ${capitalizedModuleName}Controller } from './${name}.controller.js';
import { ${capitalizedModuleName}Service } from './${name}.service.js';


const ${capitalizedModuleName}Module = (app) => {
       const db = app.locals.db;
    const ${name}Service = new ${capitalizedModuleName}Service(db);
    const ${name}Controller = new ${capitalizedModuleName}Controller(${name}Service);

    const router = express.Router();

    ${name}Controller.registerRoutes(router);
   
    app.use('/${name}', router);

};

export { ${capitalizedModuleName}Module };
        `.trim()
            }
        ];

        files.forEach(file => {
            const filePath = path.join(baseDir, file.name);
            fs.writeFileSync(filePath, file.content);
        });

        updateAppModule(name);

        console.log(`Module ${name} generated successfully!`);
    });

program.parse(process.argv);

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateAppModule(moduleName) {
    const appModulePath = path.join(process.cwd(), 'src', 'modules', 'app', 'app.module.js');
    const importStatement = `import { ${capitalize(moduleName)}Module } from "../${moduleName}/${moduleName}.module.js";\n`;
    const moduleUsageStatement = `    ${capitalize(moduleName)}Module(app);\n`;

    let content = fs.readFileSync(appModulePath, 'utf-8');

    // Check if the module is already imported
    if (!content.includes(`import { ${capitalize(moduleName)}Module`)) {
        // Add import statement
        const importPosition = content.indexOf("import {");
        content = content.slice(0, importPosition) + importStatement + content.slice(importPosition);
    }

    // Check if the module is already used
    if (!content.includes(`${capitalize(moduleName)}Module(app);`)) {
        // Add module usage statement before errorMiddleware
        const usagePosition = content.indexOf("app.use(errorMiddleware);");
        content = content.slice(0, usagePosition) + moduleUsageStatement + content.slice(usagePosition);
    }

    fs.writeFileSync(appModulePath, content);
}