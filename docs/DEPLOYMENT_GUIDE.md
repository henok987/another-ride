# External User Service Deployment Guide

This guide provides comprehensive instructions for deploying the External User Service in various environments.

## 🚀 Quick Start

### Local Development

1. **Prerequisites**
   ```bash
   # Install Node.js 18+
   node --version
   
   # Install MongoDB
   mongod --version
   ```

2. **Setup**
   ```bash
   # Clone and install
   git clone <repository-url>
   cd user-service
   npm install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your settings
   
   # Start MongoDB
   mongod
   
   # Start the service
   npm run dev
   ```

3. **Verify**
   ```bash
   curl http://localhost:3001/health
   ```

## 🐳 Docker Deployment

### Single Container

```bash
# Build image
docker build -t user-service .

# Run with external MongoDB
docker run -d \
  --name user-service \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/user-service \
  -e JWT_SECRET=your-secret-key \
  user-service
```

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f user-service

# Stop services
docker-compose down
```

### Docker Compose with Custom Configuration

```bash
# Create custom environment file
cp .env.example .env.production

# Edit production settings
vim .env.production

# Start with custom environment
docker-compose --env-file .env.production up -d
```

## ☸️ Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- Helm (optional)

### Basic Deployment

```bash
# Create namespace
kubectl create namespace user-service

# Apply configurations
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/autoscaling.yaml

# Check deployment
kubectl get pods -n user-service
kubectl get services -n user-service
```

### Advanced Kubernetes Setup

#### 1. Configure Secrets

```bash
# Create secrets manually
kubectl create secret generic user-service-secrets \
  --from-literal=mongodb-uri="mongodb://mongodb:27017/user-service" \
  --from-literal=jwt-secret="your-super-secret-jwt-key" \
  --from-literal=service-tokens="ride-service-token-123,payment-service-token-456" \
  -n user-service
```

#### 2. Configure Ingress

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Update ingress with your domain
kubectl apply -f k8s/ingress.yaml
```

#### 3. Configure Monitoring

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Add ServiceMonitor for user-service
kubectl apply -f k8s/servicemonitor.yaml
```

### Helm Deployment (Alternative)

```bash
# Create Helm chart
helm create user-service-chart

# Install with Helm
helm install user-service ./user-service-chart \
  --namespace user-service \
  --set image.tag=latest \
  --set mongodb.uri="mongodb://mongodb:27017/user-service"
```

## 🔧 Environment Configuration

### Development Environment

```bash
# .env.development
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/user-service-dev
JWT_SECRET=dev-secret-key
SERVICE_TOKENS=dev-token-123
LOG_LEVEL=debug
VERBOSE_LOGGING=true
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
PORT=3001
MONGODB_URI=mongodb://staging-mongodb:27017/user-service-staging
JWT_SECRET=staging-secret-key
SERVICE_TOKENS=staging-token-123,staging-token-456
RIDE_SERVICE_URL=http://staging-ride-service:4000
PAYMENT_SERVICE_URL=http://staging-payment-service:4001
NOTIFICATION_SERVICE_URL=http://staging-notification-service:4002
LOG_LEVEL=info
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://prod-mongodb-cluster:27017/user-service-prod
JWT_SECRET=super-secure-production-key
SERVICE_TOKENS=prod-token-123,prod-token-456,prod-token-789
RIDE_SERVICE_URL=https://ride-service.prod.example.com
PAYMENT_SERVICE_URL=https://payment-service.prod.example.com
NOTIFICATION_SERVICE_URL=https://notification-service.prod.example.com
EXTERNAL_SERVICE_TIMEOUT=10000
EXTERNAL_SERVICE_RETRY_ATTEMPTS=5
LOG_LEVEL=warn
CIRCUIT_BREAKER_ENABLED=true
```

## 📊 Monitoring Setup

### Prometheus + Grafana

```bash
# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack

# Configure ServiceMonitor
kubectl apply -f k8s/servicemonitor.yaml

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80
# Login: admin/prom-operator
```

### Custom Metrics Dashboard

```bash
# Create Grafana dashboard
kubectl apply -f k8s/grafana-dashboard.yaml

