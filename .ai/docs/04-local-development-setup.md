# Local Development Setup

## Overview

This guide will walk you through setting up the AI Chatbot project on your local machine for development. Follow these steps carefully to ensure a smooth development experience.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

### Required Software

1. **Node.js** (version 18.17 or later)

   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **pnpm** (version 9.12.3 or later)

   - Install globally: `npm install -g pnpm`
   - Verify installation: `pnpm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

### Optional but Recommended

4. **Vercel CLI** (for environment variable management)

   - Install globally: `npm install -g vercel`
   - Verify installation: `vercel --version`

5. **Docker** (for local database development)
   - Download from [docker.com](https://www.docker.com/)
   - Verify installation: `docker --version`

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/vercel/ai-chatbot.git
cd ai-chatbot

# Or if you forked the repository
git clone https://github.com/YOUR_USERNAME/ai-chatbot.git
cd ai-chatbot
```

## Step 2: Install Dependencies

```bash
# Install all project dependencies
pnpm install
```

This will install all dependencies listed in [`package.json`](../package.json), including:

- Next.js and React
- Vercel AI SDK
- Database and authentication libraries
- UI components and styling libraries
- Development and testing tools

## Step 3: Environment Variables Setup

### Option A: Using Vercel CLI (Recommended)

If you're planning to deploy on Vercel, this is the easiest method:

```bash
# Link your local project to Vercel
vercel link

# Pull environment variables from Vercel
vercel env pull
```

This creates a `.env.local` file with all necessary environment variables.

### Option B: Manual Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in the required values:

```bash
# Generate a random secret for authentication
AUTH_SECRET=your-32-character-random-string

# Get your xAI API Key from https://console.x.ai/
XAI_API_KEY=your-xai-api-key

# Database connection string (see database setup below)
POSTGRES_URL=your-postgres-connection-string

# Vercel Blob storage token (for file uploads)
BLOB_READ_WRITE_TOKEN=your-blob-token

# Redis connection string (optional, for caching)
REDIS_URL=your-redis-connection-string
```

### Environment Variables Explained

| Variable                | Purpose                    | Required | How to Get                                       |
| ----------------------- | -------------------------- | -------- | ------------------------------------------------ |
| `AUTH_SECRET`           | NextAuth.js encryption key | Yes      | Generate with `openssl rand -base64 32`          |
| `XAI_API_KEY`           | xAI Grok API access        | Yes      | Sign up at [console.x.ai](https://console.x.ai/) |
| `POSTGRES_URL`          | Database connection        | Yes      | See database setup section                       |
| `BLOB_READ_WRITE_TOKEN` | File storage               | Optional | Vercel Blob setup                                |
| `REDIS_URL`             | Caching and sessions       | Optional | Redis provider or local Redis                    |

## Step 4: Database Setup

### Option A: Using Vercel Postgres (Recommended for Production)

1. Create a Vercel Postgres database:

   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Create a new project or select existing
   - Go to Storage tab → Create Database → Postgres

2. Copy the connection string to your `.env.local`:
   ```bash
   POSTGRES_URL="postgres://username:password@host:port/database"
   ```

### Option B: Local PostgreSQL with Docker

1. Create a `docker-compose.yml` file in the project root:

   ```yaml
   version: "3.8"
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: ai_chatbot
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

2. Start the database:

   ```bash
   docker-compose up -d
   ```

3. Set your connection string:
   ```bash
   POSTGRES_URL="postgres://postgres:password@localhost:5432/ai_chatbot"
   ```

### Option C: Local PostgreSQL Installation

1. Install PostgreSQL on your system
2. Create a database:
   ```sql
   CREATE DATABASE ai_chatbot;
   ```
3. Set your connection string in `.env.local`

## Step 5: Database Migration

Run the database migrations to set up the schema:

```bash
# Generate migration files (if needed)
pnpm db:generate

# Run migrations
pnpm db:migrate

# Optional: Open Drizzle Studio to view your database
pnpm db:studio
```

## Step 6: Additional Service Setup (Optional)

### Redis Setup

For caching and session management:

**Option A: Vercel KV (Recommended)**

1. Create a KV store in your Vercel dashboard
2. Add the connection string to `.env.local`

**Option B: Local Redis with Docker**

```bash
# Add to your docker-compose.yml
redis:
  image: redis:7
  ports:
    - "6379:6379"
```

### Blob Storage Setup

For file uploads:

1. Create a Vercel Blob store in your dashboard
2. Copy the read/write token to `.env.local`

## Step 7: Start Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Development Scripts

| Script             | Purpose                             |
| ------------------ | ----------------------------------- |
| `pnpm dev`         | Start development server with Turbo |
| `pnpm build`       | Build for production                |
| `pnpm start`       | Start production server             |
| `pnpm lint`        | Run ESLint and Biome                |
| `pnpm lint:fix`    | Fix linting issues                  |
| `pnpm format`      | Format code with Biome              |
| `pnpm test`        | Run Playwright tests                |
| `pnpm db:studio`   | Open database GUI                   |
| `pnpm db:generate` | Generate migration files            |
| `pnpm db:migrate`  | Run database migrations             |

## Step 8: Verify Setup

### 1. Check the Application

Visit [http://localhost:3000](http://localhost:3000) and verify:

- [ ] The page loads without errors
- [ ] You can navigate to the login page
- [ ] The UI renders correctly

### 2. Test Authentication

- [ ] Create a new account
- [ ] Log in with your credentials
- [ ] Access the chat interface

### 3. Test AI Integration

- [ ] Send a message in the chat
- [ ] Verify you receive an AI response
- [ ] Check that messages are saved

### 4. Test Database Connection

```bash
# Open Drizzle Studio
pnpm db:studio
```

Verify you can see your database tables and data.

## Troubleshooting

### Common Issues

**1. Port 3000 already in use**

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
pnpm dev -- --port 3001
```

**2. Database connection errors**

- Verify your `POSTGRES_URL` is correct
- Ensure your database is running
- Check firewall settings

**3. Missing environment variables**

```bash
# Verify your .env.local file exists and has all required variables
cat .env.local
```

**4. AI API errors**

- Verify your `XAI_API_KEY` is valid
- Check your API usage limits
- Ensure you have sufficient credits

**5. Build errors**

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/vercel/ai-chatbot/issues)
2. Review the error logs in your terminal
3. Verify all environment variables are set correctly
4. Ensure all services (database, Redis) are running

## Development Workflow

### Recommended Development Flow

```mermaid
graph TD
    A[Pull latest changes] --> B[Install dependencies]
    B --> C[Update environment variables]
    C --> D[Run migrations]
    D --> E[Start dev server]
    E --> F[Make changes]
    F --> G[Test locally]
    G --> H{Tests pass?}
    H -->|No| F
    H -->|Yes| I[Commit changes]
    I --> J[Push to repository]
```

### Code Quality Tools

The project includes several tools to maintain code quality:

- **ESLint**: JavaScript/TypeScript linting
- **Biome**: Fast formatter and linter
- **TypeScript**: Type checking
- **Playwright**: End-to-end testing

Run these before committing:

```bash
# Check and fix code quality
pnpm lint:fix
pnpm format

# Run tests
pnpm test
```

## Next Steps

Now that your development environment is set up, you're ready to:

1. Explore the [Key Technologies and Concepts](./05-key-technologies-and-concepts.md)
2. Learn about the project's architecture
3. Start contributing to the codebase

Happy coding! 🚀
