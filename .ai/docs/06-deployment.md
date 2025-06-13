# Deployment Guide

## Overview

This guide covers deploying the AI Chatbot application to production. The application is optimized for deployment on Vercel, but can also be deployed to other platforms that support Next.js applications.

## Vercel Deployment (Recommended)

Vercel provides the best experience for Next.js applications with zero-configuration deployment, automatic scaling, and integrated services.

### Prerequisites

- GitHub, GitLab, or Bitbucket account
- Vercel account (free tier available)
- Project pushed to a Git repository

### One-Click Deployment

The fastest way to deploy is using the one-click deployment button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai)

This will:

1. Fork the repository to your GitHub account
2. Create a new Vercel project
3. Set up required integrations
4. Deploy your application

### Manual Deployment Steps

#### Step 1: Connect Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Select the repository containing your AI Chatbot code

#### Step 2: Configure Project Settings

```bash
# Build settings (auto-detected for Next.js)
Framework Preset: Next.js
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install
Development Command: pnpm dev
```

#### Step 3: Environment Variables

Set up the required environment variables in your Vercel project:

| Variable                | Value                      | Required |
| ----------------------- | -------------------------- | -------- |
| `AUTH_SECRET`           | Random 32-character string | Yes      |
| `XAI_API_KEY`           | Your xAI API key           | Yes      |
| `POSTGRES_URL`          | Database connection string | Yes      |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token          | Optional |
| `REDIS_URL`             | Redis connection string    | Optional |

```bash
# Generate AUTH_SECRET
openssl rand -base64 32
```

#### Step 4: Set Up Integrations

The deployment process will automatically set up these integrations:

1. **xAI Integration**: For AI model access
2. **Neon Database**: PostgreSQL database
3. **Vercel Blob**: File storage
4. **Upstash Redis**: Caching and sessions

### Deployment Flow

```mermaid
graph TD
    A[Push to Git] --> B[Vercel Webhook]
    B --> C[Build Process]
    C --> D[Install Dependencies]
    D --> E[Run Database Migrations]
    E --> F[Build Next.js App]
    F --> G[Deploy to Edge Network]
    G --> H[Update DNS]
    H --> I[Deployment Complete]

    C --> J[Environment Variables]
    J --> E

    I --> K[Automatic HTTPS]
    I --> L[Global CDN]
    I --> M[Analytics]
```

## Database Setup for Production

### Option 1: Vercel Postgres (Recommended)

1. **Create Database**:

   - Go to your Vercel dashboard
   - Navigate to Storage tab
   - Click "Create Database" → "Postgres"
   - Choose a region close to your users

2. **Connection Setup**:

   ```bash
   # Automatically added to environment variables
   POSTGRES_URL="postgres://username:password@host:port/database"
   POSTGRES_PRISMA_URL="postgres://username:password@host:port/database?pgbouncer=true&connect_timeout=15"
   POSTGRES_URL_NON_POOLING="postgres://username:password@host:port/database"
   ```

3. **Run Migrations**:
   ```bash
   # Migrations run automatically during build
   # Or run manually with Vercel CLI
   vercel env pull
   pnpm db:migrate
   ```

### Option 2: External PostgreSQL

You can use any PostgreSQL provider:

- **Neon**: Serverless PostgreSQL
- **Supabase**: Open-source Firebase alternative
- **PlanetScale**: MySQL-compatible serverless database
- **Railway**: Simple cloud database hosting
- **AWS RDS**: Amazon's managed database service

```bash
# Set your database URL in Vercel environment variables
POSTGRES_URL="your-database-connection-string"
```

## File Storage Setup

### Vercel Blob (Recommended)

1. **Create Blob Store**:

   - Go to Vercel dashboard → Storage
   - Click "Create Database" → "Blob"
   - Copy the read/write token

2. **Environment Variable**:
   ```bash
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxx"
   ```

### Alternative Storage Options

```typescript
// lib/storage.ts - Custom storage adapter
export interface StorageAdapter {
  upload(file: File): Promise<string>;
  delete(url: string): Promise<void>;
}

// AWS S3 implementation
export class S3StorageAdapter implements StorageAdapter {
  async upload(file: File): Promise<string> {
    // S3 upload logic
    return "https://bucket.s3.amazonaws.com/file.jpg";
  }

  async delete(url: string): Promise<void> {
    // S3 delete logic
  }
}
```

