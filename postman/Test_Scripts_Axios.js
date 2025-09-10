// ========================================
// RIDE SERVICE API - AXIOS TEST SCRIPTS
// ========================================
// This file contains comprehensive test scripts using axios for external data fetching
// and advanced Postman testing capabilities

// Global axios configuration
const axiosConfig = {
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Postman-RideService/1.0'
    },
    validateStatus: function (status) {
        return status >= 200 && status < 300;
    }
};

// ========================================
// AUTHENTICATION HELPERS
// ========================================

// Extract and store authentication tokens
function storeAuthTokens(response) {
    try {
        const json = pm.response.json();
        
        if (json.token) {
            if (json.passenger) {
                pm.environment.set('passengerToken', json.token);
                pm.environment.set('passengerId', json.passenger._id);
                pm.environment.set('passengerName', json.passenger.name);
            } else if (json.driver) {
                pm.environment.set('driverToken', json.token);
                pm.environment.set('driverId', json.driver._id);
                pm.environment.set('driverName', json.driver.name);
            } else if (json.admin) {
                pm.environment.set('adminToken', json.token);
                pm.environment.set('adminId', json.admin._id);
                pm.environment.set('adminName', json.admin.fullName);
            } else if (json.staff) {
                pm.environment.set('staffToken', json.token);
                pm.environment.set('staffId', json.staff._id);
                pm.environment.set('staffName', json.staff.fullName);
            }
        }
    } catch (error) {
        console.error('Error storing auth tokens:', error);
    }
}

// ========================================
// EXTERNAL DATA FETCHING WITH AXIOS
// ========================================

// Fetch external mapping data using axios
async function fetchExternalMappingData(pickup, dropoff) {
    try {
        const response = await pm.sendRequest({
            url: 'https://api.openrouteservice.org/v2/directions/driving-car',
            method: 'GET',
            header: {
                'Authorization': 'Bearer YOUR_OPENROUTE_API_KEY',
                'Content-Type': 'application/json'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    coordinates: [[pickup.longitude, pickup.latitude], [dropoff.longitude, dropoff.latitude]],
                    format: 'json'
                })
            }
        });
        
        return response.json();
    } catch (error) {
        console.error('External mapping API error:', error);
        return null;
    }
}

// Fetch external pricing data using axios
async function fetchExternalPricingData(vehicleType, distance, duration) {
    try {
        const response = await pm.sendRequest({
            url: 'https://api.pricing-service.com/calculate',
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
                'X-API-Key': 'YOUR_PRICING_API_KEY'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    vehicleType: vehicleType,
                    distance: distance,
                    duration: duration,
                    timestamp: new Date().toISOString()
                })
            }
        });
        
        return response.json();
    } catch (error) {
        console.error('External pricing API error:', error);
        return null;
    }
}

// ========================================
// COMPREHENSIVE TEST SUITES
// ========================================

// Authentication Tests
function runAuthTests() {
    pm.test('Authentication successful', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
    });
    
    pm.test('Response contains token', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('token');
        pm.expect(json.token).to.be.a('string');
    });
    
    pm.test('Response contains user data', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('passenger').or.have.property('driver').or.have.property('admin').or.have.property('staff');
    });
    
    // Store tokens for subsequent requests
    storeAuthTokens();
}

// Booking Tests
function runBookingTests() {
    pm.test('Booking created successfully', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
    });
    
    pm.test('Response contains booking ID', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('id').or.have.property('_id');
        
        if (json.id) pm.environment.set('bookingId', json.id);
        if (json._id) pm.environment.set('bookingId', json._id);
    });
    
    pm.test('Response contains passenger information', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('passenger');
        if (json.passenger) {
            pm.expect(json.passenger).to.have.property('id');
            pm.expect(json.passenger).to.have.property('name');
            pm.expect(json.passenger).to.have.property('phone');
        }
    });
    
    pm.test('Response contains location data', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('pickup');
        pm.expect(json).to.have.property('dropoff');
        pm.expect(json.pickup).to.have.property('latitude');
        pm.expect(json.pickup).to.have.property('longitude');
        pm.expect(json.dropoff).to.have.property('latitude');
        pm.expect(json.dropoff).to.have.property('longitude');
    });
}

// Driver Discovery Tests
function runDriverDiscoveryTests() {
    pm.test('Driver discovery successful', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
    });
    
    pm.test('Response contains drivers array', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('drivers');
        pm.expect(json.drivers).to.be.an('array');
    });
    
    pm.test('Response contains fare estimate', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('estimate');
        pm.expect(json.estimate).to.have.property('vehicleType');
        pm.expect(json.estimate).to.have.property('distanceKm');
        pm.expect(json.estimate).to.have.property('estimatedFare');
        pm.expect(json.estimate).to.have.property('fareBreakdown');
    });
    
    pm.test('Each driver includes required fields', function () {
        const json = pm.response.json();
        if (json.drivers.length > 0) {
            json.drivers.forEach(driver => {
                pm.expect(driver).to.have.property('id');
                pm.expect(driver).to.have.property('driverId');
                pm.expect(driver).to.have.property('vehicleType');
                pm.expect(driver).to.have.property('rating');
                pm.expect(driver).to.have.property('distanceKm');
                pm.expect(driver).to.have.property('driver');
            });
        }
    });
}

