# External User Service

A comprehensive microservice that provides secure, role-based access to user information for external services in the Ride Service ecosystem. This service manages passengers, drivers, staff, and admin users with advanced external service integration capabilities.

## 🚀 Features

- **🔐 Advanced Authentication**: JWT-based authentication + Service-to-service authentication
- **👥 Role-Based Access Control**: Granular permissions for passengers, drivers, staff, and admins
- **🌐 External Service Integration**: Seamless integration with ride, payment, and notification services
- **📊 Comprehensive Monitoring**: Real-time metrics, logging, and health checks
- **🛡️ Security First**: Data sanitization, rate limiting, and audit logging
- **⚡ High Performance**: Batch operations, pagination, and optimized queries
- **🔄 Circuit Breaker**: Fault tolerance for external service communication
- **📈 Observability**: Detailed metrics and health monitoring

## 🏗️ Architecture

### User Types & Access Control

| User Role | Can Access | Data Level | External Service Access |
|-----------|------------|------------|------------------------|
| **Passenger** | Passenger data only | Basic information | Limited to own data |
| **Driver** | Driver data only | Basic + vehicle info | Limited to own data |
| **Staff** | Passenger, Driver, Staff data | Basic + department info | Full access to user data |
| **Admin** | All user data | Complete information | Full access to all data |
| **External Service** | All user data | Service-specific filtering | Full access with filtering |

### Service Integration

The service supports integration with multiple external services:

- **🚗 Ride Service**: Driver and passenger information for ride booking
- **💳 Payment Service**: User preferences and payment-related data
- **📱 Notification Service**: User notification preferences and settings

## API Endpoints

### Authentication
- `POST /api/v1/passengers/auth` - Authenticate passenger
- `POST /api/v1/drivers/auth` - Authenticate driver  
- `POST /api/v1/staff/auth` - Authenticate staff
- `POST /api/v1/admins/auth` - Authenticate admin

### Passengers
- `POST /api/v1/passengers` - Create passenger
- `GET /api/v1/passengers/:id` - Get passenger by ID (public)
- `GET /api/v1/passengers/external/:externalId` - Get passenger by external ID (public)
- `GET /api/v1/passengers` - List passengers (staff/admin only)
- `PUT /api/v1/passengers/:id` - Update passenger
- `DELETE /api/v1/passengers/:id` - Delete passenger (staff/admin only)
- `POST /api/v1/passengers/batch` - Get passengers by IDs (staff/admin only)

### Drivers
- `POST /api/v1/drivers` - Create driver
- `GET /api/v1/drivers/:id` - Get driver by ID (public)
- `GET /api/v1/drivers/external/:externalId` - Get driver by external ID (public)
- `GET /api/v1/drivers` - List drivers (staff/admin only)
- `PUT /api/v1/drivers/:id` - Update driver
- `DELETE /api/v1/drivers/:id` - Delete driver (staff/admin only)
- `POST /api/v1/drivers/batch` - Get drivers by IDs (staff/admin only)
- `PUT /api/v1/drivers/:id/rating` - Update driver rating

### Staff
- `POST /api/v1/staff` - Create staff (admin only)
- `GET /api/v1/staff/:id` - Get staff by ID (public)
- `GET /api/v1/staff/external/:externalId` - Get staff by external ID (public)
- `GET /api/v1/staff` - List staff (staff/admin only)
- `PUT /api/v1/staff/:id` - Update staff
- `DELETE /api/v1/staff/:id` - Delete staff (admin only)

### Admins
- `POST /api/v1/admins` - Create admin (admin only)
- `GET /api/v1/admins/:id` - Get admin by ID (public)
- `GET /api/v1/admins/external/:externalId` - Get admin by external ID (public)
- `GET /api/v1/admins` - List admins (admin only)
- `PUT /api/v1/admins/:id` - Update admin (admin only)
- `DELETE /api/v1/admins/:id` - Delete admin (admin only)

## 🔧 Installation & Setup

### Prerequisites
- Node.js >= 18
- MongoDB >= 4.4
- npm or yarn

### Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd user-service
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Docker Deployment

```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/user-service \
  -e JWT_SECRET=your-secret-key \
  user-service
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=user-service
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/user-service |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key |
| `RIDE_SERVICE_URL` | Ride service URL for integration | http://localhost:4000 |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | 200 |

## Usage Examples

### Create a Passenger
```bash
curl -X POST http://localhost:3001/api/v1/passengers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Get Driver Information (External Access)
```bash
curl -X GET http://localhost:3001/api/v1/drivers/external/DRIV_ABC123 \
  -H "Authorization: Bearer <token>"
```

### Batch Get Passengers (Staff/Admin Only)
```bash
curl -X POST http://localhost:3001/api/v1/passengers/batch \
  -H "Authorization: Bearer <staff-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
  }'
```

## 🔗 External Service Integration

### Service-to-Service Authentication

External services can authenticate using service tokens:

```bash
curl -X GET "http://localhost:3001/api/v1/passengers/external/PASS_ABC123" \
  -H "X-Service-Token: your-service-token" \
  -H "X-Service-Name: ride-service"
```

### Service-Specific Data Filtering

The service automatically filters data based on the requesting service:

- **Ride Service**: Includes vehicle info, ratings, verification status
- **Payment Service**: Includes payment preferences and methods
- **Notification Service**: Includes notification settings and preferences

### Batch Operations

Efficient batch retrieval for external services:

```bash
curl -X POST "http://localhost:3001/api/v1/passengers/batch" \
  -H "X-Service-Token: your-service-token" \
  -H "X-Service-Name: ride-service" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["passenger_id_1", "passenger_id_2"],
    "serviceType": "ride"
  }'
```

## 📊 Monitoring & Observability

### Health Checks

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Metrics**: `GET /metrics`

### Real-time Metrics

The service provides comprehensive metrics including:
- Request counts by service, endpoint, and user role
- Response time statistics
- Error rates and types
- Success/failure rates

### Logging

- **Access Logs**: All API requests with detailed context
- **Error Logs**: Comprehensive error tracking
- **Audit Logs**: Security and compliance logging
- **Performance Logs**: Response time and throughput metrics

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **Data Sanitization**: Sensitive data filtering
- **Role-Based Access**: Granular permission control
- **Input Validation**: Request validation and sanitization

## Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Development

### Project Structure
```
user-service/
├── config/          # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Authentication & authorization
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
├── server.js        # Main server file
└── package.json     # Dependencies
```

### Running Tests
```bash
npm test
```

### Code Style
The project follows standard JavaScript/Node.js conventions with ESLint configuration.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details.