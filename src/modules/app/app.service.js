import { fileURLToPath } from 'url';
import path from 'path';

class AppService {
    getHomePage(req, res) {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const root = path.resolve(__dirname, '../../../');

        res.sendFile(path.join(root, 'index.html'));
        
    }
}

export { AppService };