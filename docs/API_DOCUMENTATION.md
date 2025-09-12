# External User Service API Documentation

## Overview

The External User Service provides secure, role-based access to user information for integration with external services in the Ride Service ecosystem. This service supports multiple user types (passengers, drivers, staff, admins) with granular access control and comprehensive monitoring.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

The service supports two authentication methods:

### 1. JWT Token Authentication (User Access)
```http
Authorization: Bearer <jwt_token>
```

### 2. Service-to-Service Authentication (External Service Access)
```http
X-Service-Token: <service_token>
X-Service-Name: <service_name>
```

**Supported Service Names:**
- `ride-service`
- `payment-service`
- `notification-service`

## Role-Based Access Control

### Access Matrix

| User Role | Can Access | Data Level |
|-----------|------------|------------|
| `passenger` | Passenger data only | Basic information |
| `driver` | Driver data only | Basic + vehicle info |
| `staff` | Passenger, Driver, Staff data | Basic + department info |
| `admin` | All user data | Complete information |
| `service` | All user data (external services) | Service-specific filtering |

### Data Sanitization Levels

#### Public Access (No Authentication)
```json
{
  "id": "user_id",
  "externalId": "PASS_ABC123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "profilePicture": "url",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Passenger Access
```json
{
  "id": "user_id",
  "externalId": "PASS_ABC123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "profilePicture": "url",
  "isActive": true,
  "preferences": {
    "language": "en",
    "notifications": true
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Driver Access
```json
{
  "id": "user_id",
  "externalId": "DRIV_XYZ789",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "profilePicture": "url",
  "isActive": true,
  "vehicleType": "sedan",
  "vehicleInfo": {
    "plateNumber": "ABC123",
    "model": "Toyota Camry",
    "color": "Blue",
    "year": 2020
  },
  "rating": 4.8,
  "ratingCount": 150,
  "isVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoints

### Health Check

#### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### Detailed Health Check
```http
GET /health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "metrics": {
    "totalRequests": 1250,
    "successRate": 98.4,
    "errorRate": 1.6,
    "averageResponseTime": 45,
    "uptime": 86400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Metrics Endpoint
```http
GET /metrics
```

**Response:**
```json
{
  "requests": {
    "total": 1250,
    "successful": 1230,
    "failed": 20,
    "byService": {
      "ride-service": 800,
      "payment-service": 300,
      "notification-service": 150
    },
    "byEndpoint": {
      "GET /passengers": 400,
      "GET /drivers": 350,
      "POST /passengers/batch": 200
    },
    "byUserRole": {
      "passenger": 500,
      "driver": 400,
      "staff": 200,
      "admin": 100,
      "service": 50
    }
  },
  "responseTime": {
    "average": 45,
    "min": 12,
    "max": 250
  },
  "errors": {
    "total": 20,
    "byType": {
      "ValidationError": 10,
      "AuthenticationError": 5,
      "DatabaseError": 5
    },
    "byService": {
      "ride-service": 12,
      "payment-service": 5,
      "notification-service": 3
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 86400
}
```

### Passenger Endpoints

#### Get Passenger by ID
```http
GET /passengers/:id?serviceType=ride
```

**Parameters:**
- `id` (path): Passenger ID
- `serviceType` (query): Service type for data filtering (`ride`, `payment`, `notification`)

**Headers:**
```http
Authorization: Bearer <token>
# OR
X-Service-Token: <service_token>
X-Service-Name: ride-service
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "passenger_id",
    "externalId": "PASS_ABC123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profilePicture": "url",
    "isActive": true,
    "preferences": {
      "language": "en",
      "notifications": true
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Passenger by External ID
```http
GET /passengers/external/:externalId?serviceType=ride
```

**Parameters:**
- `externalId` (path): External ID (e.g., `PASS_ABC123`)
- `serviceType` (query): Service type for data filtering

#### List Passengers (Staff/Admin Only)
```http
GET /passengers?page=1&limit=20&search=john&isActive=true&serviceType=ride
```

**Parameters:**
- `page` (query): Page number (default: 1)
- `limit` (query): Items per page (default: 20, max: 100)
- `search` (query): Search term (name, email, phone)
- `isActive` (query): Filter by active status
- `serviceType` (query): Service type for data filtering

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "passenger_id",
        "externalId": "PASS_ABC123",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "profilePicture": "url",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Batch Get Passengers (Staff/Admin Only)
```http
POST /passengers/batch
```

**Request Body:**
```json
{
  "ids": ["passenger_id_1", "passenger_id_2"],
  "serviceType": "ride"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "id": "passenger_id_1",
      "externalId": "PASS_ABC123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "profilePicture": "url",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Driver Endpoints

#### Get Driver by ID
```http
GET /drivers/:id?serviceType=ride
```

#### Get Driver by External ID
```http
GET /drivers/external/:externalId?serviceType=ride
```

#### List Drivers (Staff/Admin Only)
```http
GET /drivers?page=1&limit=20&vehicleType=sedan&isActive=true&isVerified=true&serviceType=ride
```

**Parameters:**
- `vehicleType` (query): Filter by vehicle type (`mini`, `sedan`, `van`)
- `isVerified` (query): Filter by verification status

#### Batch Get Drivers (Staff/Admin Only)
```http
POST /drivers/batch
```

#### Update Driver Rating
```http
PUT /drivers/:id/rating
```

**Request Body:**
```json
{
  "rating": 5
}
```

### Staff Endpoints

#### Get Staff by ID
```http
GET /staff/:id?serviceType=ride
```

#### Get Staff by External ID
```http
GET /staff/external/:externalId?serviceType=ride
```

#### List Staff (Staff/Admin Only)
```http
GET /staff?page=1&limit=20&department=support&serviceType=ride
```

### Admin Endpoints

#### Get Admin by ID
```http
GET /admins/:id?serviceType=ride
```

#### Get Admin by External ID
```http
GET /admins/external/:externalId?serviceType=ride
```

#### List Admins (Admin Only)
```http
GET /admins?page=1&limit=20&adminLevel=admin&serviceType=ride
```

## Service-Specific Data Filtering

### Ride Service Integration
When `serviceType=ride`, additional fields are included:

**For Drivers:**
```json
{
  "vehicleType": "sedan",
  "rating": 4.8,
  "ratingCount": 150,
  "isVerified": true
}
```

### Payment Service Integration
When `serviceType=payment`, payment-relevant fields are included:

**For All Users:**
```json
{
  "preferences": {
    "language": "en",
    "notifications": true
  }
}
```

### Notification Service Integration
When `serviceType=notification`, notification preferences are included:

**For All Users:**
```json
{
  "preferences": {
    "language": "en",
    "notifications": true
  },
  "notificationSettings": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

## Error Responses

### Authentication Error
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Access token or service token required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Authorization Error
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Access denied. Required roles: staff, admin",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Not Found Error
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Passenger not found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Validation Error
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid email format",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Rate Limit Error
```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests from this IP, please try again later.",
  "error": {
    "error": "Too many requests from this IP, please try again later.",
    "retryAfter": "60 seconds"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Integration Examples

### Ride Service Integration

#### Get Driver Information for Ride Booking
```bash
curl -X GET "http://localhost:3001/api/v1/drivers/external/DRIV_ABC123?serviceType=ride" \
  -H "X-Service-Token: your-service-token" \
  -H "X-Service-Name: ride-service"
```

#### Batch Get Passengers for Ride History
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

### Payment Service Integration

#### Get User Information for Payment Processing
```bash
curl -X GET "http://localhost:3001/api/v1/passengers/external/PASS_ABC123?serviceType=payment" \
  -H "X-Service-Token: your-service-token" \
  -H "X-Service-Name: payment-service"
```

### Notification Service Integration

#### Get User Preferences for Notifications
```bash
curl -X GET "http://localhost:3001/api/v1/passengers/external/PASS_ABC123?serviceType=notification" \
  -H "X-Service-Token: your-service-token" \
  -H "X-Service-Name: notification-service"
```

## Rate Limiting

- **Window**: 1 minute
- **Limit**: 200 requests per IP
- **Headers**: Rate limit information included in response headers

## Monitoring and Logging

### Request Logging
All requests are logged with:
- Request ID
- Timestamp
- Method and URL
- Response status and duration
- User role and service name
- IP address and User-Agent

### Error Logging
All errors are logged with:
- Error details and stack trace
- Request context
- Additional information

### Metrics Collection
- Request counts by service, endpoint, and user role
- Response time statistics
- Error rates and types
- Success/failure rates

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Service-to-Service Authentication**: Dedicated tokens for external services
- **Role-Based Access Control**: Granular permission system
- **Data Sanitization**: Automatic filtering based on requester role
- **Rate Limiting**: Protection against abuse
- **Request Logging**: Comprehensive audit trail
- **Input Validation**: Request validation and sanitization

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/user-service |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key |
| `SERVICE_TOKENS` | Comma-separated service tokens | - |
| `RIDE_SERVICE_URL` | Ride service URL | http://localhost:4000 |
| `PAYMENT_SERVICE_URL` | Payment service URL | http://localhost:4001 |
| `NOTIFICATION_SERVICE_URL` | Notification service URL | http://localhost:4002 |
| `EXTERNAL_SERVICE_TIMEOUT` | External service timeout (ms) | 5000 |
| `EXTERNAL_SERVICE_RETRY_ATTEMPTS` | Retry attempts for external services | 3 |
| `LOG_DIR` | Log directory | ./logs |
| `MAX_LOG_SIZE` | Maximum log file size (bytes) | 10485760 |
| `MAX_LOG_FILES` | Maximum number of log files | 5 |

## Support

For technical support or questions about the External User Service API, please contact the development team or refer to the internal documentation.