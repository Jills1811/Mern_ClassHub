# Classroom Clone

A full-stack classroom management application built with React and Express.js.

## Steps to Install Backend and Frontend

### Backend Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Frontend Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## How to Create .env Files

### Backend .env File

1. Copy the example file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration. Reference `backend/.env.example` for the required variables:
   - `MONGODB_URI` - MongoDB connection string (required)
   - `JWT_SECRET` - Secret key for JWT token generation (required)
   - `PORT` - Server port (optional, defaults to 5000)
   - `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (optional, for file uploads)
   - `CLOUDINARY_API_KEY` - Cloudinary API key (optional, for file uploads)
   - `CLOUDINARY_API_SECRET` - Cloudinary API secret (optional, for file uploads)
   - `GMAIL_USER` - Gmail address for sending emails (optional)
   - `GMAIL_PASS` or `GMAIL_APP_PASSWORD` - Gmail password or app password (optional)
   - `MAIL_FROM` - Email sender address (optional, defaults to GMAIL_USER)

### Frontend .env File

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration. Reference `frontend/.env.example` for the required variables:
   - `VITE_API_URL` - Backend API URL (e.g., `http://localhost:5000/api`)

## Database Setup Instructions

### Option 1: Restore Database Dump

1. Ensure MongoDB is running on your system.

2. Restore the database dump from the `db-backup` folder:
   ```bash
   mongorestore --db=classroom-clone db-backup/classroom-clone
   ```

   **Note:** The database name is `classroom-clone`. If you're using a different database name, update your `MONGODB_URI` in the backend `.env` file accordingly.

### Option 2: Run Seed Script (if available)

If a seed script is available, run it to populate the database with initial data:
   ```bash
   cd backend
   npm run seed
   ```

**Note:** If no seed script exists, you can create a new account through the registration page after starting the application.

## How to Run Project

### Start Backend Server

```bash
cd backend && npm run dev
```

The backend will run on `http://localhost:5000`

### Start Frontend Server

```bash
cd frontend && npm run dev
```

The frontend will run on `http://localhost:3000`
