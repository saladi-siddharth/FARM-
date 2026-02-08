# 🚀 DEPLOYMENT GUIDE FOR 100K+ USERS

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Load Testing](#load-testing)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## 🏃 Quick Start

### Install Dependencies
```bash
npm install
```

### Install Redis (Required for Scalability)

**Windows:**
```bash
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:alpine
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### Run in Development Mode
```bash
npm run dev
```

### Run with Clustering (Multi-Core)
```bash
npm run cluster
```

### Run with PM2 (Production)
```bash
npm run pm2:start
```

---

## 💻 Local Development

### 1. Standard Mode (Single Process)
```bash
npm start
```
- **Capacity:** ~100 concurrent users
- **CPU Usage:** Single core
- **Best for:** Development, testing

### 2. Cluster Mode (Multi-Process)
```bash
npm run cluster
```
- **Capacity:** ~1,000 concurrent users per core
- **CPU Usage:** All cores
- **Best for:** Local performance testing

### 3. PM2 Mode (Production-like)
```bash
npm run pm2:start    # Start
npm run pm2:logs     # View logs
npm run pm2:monit    # Monitor
npm run pm2:stop     # Stop
```
- **Capacity:** 10,000+ concurrent users
- **CPU Usage:** All cores with auto-restart
- **Best for:** Staging, production

---

## 🌐 Production Deployment

### Option 1: Render.com (Recommended for Beginners)

#### Step 1: Prepare Repository
```bash
git add .
git commit -m "Production ready"
git push origin main
```

#### Step 2: Create Render Services

1. **Web Service (Application)**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Settings:
     - **Name:** smart-farm-api
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm run pm2:start`
     - **Instance Type:** Standard (or higher)
     - **Instances:** 3+ (for load balancing)

2. **Redis Instance**
   - Click "New +" → "Redis"
   - Choose plan (free for testing, paid for production)
   - Copy connection URL

3. **Environment Variables**
   Add all variables from `.env`:
   ```
   JWT_SECRET=your-production-secret
   SESSION_SECRET=your-production-secret
   DB_HOST=your-tidb-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=your-db-name
   DB_PORT=4000
   EMAIL_USER=your-email
   EMAIL_PASS=your-app-password
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   APP_URL=https://your-app.onrender.com
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Access at: `https://your-app.onrender.com`

#### Step 3: Scale Up
- Go to service settings
- Increase instance count: 3, 5, or 10
- Render automatically load balances

---

### Option 2: AWS/GCP (Advanced)

#### Architecture
```
[CloudFlare CDN]
      ↓
[AWS ALB/GCP Load Balancer]
      ↓
[EC2/Compute Engine Instances (Auto-scaling)]
      ↓
[ElastiCache/Memorystore (Redis)]
      ↓
[RDS/Cloud SQL (Database)]
```

#### Step 1: Set Up Infrastructure

**AWS Example:**
```bash
# 1. Create EC2 instances (t3.medium or larger)
# 2. Set up Application Load Balancer
# 3. Configure Auto Scaling Group
# 4. Create ElastiCache Redis cluster
# 5. Use RDS or keep TiDB Cloud
```

#### Step 2: Deploy Application
```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-instance

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone repository
git clone https://github.com/saladi-siddharth/FARM-.git
cd FARM-

# Install dependencies
npm install

# Set environment variables
nano .env
# (paste your production variables)

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Step 3: Configure Nginx Load Balancer
```bash
# Install Nginx
sudo apt-get install nginx

# Copy nginx.conf
sudo cp nginx.conf /etc/nginx/sites-available/smart-farm
sudo ln -s /etc/nginx/sites-available/smart-farm /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: SSL Certificate
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

### Option 3: Docker + Kubernetes (Enterprise)

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "run", "pm2:start"]
```

#### Build and Push
```bash
docker build -t smart-farm-api:latest .
docker tag smart-farm-api:latest your-registry/smart-farm-api:latest
docker push your-registry/smart-farm-api:latest
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-farm-api
spec:
  replicas: 10
  selector:
    matchLabels:
      app: smart-farm-api
  template:
    metadata:
      labels:
        app: smart-farm-api
    spec:
      containers:
      - name: api
        image: your-registry/smart-farm-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        # Add other env vars from ConfigMap/Secrets
