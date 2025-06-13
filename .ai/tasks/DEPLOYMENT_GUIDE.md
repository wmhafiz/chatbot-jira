# Production Deployment Guide

This guide covers the deployment preparation and production setup for the Production Support Chatbot.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Database Preparation](#database-preparation)
3. [Performance Optimizations](#performance-optimizations)
4. [Security Configuration](#security-configuration)
5. [Monitoring Setup](#monitoring-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Health Checks](#health-checks)
8. [Backup and Recovery](#backup-and-recovery)
9. [Scaling Considerations](#scaling-considerations)
10. [Troubleshooting](#troubleshooting)

## Environment Setup

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
POSTGRES_URL="postgresql://username:password@host:5432/database"

# Authentication
AUTH_SECRET="your-secure-auth-secret-here"

# AI/LLM Configuration
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Jira Integration
JIRA_BASE_URL="https://your-company.atlassian.net"
JIRA_EMAIL="service-account@company.com"
JIRA_API_TOKEN="your-jira-api-token"
JIRA_PROJECT_KEY="SUPPORT"

# Client-side Jira links
NEXT_PUBLIC_JIRA_BASE_URL="https://your-company.atlassian.net"

# Redis (for caching and job queue)
REDIS_URL="redis://username:password@host:6379"

# Monitoring and Logging
LOG_LEVEL="INFO"
LOG_DIRECTORY="/var/log/chatbot"

# Production URLs
VERCEL_PROJECT_PRODUCTION_URL="your-production-url"
NEXTAUTH_URL="https://your-domain.com"

# Performance
NODE_ENV="production"
```

### System Requirements

**Minimum Requirements:**

- CPU: 2 vCPUs
- RAM: 4GB
- Storage: 20GB SSD
- Network: 1Gbps

**Recommended for Production:**

- CPU: 4+ vCPUs
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 1Gbps+

## Database Preparation

### 1. Database Setup

```sql
-- Create production database
CREATE DATABASE production_chatbot;

-- Create dedicated user
CREATE USER chatbot_prod WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE production_chatbot TO chatbot_prod;

-- Enable required extensions
\c production_chatbot;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For pgvector if using
```

### 2. Run Migrations

```bash
# Set production database URL
export POSTGRES_URL="postgresql://chatbot_prod:password@host:5432/production_chatbot"

# Run migrations
npm run db:migrate

# Verify migration status
npm run db:check
```

### 3. Performance Indexes

The performance indexes migration (`0010_performance_indexes.sql`) includes:

- Full-text search indexes for KB articles and Jira tickets
- Composite indexes for common query patterns
- Partial indexes for active/open items

### 4. Database Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="production_chatbot"

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

## Performance Optimizations

### 1. Caching Strategy

**Redis Configuration:**

```redis
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

**Cache Layers:**

- Vector search results (5 minutes)
- KB entries (1 hour)
- Jira tickets (5 minutes)
- Analytics data (30 minutes)
- Embeddings (24 hours)

### 2. Database Optimizations

**PostgreSQL Configuration:**

```postgresql
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 3. Application Optimizations

- **Connection Pooling**: Configured in `lib/db/queries.ts`
- **Background Jobs**: Automatic processing via job queue
- **Response Compression**: Enabled in Next.js config
- **Static Asset Optimization**: CDN integration recommended

## Security Configuration

### 1. Environment Security

```bash
# Set secure file permissions
chmod 600 .env.production

# Use secrets management (recommended)
# AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
```

### 2. Database Security

```sql
-- Restrict database access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO chatbot_prod;

-- Enable row-level security where applicable
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
```

### 3. API Security

- Rate limiting implemented in middleware
- Input validation on all endpoints
- CORS configuration for allowed origins
- API key rotation procedures documented

### 4. Network Security

```nginx
# nginx.conf security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'";
```

## Monitoring Setup

### 1. Health Check Endpoints

- **Basic Health**: `GET /api/health`
- **Detailed Health**: `GET /api/health?detailed=true`
- **Prometheus Metrics**: `GET /api/health?format=prometheus`

### 2. Logging Configuration

```bash
# Create log directory
sudo mkdir -p /var/log/chatbot
sudo chown app:app /var/log/chatbot

# Logrotate configuration
# /etc/logrotate.d/chatbot
/var/log/chatbot/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 app app
}
```

### 3. Performance Monitoring

- Response time tracking
- Error rate monitoring
- Resource usage alerts
- Custom business metrics

### 4. Alerting Rules

```yaml
# Example alerting rules
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m

  - name: slow_response_time
    condition: p95_response_time > 2000ms
    duration: 10m

  - name: database_connection_failure
    condition: db_health != "healthy"
    duration: 1m
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:all
      - run: npm run lint
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Your deployment script here
          ./scripts/deploy.sh
```

### 2. Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# Build application
npm ci --production
npm run build

# Run database migrations
npm run db:migrate

# Restart application services
sudo systemctl restart chatbot
sudo systemctl restart chatbot-jobs

# Wait for health check
sleep 30
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment completed successfully!"
```

### 3. Zero-Downtime Deployment

```bash
# Blue-green deployment script
#!/bin/bash

CURRENT_PORT=$(cat /var/run/chatbot/current_port)
NEW_PORT=$((CURRENT_PORT == 3000 ? 3001 : 3000))

# Start new version
PORT=$NEW_PORT npm start &
NEW_PID=$!

# Wait for new version to be ready
sleep 30
curl -f http://localhost:$NEW_PORT/api/health

# Update load balancer
echo $NEW_PORT > /var/run/chatbot/current_port
sudo nginx -s reload

# Stop old version
kill $OLD_PID

echo "Zero-downtime deployment completed"
```

## Health Checks

### 1. Application Health

```bash
# Basic health check
curl -f http://localhost:3000/api/health

# Detailed health check
curl -f http://localhost:3000/api/health?detailed=true
```

### 2. Database Health

```sql
-- Check database connectivity
SELECT 1;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Redis Health

```bash
# Check Redis connectivity
redis-cli ping

# Check memory usage
redis-cli info memory
```

## Backup and Recovery

### 1. Database Backup

```bash
# Full backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 2. Application Data Backup

```bash
# Backup uploaded files (if any)
tar -czf files_backup_$(date +%Y%m%d).tar.gz /app/uploads/

# Backup configuration
cp .env.production config_backup_$(date +%Y%m%d).env
```

### 3. Recovery Procedures

```bash
# Database recovery
gunzip -c backup_20231201.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Application recovery
tar -xzf files_backup_20231201.tar.gz -C /
```

## Scaling Considerations

### 1. Horizontal Scaling

- Load balancer configuration
- Session management (Redis-based)
- Database read replicas
- CDN for static assets

### 2. Vertical Scaling

- CPU and memory monitoring
- Database connection pooling
- Cache optimization
- Background job processing

### 3. Auto-scaling Rules

```yaml
# Example auto-scaling configuration
scaling:
  min_instances: 2
  max_instances: 10
  target_cpu: 70%
  target_memory: 80%
  scale_up_cooldown: 300s
  scale_down_cooldown: 600s
```

## Troubleshooting

### 1. Common Issues

**Database Connection Issues:**

```bash
# Check database connectivity
pg_isready -h $DB_HOST -p 5432

# Check connection limits
psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity;"
```

**Redis Connection Issues:**

```bash
# Check Redis connectivity
redis-cli -h $REDIS_HOST ping

# Check Redis memory
redis-cli -h $REDIS_HOST info memory
```

**Performance Issues:**

```bash
# Check application logs
tail -f /var/log/chatbot/app.log

# Check system resources
htop
iostat -x 1
```

### 2. Log Analysis

```bash
# Error analysis
grep "ERROR" /var/log/chatbot/*.log | tail -100

# Performance analysis
grep "PERFORMANCE" /var/log/chatbot/*.log | grep "duration" | sort -k5 -nr
```

### 3. Emergency Procedures

**Service Restart:**

```bash
sudo systemctl restart chatbot
sudo systemctl restart chatbot-jobs
```

**Emergency Maintenance Mode:**

```bash
# Enable maintenance mode
touch /var/run/chatbot/maintenance

# Disable maintenance mode
rm /var/run/chatbot/maintenance
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Performance indexes created
- [ ] Redis configured and running
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Monitoring and alerting setup
- [ ] Backup procedures tested
- [ ] Health checks responding
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team training completed

## Support Contacts

- **Technical Lead**: [email]
- **DevOps Team**: [email]
- **Database Admin**: [email]
- **Security Team**: [email]

## Additional Resources

- [API Documentation](./API_DOCS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Security Guidelines](./SECURITY.md)
- [Performance Tuning](./PERFORMANCE.md)
