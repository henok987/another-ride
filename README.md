# External User Service v2.0.0

A refactored user service designed specifically for external service integration, particularly with booking services. This service provides role-based access control with data filtering based on the requester's role.

## 🚀 Key Features

- **Role-Based Data Exposure**: Different data access levels based on requester role
- **External Service Integration**: Optimized for booking service integration
- **Service Layer Architecture**: Clean separation of concerns with services, controllers, and routes
- **Data Filtering**: Automatic field filtering based on role and user type
- **Batch Operations**: Efficient batch retrieval for external services
- **JWT Authentication**: Secure token-based authentication
- **Service-to-Service Auth**: Support for external service authentication

## 🏗️ Architecture

### Folder Structure
```
/services
  passenger.service.js    # Business logic for passengers
  driver.service.js       # Business logic for drivers  
  admin.service.js        # Business logic for admins
/controllers
  passenger.controller.js # HTTP request handlers for passengers
  driver.controller.js    # HTTP request handlers for drivers
  admin.controller.js    # HTTP request handlers for admins
/routes
  passenger.routes.js     # Passenger API endpoints
  driver.routes.js        # Driver API endpoints
  admin.routes.js         # Admin API endpoints
/middleware
  auth.js                 # JWT authentication middleware
  rbac.js                 # Role-based access control middleware
/utils
  populate.js             # Role-based data filtering utility
```

## 🔐 Role-Based Access Control

### Access Matrix

| Requester Role | Passenger Data | Driver Data | Staff Data | Admin Data |
|----------------|----------------|-------------|------------|------------|
| **Passenger** | ✅ Own full data | ✅ Basic info (name, phone, car, rating) | ✅ Basic info | ✅ Basic info |
| **Driver** | ✅ Basic info (name, phone, pickup location) | ✅ Own full data | ✅ Basic info | ✅ Basic info |
| **Staff** | ✅ Most fields | ✅ Most fields | ✅ Own full data | ✅ Basic info |
| **Admin** | ✅ All fields | ✅ All fields | ✅ All fields | ✅ All fields |

### Data Filtering Examples

#### Passenger accessing Driver info:
```json
{
  "id": "driver_id",
  "externalId": "DRIV_ABC123", 
  "name": "John Driver",
  "phone": "+1234567890",
  "vehicleType": "sedan",
  "vehicleInfo": {
    "plateNumber": "ABC123",
    "model": "Toyota Camry"
  },
  "rating": 4.8,
  "ratingCount": 150,
  "isVerified": true,
  "isActive": true
}
```

#### Driver accessing Passenger info:
```json
{
  "id": "passenger_id",
  "externalId": "PASS_XYZ789",
  "name": "Jane Passenger", 
  "phone": "+1234567890",
  "profilePicture": "url",
  "preferences": {
    "language": "en",
    "notifications": true
  },
  "isActive": true
}
```

## 🔗 API Endpoints

### External Service Integration Endpoints

These endpoints are specifically designed for booking service integration:

#### Get Passenger Info
```http
GET /api/passenger/:id
Authorization: Bearer <jwt_token>
# OR
X-Service-Token: <service_token>
X-Service-Name: booking-service
```

#### Get Driver Info  
```http
GET /api/driver/:id
Authorization: Bearer <jwt_token>
# OR
X-Service-Token: <service_token>
X-Service-Name: booking-service
```

#### Batch Get Passengers
```http
POST /api/passengers/batch
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "ids": ["passenger_id_1", "passenger_id_2"]
}
```

#### Batch Get Drivers
```http
POST /api/drivers/batch
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "ids": ["driver_id_1", "driver_id_2"]
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users?userType=all&page=1&limit=20
Authorization: Bearer <admin_token>
```

#### Get Specific User
```http
GET /api/admin/users/:userType/:id
Authorization: Bearer <admin_token>
```

## 🛠️ Usage Examples

### Booking Service Integration

#### 1. Get Driver Info for Ride Booking
```javascript
// Booking service calls user service to get driver info
const response = await fetch('http://user-service:3001/api/driver/DRIV_ABC123', {
  headers: {
    'X-Service-Token': 'booking-service-token',
    'X-Service-Name': 'booking-service'
  }
});

const driverData = await response.json();
// Returns filtered driver data based on service role
```

#### 2. Get Passenger Info for Ride Completion
```javascript
// Driver app calls user service to get passenger info
const response = await fetch('http://user-service:3001/api/passenger/PASS_XYZ789', {
  headers: {
    'Authorization': 'Bearer <driver_jwt_token>'
  }
});

const passengerData = await response.json();
// Returns filtered passenger data based on driver role
```

#### 3. Batch Get Users for Ride History
```javascript
// Get multiple users for ride history display
const response = await fetch('http://user-service:3001/api/passengers/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <staff_jwt_token>'
  },
  body: JSON.stringify({
    ids: ['passenger_1', 'passenger_2', 'passenger_3']
  })
});

const passengersData = await response.json();
// Returns array of filtered passenger data
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js >= 18
- MongoDB >= 4.4

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Service**
   ```bash
   # Development
   npm run dev
   
   # Production  
   npm start
   ```

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/user-service

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# External Service Tokens (comma-separated)
SERVICE_TOKENS=booking-service-token,ride-service-token,payment-service-token
```

## 🧪 Testing the Service

### Health Check
```bash
curl http://localhost:3001/health
```

### Service Info
```bash
curl http://localhost:3001/api/info
```

### Test Role-Based Access

#### As Passenger (get driver info):
```bash
curl -H "Authorization: Bearer <passenger_token>" \
     http://localhost:3001/api/driver/DRIV_ABC123
```

#### As Driver (get passenger info):
```bash
curl -H "Authorization: Bearer <driver_token>" \
     http://localhost:3001/api/passenger/PASS_XYZ789
```

#### As Admin (get all users):
```bash
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3001/api/admin/users
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Data Filtering**: Automatic field filtering based on role
- **Service-to-Service Authentication**: Secure external service integration
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Protection against abuse

## 📊 Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    // Filtered user data based on requester role
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚨 Error Handling

### Authentication Error
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Please provide a valid authentication token",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Authorization Error
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied",
  "error": "You cannot access driver data. Your role: passenger",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔄 Migration from v1.0.0

The service has been completely refactored for better external service integration:

### Key Changes:
- **New API Structure**: Simplified endpoints for external services
- **Service Layer**: Business logic separated into service classes
- **Enhanced RBAC**: More granular role-based access control
- **Data Filtering**: Automatic field filtering based on role
- **Batch Operations**: Efficient batch retrieval for external services

### Breaking Changes:
- API endpoints changed from `/api/v1/` to `/api/`
- Response format updated with success/error structure
- Authentication headers updated for external services

## 📞 Support

For technical support or questions about the External User Service:

1. Check the health endpoint: `GET /health`
2. Review service info: `GET /api/info`
3. Check logs for detailed error information
4. Contact the development team

## 📚 Additional Resources

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Environment Configuration](./.env.example)

---

**Version**: 2.0.0  
**Last Updated**: 2024-01-01  
**Compatibility**: Node.js 18+, MongoDB 4.4+