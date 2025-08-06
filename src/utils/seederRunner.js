import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SeederRunner {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }

    async createSeedersTable() {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            const hasTable = await queryRunner.hasTable('seeders');

            if (!hasTable) {
                await queryRunner.query(`
                    CREATE TABLE seeders (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        description TEXT,
                        version VARCHAR(50),
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ Created seeders table');
            }
        } finally {
            await queryRunner.release();
        }
    }

    async getExecutedSeeders() {
        const result = await this.dataSource.query('SELECT name FROM seeders ORDER BY id');
        return result.map(row => row.name);
    }

    async markSeederAsExecuted(seederInfo) {
        await this.dataSource.query(
            'INSERT INTO seeders (name, description, version) VALUES ($1, $2, $3)',
            [seederInfo.name, seederInfo.description, seederInfo.version]
        );
    }

    async runSeeders() {
        try {
            console.log('🌱 Running database seeders...');

            await this.createSeedersTable();

            const seedersDir = join(__dirname, '../database/seeders');

            let seederFiles;
            try {
                seederFiles = await readdir(seedersDir);
            } catch (error) {
                console.warn('⚠️ Seeders directory not found, skipping seeders');
                return;
            }

            const executedSeeders = await this.getExecutedSeeders();

            // Sort seeders by filename to ensure proper execution order
            const sortedSeederFiles = seederFiles
                .filter(file => file.endsWith('.js'))
                .sort();

            if (sortedSeederFiles.length === 0) {
                console.log('ℹ️ No seeder files found');
                return;
            }

            for (const file of sortedSeederFiles) {
                const seederName = file.replace('.js', '');

                if (executedSeeders.includes(seederName)) {
                    console.log(`ℹ️ Seeder ${seederName} already executed, skipping...`);
                    continue;
                }

                console.log(`🌱 Running seeder: ${seederName}`);

                try {
                    const seederPath = join(seedersDir, file);
                    const seeder = await import(`file://${seederPath}`);

                    if (!seeder.seed || typeof seeder.seed !== 'function') {
                        console.error(`❌ Seeder ${seederName} does not export a 'seed' function`);
                        continue;
                    }

                    if (!seeder.seederInfo || typeof seeder.seederInfo !== 'object') {
                        console.error(`❌ Seeder ${seederName} does not export 'seederInfo' object`);
                        continue;
                    }

                    // Execute seeder with DataSource
                    await seeder.seed(this.dataSource);

                    // Mark as executed
                    await this.markSeederAsExecuted(seeder.seederInfo);

                    console.log(`✅ Seeder ${seederName} completed`);

                } catch (error) {
                    console.error(`❌ Error running seeder ${seederName}:`, error.message);
                    // Continue with other seeders even if one fails
                }
            }

            console.log('✅ All seeders processing completed!');

        } catch (error) {
            console.error('❌ Seeder runner error:', error);
            throw error;
        }
    }
}

export { SeederRunner };
