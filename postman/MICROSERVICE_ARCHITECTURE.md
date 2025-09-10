# Ride Service Microservice Architecture

## Overview
This ride service application follows a microservice architecture pattern with multiple specialized services handling different domains of the application. The architecture is designed for scalability, maintainability, and separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                             │
│                    (Port 4000)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Main Server (server.js)                               │   │
│  │  - Authentication & Authorization                      │   │
│  │  - Request Routing                                     │   │
│  │  - Rate Limiting                                       │   │
│  │  - CORS & Security                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES LAYER                         │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  BOOKING      │    │  DISCOVERY    │    │  USER PROXY   │
│  SERVICE      │    │  SERVICE      │    │  SERVICE      │
│  (Port 4001)  │    │  (Port 4002)  │    │  (Port 4003)  │
│               │    │               │    │               │
│  - Bookings   │    │  - Driver     │    │  - Passengers │
│  - Trips      │    │    Discovery  │    │  - Drivers    │
│  - Assignments│    │  - Pricing    │    │  - User Mgmt  │
│  - Lifecycle  │    │  - Mapping    │    │  - Directory  │
│  - Ratings    │    │  - ETA        │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 REALTIME SERVICE                               │
│                    (Port 4004)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - Live Location Updates                               │   │
│  │  - WebSocket Connections                              │   │
│  │  - Real-time Broadcasting                             │   │
│  │  - Position Tracking                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MongoDB Database                                      │   │
│  │  - User Models (Passengers, Drivers, Admins)          │   │
│  │  - Booking Models (Bookings, Trips, Assignments)      │   │
│  │  - Analytics Models (Reports, Earnings, Commission)   │   │
│  │  - Pricing Models (Dynamic Pricing)                   │   │
│  │  - Live Models (Position Updates)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Microservices Breakdown

### 1. Main API Gateway (Port 4000)
**File**: `server.js`
**Purpose**: Central entry point and orchestration layer

**Responsibilities**:
- Authentication & Authorization middleware
- Request routing to appropriate microservices
- Rate limiting and security (CORS, Helmet)
- WebSocket server for real-time communication
- Health checks and monitoring

**Key Features**:
- JWT-based authentication
- Role-based access control (passenger, driver, admin, staff)
- Rate limiting (100 requests/minute)
- Socket.IO integration for real-time updates

### 2. Booking Service (Port 4001)
**File**: `services/booking.server.js`
**Purpose**: Handles all booking-related operations

**Responsibilities**:
- Booking creation and management
- Trip lifecycle management
- Assignment management
- Fare estimation and pricing
- Rating system
- Booking status updates

**Key Endpoints**:
- `POST /v1/bookings` - Create booking
- `GET /v1/bookings` - List bookings
- `POST /v1/bookings/:id/lifecycle` - Update booking status
- `POST /v1/bookings/:id/assign` - Assign driver
- `POST /v1/bookings/estimate` - Estimate fare

**Data Flow**:
1. Passenger creates booking request
2. System estimates fare using pricing service
3. Booking is stored with pending status
4. Admin/staff can assign driver
5. Driver accepts/updates booking status
6. Trip is tracked through completion

### 3. Discovery Service (Port 4002)
**File**: `services/discovery.server.js`
**Purpose**: Driver discovery and mapping services

**Responsibilities**:
- Driver availability and discovery
- Fare estimation for passengers
- Mapping and routing services
- ETA calculations
- Driver location management

**Key Endpoints**:
- `GET /v1/drivers/available` - Find available drivers
- `POST /v1/drivers/discover-and-estimate` - Combined discovery + fare
- `POST /v1/drivers/estimate-fare` - Estimate fare
- `POST /v1/mapping/route` - Get route information
- `POST /v1/mapping/eta` - Calculate ETA

**Data Flow**:
1. Passenger requests nearby drivers
2. System queries available drivers within radius
3. Calculates distances and ETAs
4. Estimates fares based on pricing rules
5. Returns ranked list of drivers with estimates

### 4. User Proxy Service (Port 4003)
**File**: `services/userproxy.server.js`
**Purpose**: User management and directory services

**Responsibilities**:
- User profile management
- User directory operations
- Read-only user data access
- User authentication data

**Key Endpoints**:
- `GET /v1/passengers` - List passengers
- `GET /v1/passengers/:id` - Get passenger details
- `GET /v1/drivers` - List drivers
- `GET /v1/drivers/:id` - Get driver details

**Data Flow**:
1. Services request user information
2. User proxy queries user database
3. Returns user profile data
4. Handles user directory operations

