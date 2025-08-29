# Local Development Setup

This project has been configured to run locally on your machine. Follow these steps to set up and run the application.

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **PostgreSQL** database
3. **npm** package manager

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd school-tracking-app
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL
1. Install PostgreSQL on your machine
2. Create a new database:
   ```sql
   CREATE DATABASE school_tracking;
   ```
3. Create a user (optional):
   ```sql
   CREATE USER school_admin WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE school_tracking TO school_admin;
   ```

#### Option B: Use Docker (if you prefer)
```bash
docker run --name postgres-school \
  -e POSTGRES_DB=school_tracking \
  -e POSTGRES_USER=school_admin \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:13
```

### 3. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your database credentials:
   ```env
   DATABASE_URL=postgresql://school_admin:your_password@localhost:5432/school_tracking
   SESSION_SECRET=your-super-secret-session-key-here
   NODE_ENV=development
   PORT=5000
   ```

### 4. Initialize the Database

Run the following command to create the database tables:

```bash
npm run db:push
```

### 5. Start the Application

```bash
npm run dev
```

The application will start on `http://localhost:5000`

## Default Login Credentials

For local development, a default admin account is automatically created:

- **Email**: `admin@school.com`
- **Password**: `admin123`

**Important**: Change these credentials in production!

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Sync database schema
- `npm run check` - Run TypeScript type checking

## Authentication System

The application uses different authentication systems based on the environment:

- **Local Development**: Username/password authentication with session storage
- **Replit/Production**: OpenID Connect (OIDC) authentication with Replit

## Database Schema

The application creates the following tables:
- `users` - Teacher and admin accounts
- `students` - Student records
- `classes` - Course/subject information
- `assignments` - Assignment details
- `grades` - Grade records
- `enrollments` - Student-class relationships
- `sessions` - Session storage

## Features

- **Dashboard**: Overview of classes, students, and recent activity
- **Student Management**: Add, edit, and manage student records
- **Grade Tracking**: Enter and track student grades
- **Assignment Management**: Create and manage assignments
- **Class Management**: Organize students into classes
- **Role-based Access**: Teacher and admin user roles

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your DATABASE_URL in `.env`
- Verify database credentials and permissions

### Port Already in Use
- Change the PORT in `.env` to a different value (e.g., 3000, 8080)

### Missing Dependencies
- Run `npm install` to ensure all packages are installed
- Try deleting `node_modules` and running `npm install` again

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables for Production
Ensure these environment variables are set:
- `DATABASE_URL` - Production database connection string
- `SESSION_SECRET` - Secure random string
- `NODE_ENV=production`

### Database Migration
When deploying to production, run:
```bash
npm run db:push
```

## Support

If you encounter any issues during setup, check:
1. Database connection and credentials
2. Node.js version compatibility
3. All required environment variables are set
4. PostgreSQL service is running