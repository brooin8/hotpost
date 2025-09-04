# Cross-Listing Application

An advanced cross-listing application for managing and syncing product listings across multiple marketplaces including eBay, Etsy, and Whatnot.

## Features

- 🔐 **Secure Authentication**: OAuth integration with marketplaces
- 📊 **Live Dashboard**: Real-time metrics and analytics
- 📁 **CSV Import/Export**: Bulk product management
- 💰 **Smart Etsy Relisting**: Save $0.20 per listing by editing instead of recreating
- 🔄 **Cross-Platform Sync**: List products across multiple marketplaces simultaneously
- ✏️ **Bulk Editing**: Update multiple listings at once
- 📈 **Analytics**: Track sales, views, and inventory across platforms

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets for live updates
- **File Storage**: S3/Cloudinary for images

## Getting Started

### Prerequisites

- Node.js v18+ and npm v9+
- PostgreSQL 14+
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd listing-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Set up the database:
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

5. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api

## Project Structure

```
listing-app/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
├── backend/           # NestJS backend API
│   ├── src/
│   │   ├── auth/
│   │   ├── products/
│   │   ├── marketplaces/
│   │   ├── csv/
│   │   └── dashboard/
│   └── prisma/
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Marketplace Integration Status

| Marketplace | Status | Features |
|------------|--------|----------|
| eBay | ✅ Ready | Full API integration |
| Etsy | ✅ Ready | Smart relisting support |
| Whatnot | 🚧 In Progress | Basic support |
| Facebook | 📋 Planned | - |
| Mercari | 📋 Planned | - |
| OfferUp | 📋 Planned | - |
| Craigslist | 📋 Planned | - |

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Contributing

Please read our contributing guidelines before submitting PRs.

## License

MIT