```

---

## 🧪 Load Testing

### Install Artillery
```bash
npm install -g artillery
```

### Create Test Script (`load-test.yml`)
```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 100
      name: "Warm up"
    - duration: 300
      arrivalRate: 1000
      name: "Sustained load"
    - duration: 120
      arrivalRate: 5000
      name: "Spike test"

scenarios:
  - name: "User flow"
    flow:
      - get:
          url: "/health"
      - post:
          url: "/api/auth/signin"
          json:
            email: "test@example.com"
            password: "password123"
      - get:
          url: "/api/dashboard"
```

### Run Test
```bash
artillery run load-test.yml
```

### Expected Results
- **Response Time:** < 100ms (p95)
- **Error Rate:** < 0.1%
- **Throughput:** 10,000+ req/s

---

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit              # Real-time monitoring
pm2 logs               # View logs
pm2 status             # Check status
```

### Application Metrics
```bash
# Install PM2 Plus (optional)
pm2 link your-secret-key your-public-key
```

### Recommended Tools
1. **New Relic** - Application performance
2. **DataDog** - Infrastructure monitoring
3. **Sentry** - Error tracking
4. **LogDNA** - Log management
5. **UptimeRobot** - Uptime monitoring

---

## 🔧 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check connection
redis-cli -h localhost -p 6379
```

### High Memory Usage
```bash
# Check PM2 processes
pm2 status

# Restart if needed
pm2 restart all

# Clear Redis cache
redis-cli FLUSHALL
```

### Database Connection Pool Exhausted
```bash
# Increase pool size in server/config/db.js
connectionLimit: 200  # Increase from 100
```

### Slow Response Times
1. Check Redis cache hit rate
2. Verify database indexes
3. Enable compression
4. Use CDN for static assets

---

## 📈 Scaling Checklist

### Immediate (0-1K users)
- [x] Redis caching enabled
- [x] Compression enabled
- [x] Database pool optimized
- [x] PM2 clustering

### Short-term (1K-10K users)
- [ ] Multiple server instances
- [ ] Load balancer configured
- [ ] CDN for static assets
- [ ] Monitoring tools

### Long-term (10K-100K users)
- [ ] Auto-scaling policies
- [ ] Database read replicas
- [ ] Message queue (Redis/RabbitMQ)
- [ ] Microservices architecture

### Enterprise (100K+ users)
- [ ] Kubernetes orchestration
- [ ] Global CDN distribution
- [ ] Advanced caching strategies
- [ ] Dedicated infrastructure

---

## 💰 Cost Optimization

### Free Tier (Testing)
- **Render.com:** Free tier
- **Redis Cloud:** 30MB free
- **TiDB Cloud:** Free tier
- **Total:** $0/month

### Startup (1K-10K users)
- **Render.com:** 3 instances @ $7/mo = $21
- **Redis Cloud:** 1GB @ $7/mo
- **TiDB Cloud:** Dedicated @ $50/mo
- **Total:** ~$78/month

### Growth (10K-100K users)
- **AWS/GCP:** Auto-scaling @ $200-500/mo
- **Redis Cluster:** $50/mo
- **Database:** $200/mo
- **CDN + Monitoring:** $50/mo
- **Total:** ~$500-800/month

---

## ✅ Production Checklist

- [ ] All environment variables set
- [ ] Redis configured and running
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Load balancer configured
- [ ] Monitoring tools set up
- [ ] Backup strategy in place
- [ ] Auto-scaling policies defined
- [ ] Error tracking enabled
- [ ] Log management configured

---

**Ready to deploy? Start with Render.com for easiest setup!**

For questions, refer to `SCALABILITY_PLAN.md` or open an issue.
