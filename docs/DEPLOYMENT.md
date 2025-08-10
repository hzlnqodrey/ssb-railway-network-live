# Deployment Guide

## Overview

This guide covers deploying the Swiss Railway Network Live application to production environments. The application consists of a Next.js frontend and Node.js backend, both containerized with Docker.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/swiss-railway-network-live.git
cd swiss-railway-network-live

# Copy environment files
cp frontend/env.config.**example** frontend/.env.local
cp backend/env.config.example backend/.env.local

# Edit environment variables
nano frontend/.env.local
nano backend/.env.local
```

### 2. Docker Development

```bash
# Build and start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# WebSocket: ws://localhost:8000/ws
```

### 3. Manual Development

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (in another terminal)
cd backend
npm install
npm run dev
```

---

## Production Deployment

### Vercel (Frontend) + Railway/Render (Backend)

#### Frontend on Vercel

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Configure environment variables:

   ```env
   NEXT_PUBLIC_SBB_API_BASE_URL=https://transport.opendata.ch/v1
   NEXT_PUBLIC_APP_NAME=Swiss Railway Network Live
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   NEXT_PUBLIC_ENABLE_PWA=true
   ```

3. **Custom Domain** (Optional)
   - Add your domain in Vercel dashboard
   - Update DNS records

#### Backend on Railway

1. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Set root directory to `backend`
   - Configure environment variables:

   ```env
   NODE_ENV=production
   PORT=8000
   FRONTEND_URL=https://your-domain.vercel.app
   SBB_API_BASE_URL=https://transport.opendata.ch/v1
   ```

2. **Database Setup** (If needed)
   ```bash
   # Add PostgreSQL service in Railway
   # Update DATABASE_URL in environment
   ```

### Docker + Cloud Provider

#### Build Production Images

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

EXPOSE 8000
CMD ["npm", "start"]
```

#### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
```

### Kubernetes Deployment

#### Frontend Deployment

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swiss-railway-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: swiss-railway-frontend
  template:
    metadata:
      labels:
        app: swiss-railway-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/swiss-railway-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: swiss-railway-frontend-service
spec:
  selector:
    app: swiss-railway-frontend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swiss-railway-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: swiss-railway-backend
  template:
    metadata:
      labels:
        app: swiss-railway-backend
    spec:
      containers:
      - name: backend
        image: your-registry/swiss-railway-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "400m"
---
apiVersion: v1
kind: Service
metadata:
  name: swiss-railway-backend-service
spec:
  selector:
    app: swiss-railway-backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

---

## Environment Configuration

### Frontend Environment Variables

```env
# Required
NEXT_PUBLIC_SBB_API_BASE_URL=https://transport.opendata.ch/v1
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT=46.8182
NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG=8.2275
NEXT_PUBLIC_DEFAULT_MAP_ZOOM=8
```

### Backend Environment Variables

```env
# Required
NODE_ENV=production
PORT=8000
FRONTEND_URL=https://your-domain.com

# Optional
SBB_API_BASE_URL=https://transport.opendata.ch/v1
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## SSL/HTTPS Setup

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:8000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### Let's Encrypt SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Monitoring & Logging

### Health Checks

```yaml
# docker-compose monitoring
version: '3.8'

services:
  frontend:
    # ... existing config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    # ... existing config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Logging Setup

```javascript
// backend/src/middleware/logging.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
```

### Prometheus Metrics

```javascript
// backend/src/middleware/metrics.js
import prometheus from 'prom-client';

const register = new prometheus.Registry();

// Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);

export { register, httpRequestDuration, activeConnections };
```

---

## Performance Optimization

### Frontend Optimization

```javascript
// next.config.js production optimizations
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  // Compression
  compress: true,
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle analysis
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
```

### Backend Optimization

```javascript
// backend/src/server.js optimizations
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Start the actual server
  startServer();
}
```

---

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   ```bash
   # Check if backend is running
   curl http://localhost:8000/health
   
   # Check WebSocket endpoint
   wscat -c ws://localhost:8000/ws
   ```

2. **CORS Issues**
   ```javascript
   // backend/src/server.js
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   docker stats
   
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

4. **Rate Limiting**
   ```bash
   # Check rate limit headers
   curl -I http://localhost:8000/api/trains
   ```

### Debug Commands

```bash
# Container logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Container shell access
docker-compose exec frontend sh
docker-compose exec backend sh

# Database connection test
docker-compose exec backend npm run db:test

# Health check all services
curl http://localhost:8000/health/detailed
```

---

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Application Backup

```bash
# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  frontend/.env.local \
  backend/.env.local \
  docker-compose.yml \
  nginx.conf

# Full application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  .
```

---

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  frontend:
    # ... config
    deploy:
      replicas: 3

  backend:
    # ... config
    deploy:
      replicas: 2

  load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend
```

### Auto-scaling (Kubernetes)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: swiss-railway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: swiss-railway-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (no secrets in code)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Input validation on all endpoints
- [ ] Regular dependency updates
- [ ] Container security scanning
- [ ] Database connection encryption
- [ ] Monitoring and alerting configured

---

## Support

For deployment support:
- **Documentation**: [GitHub Wiki](https://github.com/your-org/swiss-railway-network/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/swiss-railway-network/issues)
- **Email**: devops@swiss-railway-live.com
