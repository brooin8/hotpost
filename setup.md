# Cross-Listing App Setup Guide

## Prerequisites

Before you can run the application, you need:

1. **PostgreSQL** installed and running
2. **Node.js** (v16 or higher) installed
3. **API Keys** from marketplaces (optional for testing)

## Quick Start

### 1. Database Setup

First, make sure PostgreSQL is installed and running. Then:

```bash
# Create database (if using default PostgreSQL installation)
psql -U postgres -c "CREATE DATABASE crosslisting_db;"
```

Or use pgAdmin to create a database named `crosslisting_db`.

### 2. Backend Setup

```bash
cd backend

# Install dependencies (already done)
npm install

# Update .env file with your database credentials
# Edit backend/.env and update DATABASE_URL with your PostgreSQL credentials

# Run database migrations
npx prisma migrate dev --name init

# Start the backend server
npm run start:dev
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start the frontend development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Testing the Application

### Without Marketplace APIs:

1. **Sign Up**: Create a new account
2. **Add Products**: Use the Products page to add products manually
3. **Import CSV**: Test CSV import with the template
4. **View Dashboard**: Check analytics and metrics

### With Marketplace APIs:

1. **Get API Keys**:
   - eBay: https://developer.ebay.com/
   - Etsy: https://www.etsy.com/developers/

2. **Update .env**: Add your API keys to `backend/.env`

3. **Connect Marketplaces**: Use the marketplace connection feature

4. **Cross-List Products**: Select products and marketplaces to list

## Features Available

- ✅ User authentication (signup/login)
- ✅ Product management (CRUD operations)
- ✅ CSV import/export
- ✅ Dashboard with analytics
- ✅ Real-time updates via WebSocket
- ✅ Marketplace integration (with API keys)
- ✅ Smart Etsy relisting
- ✅ Inventory sync across marketplaces

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Ensure PostgreSQL is running
2. Check credentials in `backend/.env`
3. Make sure the database exists

### Port Already in Use

If ports 3000 or 5173 are in use:

1. Backend: Change PORT in `backend/.env`
2. Frontend: Vite will automatically use the next available port

### Missing Dependencies

If you get module not found errors:

```bash
# In backend folder
npm install

# In frontend folder  
npm install
```

## Development Mode Features

- Hot reload on both frontend and backend
- WebSocket connections for real-time updates
- Detailed error messages in console

## Next Steps

1. Configure marketplace API credentials
2. Customize product categories
3. Set up production environment variables
4. Deploy to production servers
