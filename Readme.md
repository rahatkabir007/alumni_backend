# Alumni Backend API

A Node.js Express API with TypeORM, PostgreSQL, and JWT authentication. Supports multiple environments with flexible database configurations.

## 📁 Project Structure

```
alumni_backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration & connection
│   ├── entities/
│   │   └── User.js              # TypeORM User entity
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT authentication
│   │   └── error.middleware.js  # Error handling
│   ├── modules/
│   │   ├── app/
│   │   │   ├── app.module.js    # Main app module
│   │   │   ├── app.controller.js
│   │   │   └── app.service.js
│   │   └── users/
│   │       ├── users.module.js  # Users module
│   │       ├── users.controller.js
│   │       └── users.service.js
│   ├── utils/
│   │   ├── jwtSign.js          # JWT token utilities
│   │   └── logger.js           # Logging utilities
│   └── main.js                 # Application entry point
├── .env                        # Local development config
├── .env.local                  # Alternative local config
├── .env.production            # Production config
├── vercel.json                # Vercel deployment config
├── package.json
├── check-env.js               # Environment testing script
└── test-prod-local.js         # Production testing script
```

## 🌍 Environment Configuration Strategy

### Development vs Production

The application uses different environment files to manage configurations:

#### 1. **Development (.env / .env.local)**
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_NAME=alumni_db
DB_PASSWORD=1234
JWT_SECRET=your-local-secret-key
PORT=8000
```

#### 2. **Production (.env.production)**
```bash
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
JWT_SECRET=production-secret-key
PORT=8000
```

### How Environment Affects Database Configuration

The `src/config/database.js` file automatically switches between configurations:

**Development Mode:**
- Uses individual connection parameters (host, port, username, etc.)
- Automatically creates database if it doesn't exist
- SSL disabled
- Synchronize enabled for auto-schema updates

**Production Mode:**
- Uses CONNECTION_URL format (Neon, Heroku, Railway, etc.)
- SSL enabled with `rejectUnauthorized: false`
- Connection pooling configured
- No automatic database creation

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Run with .env
npm run dev:local        # Run with .env.local
npm run dev:prod         # Run with .env.production locally

# Production
npm start               # Production start

# Testing
npm run test:prod-local # Test production config locally
node check-env.js       # Check all environment files
```

## 📊 Current Database: PostgreSQL

### Local Setup (Development)
1. Install PostgreSQL locally
2. Create database: `createdb alumni_db`
3. Update `.env` with your credentials
4. Run: `npm run dev`

### Production Setup (Neon)
1. Create account on [Neon](https://neon.tech)
2. Get CONNECTION_URL from dashboard
3. Update `.env.production`
4. Deploy to Vercel/Railway/Heroku

## 🔄 Switching to MySQL

To switch from PostgreSQL to MySQL, make these changes:

### 1. Install MySQL Driver
```bash
npm uninstall pg @types/pg
npm install mysql2
```

### 2. Update Database Configuration

**src/config/database.js:**
```javascript
// Replace postgres configuration with:
if (isProduction) {
    connectionConfig = {
        type: 'mysql',
        url: process.env.DATABASE_URL,
        entities: [User],
        synchronize: true,
        logging: false,
        ssl: { rejectUnauthorized: false }
    };
} else {
    connectionConfig = {
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [User],
        synchronize: true,
        logging: false
    };
}
```

### 3. Update Environment Files

**.env (Development):**
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_NAME=alumni_db
DB_PASSWORD=your_mysql_password
JWT_SECRET=your-local-secret-key
PORT=8000
```

**.env.production:**
```bash
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=production-secret-key
PORT=8000
```

### 4. MySQL Production Options
- **PlanetScale**: `mysql://user:password@host/database?ssl={"rejectUnauthorized":true}`
- **AWS RDS**: `mysql://user:password@rds-endpoint:3306/database`
- **DigitalOcean**: `mysql://user:password@host:port/database?ssl-mode=REQUIRED`

## ☁️ Switching to Supabase

Supabase uses PostgreSQL under the hood but provides additional features.

### 1. Setup Supabase Project
1. Create account on [Supabase](https://supabase.com)
2. Create new project
3. Get connection details from Settings > Database

### 2. Update Environment Configuration

**.env.production:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=production-secret-key
PORT=8000
```

### 3. Optional: Add Supabase Client

If you want to use Supabase features beyond just the database:

```bash
npm install @supabase/supabase-js
```

**src/config/supabase.js:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## 🗄️ Other Storage/Database Options

### MongoDB with Mongoose
```bash
npm install mongoose
npm uninstall typeorm pg reflect-metadata
```

### Firebase Firestore
```bash
npm install firebase-admin
```

### AWS DynamoDB
```bash
npm install aws-sdk @aws-sdk/client-dynamodb
```

### SQLite (Development/Testing)
```bash
npm install sqlite3
```

Update `database.js` type to `'sqlite'` and set database path.

## 🚀 Deployment

### Vercel (Current)
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Heroku
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your-db-url
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

## 🧪 Testing Different Environments

### Test Environment Loading
```bash
node check-env.js
```

### Test Production Locally
```bash
npm run test:prod-local
```

### Test API Health
```bash
curl http://localhost:8000/health
```

## 🔐 Environment Variables Reference

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `NODE_ENV` | development | production | Environment mode |
| `DB_HOST` | localhost | - | Database host (dev only) |
| `DB_PORT` | 5432/3306 | - | Database port (dev only) |
| `DB_USER` | postgres/root | - | Database user (dev only) |
| `DB_PASSWORD` | password | - | Database password (dev only) |
| `DB_NAME` | alumni_db | - | Database name (dev only) |
| `DATABASE_URL` | - | full-url | Full connection string (prod) |
| `JWT_SECRET` | local-secret | secure-secret | JWT signing key |
| `PORT` | 8000 | 8000 | Server port |

## 📝 API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | No | Health check |
| POST | `/register` | No | User registration |
| POST | `/login` | No | User login |
| GET | `/users` | Yes | Get all users |
| GET | `/users/:id` | Yes | Get user by ID |

## 🛠️ Troubleshooting

### Database Connection Issues
1. Check environment variables: `node check-env.js`
2. Verify database credentials
3. Check network connectivity
4. Review SSL requirements for production

### Authentication Issues
1. Verify JWT_SECRET is set
2. Check token format in requests
3. Ensure Bearer token in Authorization header

### Environment Loading Issues
1. Check file names (.env vs .env.production)
2. Verify dotenv.config() calls
3. Check file encoding (UTF-8)

## 📚 Dependencies

### Core Dependencies
- `express` - Web framework
- `typeorm` - ORM for database operations
- `pg` - PostgreSQL driver
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cors` - Cross-origin requests
- `dotenv` - Environment configuration

### Development Dependencies
- `nodemon` - Development server
- `eslint` - Code linting
- `typescript` - Type checking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

This project is licensed under the ISC License.
