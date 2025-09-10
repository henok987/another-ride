// Comprehensive Test Scripts for Ride Service API
// This file contains reusable test scripts that can be used across all requests

// =============================================================================
// AUTHENTICATION & TOKEN MANAGEMENT
// =============================================================================

// Extract and store authentication tokens
function extractAuthTokens() {
    if (pm.response.code === 200 || pm.response.code === 201) {
        const json = pm.response.json();
        
        // Extract passenger token and data
        if (json.token && json.passenger) {
            pm.environment.set('passengerToken', json.token);
            if (json.passenger._id) pm.environment.set('passengerId', json.passenger._id);
            if (json.passenger.name) pm.environment.set('passengerName', json.passenger.name);
            console.log('Passenger token and data extracted successfully');
        }
        
        // Extract driver token and data
        if (json.token && json.driver) {
            pm.environment.set('driverToken', json.token);
            if (json.driver._id) pm.environment.set('driverId', json.driver._id);
            if (json.driver.name) pm.environment.set('driverName', json.driver.name);
            console.log('Driver token and data extracted successfully');
        }
        
        // Extract admin token and data
        if (json.token && json.admin) {
            pm.environment.set('adminToken', json.token);
            if (json.admin._id) pm.environment.set('adminId', json.admin._id);
            if (json.admin.fullName) pm.environment.set('adminName', json.admin.fullName);
            console.log('Admin token and data extracted successfully');
        }
        
        // Extract staff token and data
        if (json.token && json.staff) {
            pm.environment.set('staffToken', json.token);
            if (json.staff._id) pm.environment.set('staffId', json.staff._id);
            if (json.staff.fullName) pm.environment.set('staffName', json.staff.fullName);
            console.log('Staff token and data extracted successfully');
        }
    }
}

// =============================================================================
// ID EXTRACTION HELPERS
// =============================================================================

// Extract and store booking ID
function extractBookingId() {
    if (pm.response.code === 201) {
        const json = pm.response.json();
        if (json._id) {
            pm.environment.set('bookingId', json._id);
            console.log('Booking ID extracted: ' + json._id);
        }
    }
}

// Extract and store trip ID
function extractTripId() {
    if (pm.response.code === 201) {
        const json = pm.response.json();
        if (json._id) {
            pm.environment.set('tripId', json._id);
            console.log('Trip ID extracted: ' + json._id);
        }
    }
}

// Extract and store assignment ID
function extractAssignmentId() {
    if (pm.response.code === 201) {
        const json = pm.response.json();
        if (json._id) {
            pm.environment.set('assignmentId', json._id);
            console.log('Assignment ID extracted: ' + json._id);
        }
    }
}

// Extract and store pricing ID
function extractPricingId() {
    if (pm.response.code === 201) {
        const json = pm.response.json();
        if (json._id) {
            pm.environment.set('pricingId', json._id);
            console.log('Pricing ID extracted: ' + json._id);
        }
    }
}

// Extract and store live update ID
function extractLiveId() {
    if (pm.response.code === 201) {
        const json = pm.response.json();
        if (json._id) {
            pm.environment.set('liveId', json._id);
            console.log('Live update ID extracted: ' + json._id);
        }
    }
}

// =============================================================================
// RESPONSE VALIDATION HELPERS
// =============================================================================

// Validate successful response
function validateSuccessResponse() {
    pm.test('Response status code is successful', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201, 202]);
    });
    
    pm.test('Response has valid JSON', function () {
        pm.response.to.be.json;
    });
    
    pm.test('Response time is acceptable', function () {
        pm.expect(pm.response.responseTime).to.be.below(5000);
    });
}

// Validate error response
function validateErrorResponse(expectedCode = 400) {
    pm.test('Response status code is error', function () {
        pm.expect(pm.response.code).to.equal(expectedCode);
    });
    
    pm.test('Response has error message', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('message');
    });
}

