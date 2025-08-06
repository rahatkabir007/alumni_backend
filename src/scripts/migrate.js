import { connectDB } from '../config/database.js';
import { SeederRunner } from '../utils/seederRunner.js';

const command = process.argv[2];

async function runCommand() {
    const dataSource = await connectDB();

    try {
        switch (command) {

            case 'seed':
                const seederRunner = new SeederRunner(dataSource);
                await seederRunner.runSeeders();
                break;


            default:
                console.log('Available commands:');
                console.log('  migrate       - Run pending migrations');
                console.log('  seed          - Run pending seeders');
                console.log('  migrate:seed  - Run migrations then seeders');
        }
    } catch (error) {
        console.error('Command failed:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
        process.exit(0);
    }
}

runCommand();