### 5. Realtime Service (Port 4004)
**File**: `services/realtime.server.js`
**Purpose**: Real-time communication and live updates

**Responsibilities**:
- Live location tracking
- WebSocket connections
- Real-time broadcasting
- Position updates
- Live status management

**Key Endpoints**:
- `POST /v1/live/push` - Push location update
- `GET /v1/live` - List live updates
- `PUT /v1/live/:id` - Update live status

**Data Flow**:
1. Driver/passenger sends location update
2. System stores live position data
3. Broadcasts update to relevant parties
4. Updates booking progress
5. Tracks trip status in real-time

## Data Population Workflow

### 1. User Registration Flow
```
1. User registers via auth endpoint
2. User data stored in MongoDB
3. JWT token generated with user info
4. User can now access protected endpoints
```

### 2. Booking Creation Flow
```
1. Passenger authenticates
2. Passenger requests fare estimate
3. Discovery service calculates fare
4. Passenger creates booking
5. Booking stored with pending status
6. Admin/staff can assign driver
7. Driver receives notification
8. Driver accepts booking
9. Trip begins and is tracked
```

### 3. Driver Discovery Flow
```
1. Passenger requests nearby drivers
2. Discovery service queries available drivers
3. Calculates distances and ETAs
4. Applies pricing rules
5. Returns ranked driver list
6. Passenger selects driver
7. Booking is created
```

### 4. Real-time Tracking Flow
```
1. Driver updates location
2. Live service receives update
3. Position stored in database
4. WebSocket broadcasts update
5. Passenger sees driver location
6. ETA is recalculated
7. Trip progress is updated
```

### 5. Analytics Data Flow
```
1. Trip completes
2. Booking data is finalized
3. Analytics service processes data
4. Reports are generated
5. Earnings are calculated
6. Commission is applied
7. Dashboard is updated
```

## External API Integration

### Mapping Services
- **OpenRouteService**: For route calculation and ETA
- **Google Maps API**: For geocoding and directions
- **Mapbox**: Alternative mapping service

### Pricing Services
- **Dynamic Pricing Engine**: Real-time fare calculation
- **Surge Pricing**: Demand-based pricing adjustments
- **External Pricing APIs**: Third-party pricing data

### Payment Services
- **Stripe**: Payment processing
- **PayPal**: Alternative payment method
- **Bank Integration**: Direct bank transfers

## Database Schema

### User Models
- **Passengers**: User profiles, contact info, preferences
- **Drivers**: Driver profiles, vehicle info, availability
- **Admins**: Administrative users
- **Staff**: Support staff

### Booking Models
- **Bookings**: Trip requests and status
- **Trips**: Completed trip records
- **Assignments**: Driver assignments
- **Live**: Real-time position data

### Analytics Models
- **Reports**: Daily, weekly, monthly reports
- **Earnings**: Driver and platform earnings
- **Commission**: Commission tracking
- **Complaints**: User complaints and feedback

### Pricing Models
- **Pricing**: Dynamic pricing rules
- **Surge**: Surge pricing multipliers
- **Promotions**: Discount codes and offers

## Security & Authentication

### JWT Token Structure
```json
{
  "id": "user_id",
  "type": "passenger|driver|admin|staff",
  "name": "user_name",
  "email": "user_email",
  "phone": "user_phone",
  "iat": "issued_at",
  "exp": "expires_at"
}
```

### Role-Based Access Control
- **Passengers**: Can create bookings, rate drivers, view history
- **Drivers**: Can accept bookings, update location, manage availability
- **Staff**: Can assign drivers, manage bookings, view reports
- **Admins**: Full access to all operations and analytics

### Rate Limiting
- **Authentication**: 10-20 requests/minute
- **General API**: 100 requests/minute
- **Location Updates**: 60 requests/minute

## Scalability Considerations

### Horizontal Scaling
- Each microservice can be scaled independently
- Load balancers can distribute traffic
- Database sharding for large datasets

### Caching Strategy
- Redis for session management
- In-memory caching for frequently accessed data
- CDN for static assets

### Monitoring & Logging
- Centralized logging with ELK stack
- Application performance monitoring
- Real-time alerting for critical issues

## Deployment Architecture

### Containerization
- Docker containers for each microservice
- Kubernetes for orchestration
- Service mesh for communication

### CI/CD Pipeline
- Automated testing
- Blue-green deployments
- Rollback capabilities

### Infrastructure
- Cloud-native deployment
- Auto-scaling based on demand
- Multi-region deployment for availability

This microservice architecture provides a robust, scalable foundation for the ride service application, with clear separation of concerns and the ability to scale individual components based on demand.