// Validate authentication required
function validateAuthRequired() {
    pm.test('Response status code is 401', function () {
        pm.expect(pm.response.code).to.equal(401);
    });
    
    pm.test('Response indicates authentication required', function () {
        const json = pm.response.json();
        pm.expect(json.message).to.include('auth');
    });
}

// =============================================================================
// DATA VALIDATION HELPERS
// =============================================================================

// Validate booking data structure
function validateBookingData() {
    const json = pm.response.json();
    
    pm.test('Booking has required fields', function () {
        pm.expect(json).to.have.property('_id');
        pm.expect(json).to.have.property('vehicleType');
        pm.expect(json).to.have.property('pickup');
        pm.expect(json).to.have.property('dropoff');
        pm.expect(json).to.have.property('status');
    });
    
    pm.test('Booking has passenger information', function () {
        pm.expect(json).to.have.property('passengerId');
        pm.expect(json).to.have.property('passengerName');
    });
    
    pm.test('Pickup location is valid', function () {
        pm.expect(json.pickup).to.have.property('latitude');
        pm.expect(json.pickup).to.have.property('longitude');
        pm.expect(json.pickup.latitude).to.be.a('number');
        pm.expect(json.pickup.longitude).to.be.a('number');
    });
    
    pm.test('Dropoff location is valid', function () {
        pm.expect(json.dropoff).to.have.property('latitude');
        pm.expect(json.dropoff).to.have.property('longitude');
        pm.expect(json.dropoff.latitude).to.be.a('number');
        pm.expect(json.dropoff.longitude).to.be.a('number');
    });
}

// Validate driver data structure
function validateDriverData() {
    const json = pm.response.json();
    
    pm.test('Driver has required fields', function () {
        pm.expect(json).to.have.property('_id');
        pm.expect(json).to.have.property('name');
        pm.expect(json).to.have.property('phone');
        pm.expect(json).to.have.property('email');
    });
    
    pm.test('Driver has location data', function () {
        pm.expect(json).to.have.property('currentLocation');
        pm.expect(json.currentLocation).to.have.property('latitude');
        pm.expect(json.currentLocation).to.have.property('longitude');
    });
    
    pm.test('Driver has availability status', function () {
        pm.expect(json).to.have.property('available');
        pm.expect(json.available).to.be.a('boolean');
    });
}

// Validate fare estimation data
function validateFareData() {
    const json = pm.response.json();
    
    pm.test('Fare estimation has required fields', function () {
        pm.expect(json).to.have.property('estimatedFare');
        pm.expect(json).to.have.property('distance');
        pm.expect(json).to.have.property('duration');
        pm.expect(json).to.have.property('vehicleType');
    });
    
    pm.test('Fare amount is valid', function () {
        pm.expect(json.estimatedFare).to.be.a('number');
        pm.expect(json.estimatedFare).to.be.above(0);
    });
    
    pm.test('Distance is valid', function () {
        pm.expect(json.distance).to.be.a('number');
        pm.expect(json.distance).to.be.above(0);
    });
    
    pm.test('Duration is valid', function () {
        pm.expect(json.duration).to.be.a('number');
        pm.expect(json.duration).to.be.above(0);
    });
}

// Validate analytics data
function validateAnalyticsData() {
    const json = pm.response.json();
    
    pm.test('Analytics data has required fields', function () {
        pm.expect(json).to.have.property('totalRides');
        pm.expect(json).to.have.property('totalEarnings');
        pm.expect(json).to.have.property('averageRating');
    });
    
    pm.test('Numeric values are valid', function () {
        pm.expect(json.totalRides).to.be.a('number');
        pm.expect(json.totalEarnings).to.be.a('number');
        pm.expect(json.averageRating).to.be.a('number');
    });
}

// =============================================================================
// PERFORMANCE TESTING HELPERS
// =============================================================================

