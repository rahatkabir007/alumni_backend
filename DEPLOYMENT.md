# Deployment Guide

## Environment Variables Setup

When deploying to production platforms (Vercel, Railway, Heroku, etc.), set these environment variables:

### Required Variables

```bash
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_here
PORT=8000
```

### Database Variables (Choose one approach)

**Option 1: Connection String (Recommended)**
```bash
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
```

**Option 2: Individual Parameters**
```bash
POSTGRES_HOST=your_db_host
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=your_db_name
```

### OAuth Variables

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### URL Variables

```bash
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
```

## Platform-Specific Instructions

### Vercel
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable listed above

### Railway
1. Go to your project
2. Click on Variables tab
3. Add each environment variable

### Heroku
1. Go to Settings > Config Vars
2. Add each variable

## Security Notes

- Never commit `.env` files with real credentials to Git
- Use strong, unique secrets for JWT_SECRET
- Ensure all OAuth redirects are properly configured
- Use HTTPS in production
