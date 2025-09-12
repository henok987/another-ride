# User Service

A microservice that provides external access to user information for the Ride Service ecosystem. This service manages passengers, drivers, staff, and admin users with role-based access control.

## Features

- **User Management**: Create, read, update, and delete users for all user types
- **Role-Based Access Control**: Different access levels for passengers, drivers, staff, and admins
- **External API Access**: Designed for integration with external services
- **Authentication & Authorization**: JWT-based authentication with role-based permissions
- **Data Sanitization**: Secure data exposure with sensitive information filtering
- **Batch Operations**: Efficient batch retrieval of user data
- **Pagination**: Optimized data retrieval with pagination support

## User Types & Access Control

### Passengers
- **Can access**: Their own data
- **External access**: Basic passenger information (name, phone, email)
- **Protected by**: Authentication required for updates

### Drivers  
- **Can access**: Their own data
- **External access**: Basic driver information (name, phone, email, vehicle info)
- **Protected by**: Authentication required for updates

### Staff
- **Can access**: Passenger, driver, and staff data
- **External access**: All user types with basic information
- **Protected by**: Staff or admin authentication required

### Admins
- **Can access**: All user data (passengers, drivers, staff, admins)
- **External access**: Complete user information
- **Protected by**: Admin authentication required

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

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd user-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
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

## Integration with Ride Service

This user service is designed to be consumed by the main Ride Service. The Ride Service can:

1. **Fetch user data** for passengers and drivers during booking
2. **Validate user permissions** for different operations
3. **Get batch user information** for efficient data retrieval
4. **Maintain user profiles** with external ID references

### External ID System

Each user has an `externalId` that can be used by external services to reference users without exposing internal MongoDB ObjectIds.

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