# Import dashboard JSON
# Dashboard ID: 12345
```

### Log Aggregation

```bash
# Install ELK Stack
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install logstash elastic/logstash

# Configure log shipping
kubectl apply -f k8s/logging-config.yaml
```

## 🔒 Security Configuration

### SSL/TLS Setup

```bash
# Generate SSL certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=user-service.example.com"

# Create Kubernetes secret
kubectl create secret tls user-service-tls \
  --key tls.key --cert tls.crt \
  -n user-service
```

### Network Policies

```bash
# Apply network policies
kubectl apply -f k8s/network-policies.yaml
```

### RBAC Configuration

```bash
# Create service account
kubectl create serviceaccount user-service-sa -n user-service

# Create RBAC rules
kubectl apply -f k8s/rbac.yaml
```

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues

```bash
# Check MongoDB connectivity
kubectl exec -it user-service-pod -n user-service -- \
  node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"

# Check MongoDB logs
kubectl logs -f mongodb-pod -n user-service
```

#### 2. Service Authentication Issues

```bash
# Verify service tokens
kubectl get secret user-service-secrets -n user-service -o yaml

# Test authentication
curl -H "X-Service-Token: your-token" \
     -H "X-Service-Name: ride-service" \
     http://localhost:3001/api/v1/health
```

#### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n user-service

# Check metrics
curl http://localhost:3001/metrics

# Check logs for errors
kubectl logs -f user-service-pod -n user-service | grep ERROR
```

### Debug Mode

```bash
# Enable debug logging
kubectl set env deployment/user-service DEBUG=user-service:* -n user-service

# Check debug logs
kubectl logs -f deployment/user-service -n user-service
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale deployment
kubectl scale deployment user-service --replicas=5 -n user-service

# Check HPA status
kubectl get hpa -n user-service
```

### Vertical Scaling

```bash
# Update resource limits
kubectl patch deployment user-service -n user-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"user-service","resources":{"limits":{"memory":"1Gi","cpu":"1000m"}}}]}}}}'
```

## 🔄 Updates and Rollbacks

### Rolling Updates

```bash
# Update image
kubectl set image deployment/user-service user-service=user-service:v1.1.0 -n user-service

# Check rollout status
kubectl rollout status deployment/user-service -n user-service
```

### Rollbacks

```bash
# Rollback to previous version
kubectl rollout undo deployment/user-service -n user-service

# Check rollback status
kubectl rollout status deployment/user-service -n user-service
```

## 📋 Health Checks

### Application Health

```bash
# Basic health check
curl http://localhost:3001/health

# Detailed health check
curl http://localhost:3001/health/detailed

# Metrics endpoint
curl http://localhost:3001/metrics
```

### Kubernetes Health

```bash
# Check pod status
kubectl get pods -n user-service

# Check service endpoints
kubectl get endpoints -n user-service

# Check ingress status
kubectl get ingress -n user-service
```

## 🎯 Best Practices

### Security
- Use strong JWT secrets
- Rotate service tokens regularly
- Enable network policies
- Use RBAC for service accounts
- Enable audit logging

### Performance
- Set appropriate resource limits
- Use horizontal pod autoscaling
- Monitor metrics and logs
- Optimize database queries
- Use connection pooling

### Reliability
- Configure health checks
- Use readiness and liveness probes
- Implement circuit breakers
- Set up monitoring and alerting
- Plan for disaster recovery

### Maintenance
- Regular security updates
- Monitor resource usage
- Clean up old logs
- Backup configurations
- Test disaster recovery procedures

## 📞 Support

For deployment issues or questions:

1. Check the troubleshooting section
2. Review logs and metrics
3. Consult the API documentation
4. Contact the development team

## 📚 Additional Resources

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Environment Variables Reference](./.env.example)
- [Docker Configuration](./Dockerfile)
- [Kubernetes Manifests](./k8s/)
- [Monitoring Setup](./docs/MONITORING.md)