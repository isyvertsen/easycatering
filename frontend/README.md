# Catering System Frontend

Next.js 15 frontend for the Larvik Kommune Catering Management System.

## Features

- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui component library
- Google OAuth authentication
- JWT-based authentication
- React Query for data fetching
- BDD testing with Jest and React Testing Library
- Docker support

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── layout/      # Layout components
│   │   ├── dashboard/   # Dashboard components
│   │   └── crud/        # CRUD components
│   ├── lib/             # Utility functions and API client
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   └── styles/          # Global styles
├── public/              # Static assets
└── __tests__/          # Test files
```

## Development

### Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and configure
3. Run development server: `npm run dev`

### Running

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# With Docker
docker-compose up frontend
```

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:ci
```

## Environment Variables

Create a `.env.local` file with:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Key Features

### Authentication
- Email/password login
- Google OAuth integration
- Protected routes with middleware
- JWT token management

### Dashboard
- Overview statistics
- Quick actions for common tasks
- Recent activity feed

### CRUD Operations
- Generic table view for all database tables
- Create, read, update, delete functionality
- Search and pagination
- Dynamic form generation based on table schema

### Recipe Management
- Recipe creation and editing
- Ingredient management
- Nutritional information
- Menu planning

### Order Management
- Order creation and tracking
- Customer management
- Delivery scheduling
- Order history

## Design Principles

- **BDD**: Behavior-driven development with user stories
- **SOLID**: Following SOLID principles for maintainable code
- **KISS**: Keep it simple and straightforward
- **API-First**: All data fetching through the backend API