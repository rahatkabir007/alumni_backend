import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Dynamically loads all entity classes from the entities folder
 * @returns {Promise<Array>} Array of entity classes
 */
export const loadEntities = async () => {
    try {
        const entitiesPath = join(__dirname, '..', 'entities');
        const files = await readdir(entitiesPath);

        // Filter for .js files and exclude index files
        const entityFiles = files.filter(file =>
            file.endsWith('.js') &&
            !file.startsWith('index') &&
            !file.startsWith('.')
        );

        const entities = [];

        for (const file of entityFiles) {
            try {
                const modulePath = `../entities/${file}`;
                const module = await import(modulePath);

                // Look for exported entity classes or EntitySchema objects
                // Common patterns: export { ClassName }, export default ClassName, export const EntityName
                const entityExports = Object.values(module);

                for (const exportedItem of entityExports) {
                    // Check if it's a class constructor or EntitySchema
                    if (typeof exportedItem === 'function' && exportedItem.name && exportedItem.name !== 'Object') {
                        entities.push(exportedItem);
                        console.log(`✓ Loaded entity class: ${exportedItem.name} from ${file}`);
                    } else if (exportedItem && typeof exportedItem === 'object' && exportedItem.options && exportedItem.options.name) {
                        // EntitySchema object
                        entities.push(exportedItem);
                        console.log(`✓ Loaded EntitySchema: ${exportedItem.options.name} from ${file}`);
                    } else if (exportedItem && typeof exportedItem === 'object' && exportedItem.name) {
                        // Other EntitySchema format
                        entities.push(exportedItem);
                        console.log(`✓ Loaded entity: ${exportedItem.name} from ${file}`);
                    }
                }

                if (entityExports.length === 0) {
                    console.warn(`⚠ No entity exports found in ${file}`);
                }
            } catch (error) {
                console.error(`✗ Failed to load entity from ${file}:`, error.message);
            }
        }

        console.log(`📦 Total entities loaded: ${entities.length}`);
        return entities;

    } catch (error) {
        console.error('Failed to load entities directory:', error.message);
        return [];
    }
};
