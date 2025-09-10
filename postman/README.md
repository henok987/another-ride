# Comprehensive Ride Service API - Postman Collection

This repository contains a comprehensive Postman collection for testing the Ride Service API with organized folders, comprehensive dummy data, and automated test scripts.

## 📁 Collection Structure

### 🔐 Authentication
- **Passenger Register**: Register new passengers with emergency contacts
- **Passenger Login**: Authenticate passengers and extract tokens
- **Staff Login**: Authenticate staff members
- **Admin Login**: Authenticate administrators

### 👤 Passenger APIs
- **🚗 Driver Discovery**: Find available drivers by location and vehicle type
- **💰 Fare Estimation**: Get fare estimates for different routes and vehicle types
- **📱 Booking Management**: Create, update, cancel, and manage bookings
- **📍 Live Location Updates**: Update passenger location during rides
- **🗺️ Mapping & Navigation**: Get routes, ETAs, and booking progress
- **⭐ Ratings & Reviews**: Rate drivers and provide feedback
- **📊 Analytics & History**: View ride history, rewards, and analytics

### 🚗 Driver APIs
- **👤 Driver Management**: Set availability and update location
- **📱 Booking Management**: Accept, start, complete, and cancel trips
- **📍 Live Location Updates**: Push location updates during rides
- **⭐ Ratings & Reviews**: Rate passengers
- **📊 Analytics & Earnings**: View earnings, ride history, and rewards

### 👨‍💼 Admin/Staff APIs
- **👥 User Management**: Manage passengers and drivers
- **📋 Booking & Trip Management**: Oversee bookings, assignments, and trips
- **💰 Pricing Management**: Configure pricing for different vehicle types
- **📊 Analytics & Reports**: Access comprehensive reports and analytics
- **📍 Live Updates Management**: Monitor and manage live location updates

## 🚀 Getting Started

### Prerequisites
- Postman Desktop App (v10 or later)
- Ride Service API running on `http://localhost:4000`
- Valid authentication credentials

### Setup Instructions

1. **Import the Collection**
   - Open Postman
   - Click "Import" and select `Comprehensive_Ride_Service_API.postman_collection.json`

2. **Import the Environment**
   - Import `Comprehensive_Ride_Service_Environment.postman_environment.json`
   - Select the environment in the top-right dropdown

3. **Configure Base URL**
   - Update the `baseUrl` variable if your API runs on a different port
   - Default: `http://localhost:4000`

4. **Start Testing**
   - Begin with Authentication endpoints to get tokens
   - Use the organized folder structure to test specific features

## 🔧 Environment Variables

The collection includes comprehensive environment variables for testing:

### Base Configuration
- `baseUrl`: API base URL
- `authBaseUrl`: External auth service URL

### User IDs and Tokens
- `passengerId`, `passengerToken`, `passengerName`
- `driverId`, `driverToken`, `driverName`
- `adminId`, `adminToken`, `adminName`
- `staffId`, `staffToken`, `staffName`

### Test Data IDs
- `bookingId`, `tripId`, `assignmentId`
- `pricingId`, `liveId`

### Test Locations (NYC)
- `testLatitude1-5`, `testLongitude1-5`
- `testAddress1-6` (Times Square, Central Park, Brooklyn Bridge, etc.)

### Test Data
- `testPhone1-3`, `testEmail1-3`
- `testPassword`, `testUsername`
- `vehicleTypeMini/Sedan/Van`
- `testStatus*`, `testPeriod*`, `testRating`, `testFare`

## 🧪 Test Scripts

The collection includes automated test scripts that:

### Authentication & Token Management
- Extract and store JWT tokens automatically
- Store user IDs and names from responses
- Validate authentication responses

### Data Validation
- Validate response structure and required fields
- Check data types and value ranges
- Ensure business logic compliance

### Performance Testing
- Measure response times
- Check response sizes
- Validate performance thresholds