## Caching Setup (Optional)

### Vercel KV (Redis)

1. **Create KV Store**:

   - Go to Vercel dashboard → Storage
   - Click "Create Database" → "KV"
   - Copy the connection details

2. **Environment Variables**:
   ```bash
   KV_URL="redis://..."
   KV_REST_API_URL="https://..."
   KV_REST_API_TOKEN="..."
   KV_REST_API_READ_ONLY_TOKEN="..."
   ```

## AI Provider Setup

### xAI (Default)

1. **Get API Key**:

   - Visit [console.x.ai](https://console.x.ai/)
   - Create an account and generate an API key
   - Add credits to your account

2. **Environment Variable**:
   ```bash
   XAI_API_KEY="xai-xxxxxxxxxx"
   ```

### Multiple Providers

```typescript
// lib/ai/providers.ts
import { xai } from "@ai-sdk/xai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export const providers = {
  xai: xai("grok-2-1212"),
  openai: openai("gpt-4"),
  anthropic: anthropic("claude-3-sonnet-20240229"),
};

// Environment variables needed
// XAI_API_KEY=xai-xxxxxxxxxx
// OPENAI_API_KEY=sk-xxxxxxxxxx
// ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

## Custom Domain Setup

### Add Custom Domain

1. **In Vercel Dashboard**:

   - Go to your project settings
   - Click "Domains"
   - Add your custom domain

2. **DNS Configuration**:

   ```bash
   # Add CNAME record to your DNS provider
   CNAME: your-domain.com → cname.vercel-dns.com

   # Or A record for apex domain
   A: @ → 76.76.19.61
   ```

3. **SSL Certificate**:
   - Automatically provisioned by Vercel
   - Supports wildcard certificates
   - Auto-renewal included

## Environment-Specific Configuration

### Production Environment Variables

```bash
# Production-specific settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Analytics and monitoring
VERCEL_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id

# Error tracking (optional)
SENTRY_DSN=your-sentry-dsn
```

### Staging Environment

Create a separate branch for staging deployments:

```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Vercel will automatically create a staging deployment
# Access at: https://your-project-git-staging-username.vercel.app
```

## Performance Optimization

### Build Optimization

```typescript
// next.config.ts
const nextConfig = {
  // Enable experimental features
  experimental: {
    ppr: true, // Partial Prerendering
    reactCompiler: true, // React Compiler
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Compression
  compress: true,

  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === "true" && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    },
  }),
};
```

### Database Performance

```typescript
// lib/db/connection.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Connection pooling for production
const connectionString = process.env.POSTGRES_URL!;

const client = postgres(connectionString, {
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout
});

export const db = drizzle(client);
```

## Monitoring and Analytics

### Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Error Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Custom error boundary
export function ErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] AI API keys valid and funded
- [ ] File storage configured
- [ ] Custom domain DNS configured
- [ ] SSL certificate provisioned

### Post-Deployment

- [ ] Application loads correctly
- [ ] Authentication works
- [ ] AI chat functionality works
- [ ] File uploads work
- [ ] Database connections stable
- [ ] Performance metrics acceptable
- [ ] Error monitoring active

### Testing Production

```bash
# Test critical user flows
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# Check health endpoints
curl https://your-domain.com/api/health
```

## Alternative Deployment Platforms

### Netlify

```bash
# netlify.toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Railway

```bash
# railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/api/health"
  }
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## Troubleshooting Deployment Issues

### Common Issues

1. **Build Failures**:

   ```bash
   # Check build logs in Vercel dashboard
   # Common causes:
   # - Missing environment variables
   # - TypeScript errors
   # - Dependency conflicts
   ```

2. **Database Connection Issues**:

   ```bash
   # Verify connection string format
   # Check database server status
   # Ensure migrations have run
   ```

3. **API Route Errors**:
   ```bash
   # Check function logs in Vercel dashboard
   # Verify environment variables
   # Test API endpoints locally first
   ```

### Getting Help

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [GitHub Issues](https://github.com/vercel/ai-chatbot/issues)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

## Next Steps

Your application is now deployed! Next, learn about:

1. [Contribution Guidelines](./07-contribution-guidelines.md) - How to contribute to the project
2. Monitoring and maintaining your deployment
3. Scaling your application as it grows

Congratulations on successfully deploying your AI Chatbot! 🎉