// Test response time performance
function testPerformance(maxTime = 2000) {
    pm.test('Response time is acceptable', function () {
        pm.expect(pm.response.responseTime).to.be.below(maxTime);
    });
}

// Test memory usage (if available)
function testMemoryUsage() {
    pm.test('Response size is reasonable', function () {
        const responseSize = pm.response.responseSize;
        pm.expect(responseSize).to.be.below(1000000); // 1MB limit
    });
}

// =============================================================================
// SECURITY TESTING HELPERS
// =============================================================================

// Test for sensitive data exposure
function testSensitiveDataExposure() {
    const responseText = pm.response.text();
    
    pm.test('No password in response', function () {
        pm.expect(responseText).to.not.include('password');
    });
    
    pm.test('No internal tokens in response', function () {
        pm.expect(responseText).to.not.include('internal');
    });
}

// Test CORS headers
function testCORSHeaders() {
    pm.test('CORS headers are present', function () {
        pm.expect(pm.response.headers.get('Access-Control-Allow-Origin')).to.exist;
    });
}

// =============================================================================
// BUSINESS LOGIC VALIDATION
// =============================================================================

// Validate booking status transitions
function validateBookingStatusTransition(fromStatus, toStatus) {
    const json = pm.response.json();
    
    pm.test('Booking status updated correctly', function () {
        pm.expect(json.status).to.equal(toStatus);
    });
    
    pm.test('Status transition is valid', function () {
        const validTransitions = {
            'pending': ['accepted', 'canceled'],
            'accepted': ['ongoing', 'canceled'],
            'ongoing': ['completed', 'canceled'],
            'completed': [],
            'canceled': []
        };
        
        const allowedTransitions = validTransitions[fromStatus] || [];
        pm.expect(allowedTransitions).to.include(toStatus);
    });
}

// Validate fare calculation
function validateFareCalculation() {
    const json = pm.response.json();
    
    pm.test('Fare calculation is reasonable', function () {
        const fare = json.estimatedFare || json.fare;
        pm.expect(fare).to.be.above(0);
        pm.expect(fare).to.be.below(1000); // Reasonable upper limit
    });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Generate random test data
function generateRandomTestData() {
    const randomId = Math.random().toString(36).substr(2, 9);
    const randomEmail = `test${randomId}@example.com`;
    const randomPhone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    
    return {
        id: randomId,
        email: randomEmail,
        phone: randomPhone
    };
}

// Log response for debugging
function logResponse() {
    console.log('Response Status:', pm.response.code);
    console.log('Response Time:', pm.response.responseTime + 'ms');
    console.log('Response Size:', pm.response.responseSize + ' bytes');
    
    if (pm.response.json()) {
        console.log('Response Body:', JSON.stringify(pm.response.json(), null, 2));
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Run common validations
validateSuccessResponse();
testPerformance();
testSensitiveDataExposure();

// Extract relevant IDs based on request type
const requestName = pm.info.requestName.toLowerCase();

if (requestName.includes('login') || requestName.includes('register')) {
    extractAuthTokens();
}

if (requestName.includes('booking') && requestName.includes('create')) {
    extractBookingId();
    validateBookingData();
}

if (requestName.includes('trip') && requestName.includes('create')) {
    extractTripId();
}

if (requestName.includes('assignment') && requestName.includes('create')) {
    extractAssignmentId();
}

if (requestName.includes('pricing') && requestName.includes('create')) {
    extractPricingId();
}

if (requestName.includes('live') && requestName.includes('create')) {
    extractLiveId();
}

if (requestName.includes('fare') || requestName.includes('estimate')) {
    validateFareData();
}

if (requestName.includes('analytics') || requestName.includes('earnings') || requestName.includes('rewards')) {
    validateAnalyticsData();
}

if (requestName.includes('driver') && requestName.includes('available')) {
    validateDriverData();
}

// Log response for debugging (uncomment if needed)
// logResponse();