### Security Testing
- Check for sensitive data exposure
- Validate CORS headers
- Test authentication requirements

## 📊 Dummy Data

The collection includes realistic dummy data for comprehensive testing:

### Passenger Data
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "email": "john.smith@example.com",
  "password": "SecurePass123!",
  "emergencyContacts": [
    {
      "name": "Jane Smith",
      "phone": "+1234567891",
      "relationship": "Spouse"
    }
  ]
}
```

### Location Data (NYC)
- Times Square: `40.7128, -74.0060`
- Central Park: `40.7589, -73.9851`
- Brooklyn Bridge: `40.7505, -73.9934`
- Statue of Liberty: `40.6892, -74.0445`
- Grand Central Terminal: `40.7614, -73.9776`

### Booking Data
```json
{
  "vehicleType": "mini",
  "pickup": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Times Square, New York, NY"
  },
  "dropoff": {
    "latitude": 40.7589,
    "longitude": -73.9851,
    "address": "Central Park, New York, NY"
  },
  "passengerCount": 2,
  "notes": "Please call when you arrive"
}
```

## 🔄 Workflow Examples

### Complete Passenger Journey
1. **Register/Login** → Get passenger token
2. **Find Available Drivers** → Search for nearby drivers
3. **Estimate Fare** → Get fare estimate
4. **Create Booking** → Book a ride
5. **Update Location** → Share pickup location
6. **Track Progress** → Monitor ride progress
7. **Rate Driver** → Provide feedback after ride

### Complete Driver Journey
1. **Login** → Get driver token
2. **Set Availability** → Go online for rides
3. **Update Location** → Share current position
4. **Accept Booking** → Accept incoming ride request
5. **Start Trip** → Begin the ride
6. **Update Location** → Share trip progress
7. **Complete Trip** → End the ride
8. **Rate Passenger** → Provide feedback

### Admin Management Workflow
1. **Login** → Get admin token
2. **View Dashboard** → Check system overview
3. **Manage Users** → View/edit passengers and drivers
4. **Oversee Bookings** → Monitor active bookings
5. **Configure Pricing** → Update fare rates
6. **Generate Reports** → Create analytics reports

## 🛠️ Customization

### Adding New Endpoints
1. Create new request in appropriate folder
2. Use environment variables for dynamic data
3. Add test scripts for validation
4. Update documentation

### Modifying Test Data
1. Update environment variables
2. Modify request bodies
3. Adjust test scripts as needed
4. Test thoroughly

### Adding New Tests
1. Use the provided test script functions
2. Follow the naming conventions
3. Add appropriate assertions
4. Document test purpose

## 📝 Best Practices

### Request Organization
- Group related requests in folders
- Use descriptive names
- Include request descriptions
- Maintain consistent naming conventions

### Test Scripts
- Use the provided helper functions
- Add meaningful test descriptions
- Validate both success and error cases
- Log important information for debugging

### Environment Management
- Use environment variables for all dynamic data
- Keep sensitive data in environment variables
- Use descriptive variable names
- Document variable purposes

### Data Management
- Use realistic test data
- Include edge cases and error scenarios
- Maintain data consistency across requests
- Clean up test data when appropriate

## 🐛 Troubleshooting

### Common Issues
1. **Authentication Errors**: Check token validity and expiration
2. **Missing Variables**: Ensure environment is selected
3. **Test Failures**: Review test scripts and response data
4. **Timeout Errors**: Check API server status and network

### Debug Tips
1. Enable console logging in test scripts
2. Check response data in Postman console
3. Verify environment variable values
4. Test individual requests before running collections

## 📞 Support

For issues or questions:
1. Check the API documentation
2. Review test scripts and environment variables
3. Verify server configuration
4. Contact the development team

## 🔄 Updates

This collection is regularly updated to include:
- New API endpoints
- Enhanced test coverage
- Improved dummy data
- Additional validation scripts

---

**Happy Testing! 🚀**