// Analytics Tests
function runAnalyticsTests() {
    pm.test('Analytics data retrieved successfully', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
    });
    
    pm.test('Response contains analytics data', function () {
        const json = pm.response.json();
        pm.expect(json).to.be.an('object');
    });
    
    pm.test('Response contains required analytics fields', function () {
        const json = pm.response.json();
        // Check for common analytics fields
        const hasRequiredFields = json.hasOwnProperty('totalRides') || 
                                 json.hasOwnProperty('totalRevenue') || 
                                 json.hasOwnProperty('activeDrivers') || 
                                 json.hasOwnProperty('data');
        pm.expect(hasRequiredFields).to.be.true;
    });
}

// Live Updates Tests
function runLiveUpdatesTests() {
    pm.test('Live update created successfully', function () {
        pm.expect(pm.response.code).to.be.oneOf([200, 201]);
    });
    
    pm.test('Response contains live update ID', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('id').or.have.property('_id');
        
        if (json.id) pm.environment.set('liveId', json.id);
        if (json._id) pm.environment.set('liveId', json._id);
    });
    
    pm.test('Response contains location data', function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property('latitude');
        pm.expect(json).to.have.property('longitude');
        pm.expect(json).to.have.property('status');
    });
}

// ========================================
// PERFORMANCE TESTS
// ========================================

function runPerformanceTests() {
    pm.test('Response time is acceptable', function () {
        pm.expect(pm.response.responseTime).to.be.below(5000); // 5 seconds
    });
    
    pm.test('Response size is reasonable', function () {
        const responseSize = pm.response.responseSize;
        pm.expect(responseSize).to.be.below(1000000); // 1MB
    });
}

// ========================================
// ERROR HANDLING TESTS
// ========================================

function runErrorHandlingTests() {
    pm.test('Error response is properly formatted', function () {
        if (pm.response.code >= 400) {
            const json = pm.response.json();
            pm.expect(json).to.have.property('error');
            pm.expect(json).to.have.property('message');
        }
    });
    
    pm.test('Error response includes status code', function () {
        if (pm.response.code >= 400) {
            const json = pm.response.json();
            pm.expect(json).to.have.property('statusCode');
            pm.expect(json.statusCode).to.equal(pm.response.code);
        }
    });
}

// ========================================
// INTEGRATION TESTS WITH EXTERNAL APIS
// ========================================

// Test external mapping integration
async function testExternalMappingIntegration() {
    const pickup = { latitude: 40.7128, longitude: -74.0060 };
    const dropoff = { latitude: 40.7589, longitude: -73.9851 };
    
    try {
        const mappingData = await fetchExternalMappingData(pickup, dropoff);
        
        pm.test('External mapping data retrieved', function () {
            pm.expect(mappingData).to.not.be.null;
        });
        
        if (mappingData) {
            pm.test('External mapping contains route data', function () {
                pm.expect(mappingData).to.have.property('features');
                pm.expect(mappingData.features).to.be.an('array');
            });
        }
    } catch (error) {
        console.error('External mapping test failed:', error);
    }
}

// Test external pricing integration
async function testExternalPricingIntegration() {
    const vehicleType = 'mini';
    const distance = 5.2;
    const duration = 18;
    
    try {
        const pricingData = await fetchExternalPricingData(vehicleType, distance, duration);
        
        pm.test('External pricing data retrieved', function () {
            pm.expect(pricingData).to.not.be.null;
        });
        
        if (pricingData) {
            pm.test('External pricing contains fare data', function () {
                pm.expect(pricingData).to.have.property('fare');
                pm.expect(pricingData.fare).to.be.a('number');
            });
        }
    } catch (error) {
        console.error('External pricing test failed:', error);
    }
}

// ========================================
// MAIN TEST EXECUTION
// ========================================

// Run all tests based on request type
const requestUrl = pm.request.url.toString();
const requestMethod = pm.request.method;

if (requestUrl.includes('/auth/')) {
    runAuthTests();
} else if (requestUrl.includes('/bookings') && requestMethod === 'POST') {
    runBookingTests();
} else if (requestUrl.includes('/drivers/discover') || requestUrl.includes('/drivers/available')) {
    runDriverDiscoveryTests();
} else if (requestUrl.includes('/analytics/')) {
    runAnalyticsTests();
} else if (requestUrl.includes('/live/')) {
    runLiveUpdatesTests();
}

// Always run performance and error handling tests
runPerformanceTests();
runErrorHandlingTests();

// Run external API integration tests for specific endpoints
if (requestUrl.includes('/mapping/') || requestUrl.includes('/drivers/estimate')) {
    testExternalMappingIntegration();
}

if (requestUrl.includes('/pricing/') || requestUrl.includes('/bookings/estimate')) {
    testExternalPricingIntegration();
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Generate random test data
function generateTestData() {
    return {
        passenger: {
            name: `Test Passenger ${Math.random().toString(36).substr(2, 9)}`,
            email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
        },
        location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1
        }
    };
}

// Validate response structure
function validateResponseStructure(expectedFields) {
    const json = pm.response.json();
    
    expectedFields.forEach(field => {
        pm.test(`Response contains ${field}`, function () {
            pm.expect(json).to.have.property(field);
        });
    });
}

// Log test results
function logTestResults() {
    console.log('Test Results:');
    console.log('- Response Code:', pm.response.code);
    console.log('- Response Time:', pm.response.responseTime + 'ms');
    console.log('- Response Size:', pm.response.responseSize + ' bytes');
    console.log('- Test Count:', pm.test.count);
    console.log('- Test Passed:', pm.test.passed);
    console.log('- Test Failed:', pm.test.failed);
}