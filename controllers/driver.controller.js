const { Driver } = require('../models/userModels');
const { crudController } = require('./basic.crud');
const { Pricing } = require('../models/pricing');
const { Commission } = require('../models/commission');
const geolib = require('geolib');

const base = {
  ...crudController(Driver),
  list: async (req, res) => {
    try {
      const { page = 1, limit = 20, status, available } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let query = {};
      if (status) {
        query.status = status;
      }
      if (available !== undefined) {
        query.available = available === 'true';
      }
      
      const drivers = await Driver.find(query)
        .select('_id name phone email vehicleType available lastKnownLocation rating createdAt updatedAt')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();
      
      const total = await Driver.countDocuments(query);
      
      const response = drivers.map(d => ({
        id: String(d._id),
        name: d.name,
        phone: d.phone,
        email: d.email,
        vehicleType: d.vehicleType,
        available: !!d.available,
        lastKnownLocation: d.lastKnownLocation || null,
        rating: d.rating || 5.0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
      
      return res.json({
        drivers: response,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (e) {
      return res.status(500).json({ message: `Failed to retrieve Driver list: ${e.message}` });
    }
  },
  get: async (req, res) => {
    try {
      const driver = await Driver.findById(req.params.id)
        .select('_id name phone email vehicleType available lastKnownLocation rating createdAt updatedAt')
        .lean();
      
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      
      const response = {
        id: String(driver._id),
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        vehicleType: driver.vehicleType,
        available: !!driver.available,
        lastKnownLocation: driver.lastKnownLocation || null,
        rating: driver.rating || 5.0,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt
      };
      
      return res.json(response);
    } catch (e) {
      return res.status(500).json({ message: `Failed to retrieve Driver: ${e.message}` });
    }
  }
};

async function setAvailability(req, res) {
  try {
    const driverId = String((((req.user && req.user.id) !== undefined && (req.user && req.user.id) !== null) ? req.user.id : req.params.id) || '');
    if (!driverId) return res.status(400).json({ message: 'Invalid driver id' });
    const d = await Driver.findByIdAndUpdate(driverId, { $set: { available: !!req.body.available } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    if (!d) return res.status(404).json({ message: 'Not found' });
    
    // Add driver basic information from JWT token
    const driverInfo = {
      id: String(req.user.id),
      name: req.user.name || req.user.fullName || req.user.displayName,
      phone: req.user.phone || req.user.phoneNumber || req.user.mobile,
      email: req.user.email,
      vehicleType: req.user.vehicleType
    };
    
    const response = {
      id: String(d._id),
      driverId: String(d._id),
      available: d.available,
      vehicleType: d.vehicleType,
      lastKnownLocation: d.lastKnownLocation,
      rating: d.rating || 5.0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      driver: driverInfo
    };
    
    return res.json(response);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function updateLocation(req, res) {
  try {
    const driverId = String((((req.user && req.user.id) !== undefined && (req.user && req.user.id) !== null) ? req.user.id : req.params.id) || '');
    if (!driverId) return res.status(400).json({ message: 'Invalid driver id' });
    const { latitude, longitude, bearing } = req.body;
    
    const locationUpdate = { latitude, longitude };
    if (bearing !== undefined && bearing >= 0 && bearing <= 360) {
      locationUpdate.bearing = bearing;
    }
    
    const d = await Driver.findByIdAndUpdate(driverId, { $set: { lastKnownLocation: locationUpdate } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    if (!d) return res.status(404).json({ message: 'Not found' });
    
    // Add driver basic information from JWT token
    const driverInfo = {
      id: String(req.user.id),
      name: req.user.name || req.user.fullName || req.user.displayName,
      phone: req.user.phone || req.user.phoneNumber || req.user.mobile,
      email: req.user.email,
      vehicleType: req.user.vehicleType
    };
    
    const response = {
      id: String(d._id),
      driverId: String(d._id),
      available: d.available,
      vehicleType: d.vehicleType,
      lastKnownLocation: d.lastKnownLocation,
      rating: d.rating || 5.0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      driver: driverInfo
    };
    
    return res.json(response);
  } catch (e) { return res.status(500).json({ message: e.message }); }
}

async function availableNearby(req, res) {
  try {
    const { latitude, longitude, radiusKm = 5, vehicleType } = req.query;
    
    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    
    const passengerLat = parseFloat(latitude);
    const passengerLon = parseFloat(longitude);
    const searchRadius = parseFloat(radiusKm);
    
    console.log(`🔍 Searching for drivers near passenger at ${passengerLat}, ${passengerLon} within ${searchRadius}km`);
    
    // Get all drivers from external service only
    const { listDrivers } = require('../services/userDirectory');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    
    let externalDrivers = [];
    try {
      externalDrivers = await listDrivers({ 
        available: true, 
        ...(vehicleType ? { vehicleType } : {}) 
      }, { headers: authHeader });
      console.log(`📊 Found ${externalDrivers.length} available drivers from external service`);
    } catch (error) {
      console.error('❌ Failed to fetch drivers from external service:', error.message);
      return res.status(500).json({ message: 'Failed to fetch drivers from external service' });
    }
    
    // Filter drivers by location and distance
    const nearby = externalDrivers.filter(driver => {
      // Check for location in both possible structures
      const location = driver.location || driver.lastKnownLocation;
      if (!location || !location.latitude || !location.longitude) {
        console.log(`❌ Driver ${driver.id} has invalid location data:`, location);
        return false;
      }
      
      const distance = distanceKm(location, { latitude: passengerLat, longitude: passengerLon });
      console.log(`📍 Driver ${driver.id} (${driver.name || 'No name'}) at ${location.latitude}, ${location.longitude} - distance: ${distance.toFixed(2)}km`);
      
      return distance <= searchRadius;
    });
    
    console.log(`✅ Found ${nearby.length} drivers within ${searchRadius}km`);

    // Format response
    const enriched = nearby.map(driver => {
      const location = driver.location || driver.lastKnownLocation;
      const distance = distanceKm(location, { latitude: passengerLat, longitude: passengerLon });
      
      return {
        id: String(driver.id),
        driverId: String(driver.id),
        vehicleType: driver.vehicleType || 'mini',
        rating: driver.rating || 5.0,
        lastKnownLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          bearing: location.bearing || null
        },
        distanceKm: distance,
        driver: {
          id: String(driver.id),
          name: driver.name || 'Driver',
          phone: driver.phone || 'N/A',
          email: driver.email || 'N/A',
          vehicleType: driver.vehicleType || 'mini'
        }
      };
    });

    // Sort by distance (closest first)
    enriched.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json(enriched);
  } catch (e) { 
    console.error('Error in availableNearby:', e);
    return res.status(500).json({ message: `Failed to find nearby drivers: ${e.message}` }); 
  }
}

function distanceKm(a, b) {
  if (!a || !b || a.latitude == null || b.latitude == null || a.longitude == null || b.longitude == null) {
    console.log('❌ Invalid coordinates for distance calculation:', { a, b });
    return Number.POSITIVE_INFINITY;
  }
  
  // Handle exact same location
  if (a.latitude === b.latitude && a.longitude === b.longitude) {
    return 0;
  }
  
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const aHarv = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  
  // Handle edge case where points are antipodal
  if (aHarv >= 1) {
    return Math.PI * R;
  }
  
  return 2 * R * Math.asin(Math.sqrt(aHarv));
}

// Fare estimation for passengers before booking
async function estimateFareForPassenger(req, res) {
  try {
    const { vehicleType = 'mini', pickup, dropoff } = req.body;
    
    if (!pickup || !dropoff) {
      return res.status(400).json({ message: 'Pickup and dropoff locations are required' });
    }

    if (!pickup.latitude || !pickup.longitude || !dropoff.latitude || !dropoff.longitude) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required for both pickup and dropoff' });
    }

    // Calculate distance
    const distanceKm = geolib.getDistance(
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: dropoff.latitude, longitude: dropoff.longitude }
    ) / 1000;

    // Get pricing for vehicle type
    let pricing;
    try {
      pricing = await Pricing.findOne({ vehicleType, isActive: true }).sort({ updatedAt: -1 });
      
      if (!pricing) {
        return res.status(404).json({ message: `No pricing found for vehicle type: ${vehicleType}` });
      }
    } catch (error) {
      console.error('Error finding pricing:', error);
      return res.status(500).json({ message: `Database error: ${error.message}` });
    }

    // Calculate fare breakdown
    const fareBreakdown = {
      base: pricing.baseFare,
      distanceCost: distanceKm * pricing.perKm,
      timeCost: 0, // Could be calculated based on estimated travel time
      waitingCost: 0, // Could be calculated based on waiting time
      surgeMultiplier: pricing.surgeMultiplier
    };

    const estimatedFare = (fareBreakdown.base + fareBreakdown.distanceCost + fareBreakdown.timeCost + fareBreakdown.waitingCost) * fareBreakdown.surgeMultiplier;

    res.json({
      vehicleType,
      distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      fareBreakdown,
      pricing: {
        baseFare: pricing.baseFare,
        perKm: pricing.perKm,
        perMinute: pricing.perMinute,
        waitingPerMinute: pricing.waitingPerMinute,
        surgeMultiplier: pricing.surgeMultiplier
      }
    });
  } catch (e) {
    res.status(500).json({ message: `Failed to estimate fare: ${e.message}` });
  }
}

// Fare estimation for drivers before accepting booking
async function estimateFareForDriver(req, res) {
  try {
    const { bookingId } = req.params;
    const driverId = req.user.id;

    // Get the booking details
    const { Booking } = require('../models/bookingModels');
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if driver is assigned to this booking
    if (booking.driverId && booking.driverId !== driverId) {
      return res.status(403).json({ message: 'You are not assigned to this booking' });
    }

    // Calculate distance if not already calculated
    let distanceKm = booking.distanceKm;
    if (!distanceKm && booking.pickup && booking.dropoff) {
      distanceKm = geolib.getDistance(
        { latitude: booking.pickup.latitude, longitude: booking.pickup.longitude },
        { latitude: booking.dropoff.latitude, longitude: booking.dropoff.longitude }
      ) / 1000;
    }

    // Get pricing for vehicle type
    let pricing;
    try {
      pricing = await Pricing.findOne({ vehicleType: booking.vehicleType, isActive: true }).sort({ updatedAt: -1 });
      
      if (!pricing) {
        return res.status(404).json({ message: `No pricing found for vehicle type: ${booking.vehicleType}` });
      }
    } catch (error) {
      console.error('Error finding pricing for driver:', error);
      return res.status(500).json({ message: `Database error: ${error.message}` });
    }

    // Calculate fare breakdown
    const fareBreakdown = {
      base: pricing.baseFare,
      distanceCost: distanceKm * pricing.perKm,
      timeCost: 0,
      waitingCost: 0,
      surgeMultiplier: pricing.surgeMultiplier
    };

    const estimatedFare = (fareBreakdown.base + fareBreakdown.distanceCost + fareBreakdown.timeCost + fareBreakdown.waitingCost) * fareBreakdown.surgeMultiplier;

    // Calculate driver earnings (after commission)
    let commission;
    try {
      commission = await Commission.findOne({ isActive: true }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error finding commission:', error);
      // Use default commission rate if database error
      commission = null;
    }
    const commissionRate = commission ? commission.percentage : 15; // Default 15%
    
    const grossFare = estimatedFare;
    const commissionAmount = (grossFare * commissionRate) / 100;
    const netEarnings = grossFare - commissionAmount;

    res.json({
      bookingId: booking._id,
      vehicleType: booking.vehicleType,
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      fareBreakdown,
      driverEarnings: {
        grossFare: Math.round(grossFare * 100) / 100,
        commissionRate: commissionRate,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100
      },
      pickup: booking.pickup,
      dropoff: booking.dropoff
    });
  } catch (e) {
    res.status(500).json({ message: `Failed to estimate fare for driver: ${e.message}` });
  }
}

module.exports = { 
  ...base, 
  setAvailability, 
  updateLocation, 
  availableNearby, 
  estimateFareForPassenger, 
  estimateFareForDriver 
};

// Combined driver discovery and fare estimation for passengers
async function discoverAndEstimate(req, res) {
  try {
    const { pickup, dropoff, radiusKm = 5, vehicleType } = req.body || {};

    if (!pickup || !dropoff) {
      return res.status(400).json({ message: 'pickup and dropoff are required' });
    }
    if (
      pickup.latitude == null || pickup.longitude == null ||
      dropoff.latitude == null || dropoff.longitude == null
    ) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required for pickup and dropoff' });
    }

    const pickupLat = parseFloat(pickup.latitude);
    const pickupLon = parseFloat(pickup.longitude);
    const searchRadius = parseFloat(radiusKm);
    
    console.log(`🔍 Discover & Estimate: Searching for drivers near pickup at ${pickupLat}, ${pickupLon} within ${searchRadius}km`);

    // Get all drivers from external service only
    const { listDrivers } = require('../services/userDirectory');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    
    let externalDrivers = [];
    try {
      externalDrivers = await listDrivers({ 
        available: true, 
        ...(vehicleType ? { vehicleType } : {}) 
      }, { headers: authHeader });
      console.log(`📊 Found ${externalDrivers.length} available drivers from external service`);
    } catch (error) {
      console.error('❌ Failed to fetch drivers from external service:', error.message);
      return res.status(500).json({ message: 'Failed to fetch drivers from external service' });
    }
    
    // Filter drivers by location and distance
    const nearby = externalDrivers.filter(driver => {
      // Check for location in both possible structures
      const location = driver.location || driver.lastKnownLocation;
      if (!location || !location.latitude || !location.longitude) {
        console.log(`❌ Driver ${driver.id} has invalid location data:`, location);
        return false;
      }
      
      const distance = distanceKm(location, { latitude: pickupLat, longitude: pickupLon });
      console.log(`📍 Driver ${driver.id} (${driver.name || 'No name'}) at ${location.latitude}, ${location.longitude} - distance: ${distance.toFixed(2)}km`);
      
      return distance <= searchRadius;
    });
    
    console.log(`✅ Found ${nearby.length} drivers within ${searchRadius}km`);

    // Format response
    const drivers = nearby.map(driver => {
      const location = driver.location || driver.lastKnownLocation;
      const distance = distanceKm(location, { latitude: pickupLat, longitude: pickupLon });
      
      return {
        id: String(driver.id),
        driverId: String(driver.id),
        vehicleType: driver.vehicleType || 'mini',
        rating: driver.rating || 5.0,
        lastKnownLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          bearing: location.bearing || null
        },
        distanceKm: distance,
        driver: {
          id: String(driver.id),
          name: driver.name || 'Driver',
          phone: driver.phone || 'N/A',
          email: driver.email || 'N/A',
          vehicleType: driver.vehicleType || 'mini'
        }
      };
    });
    
    drivers.sort((a, b) => a.distanceKm - b.distanceKm);

    // Fare estimation
    let pricing;
    try {
      pricing = await Pricing.findOne({ vehicleType: vehicleType || 'mini', isActive: true }).sort({ updatedAt: -1 });
      if (!pricing) {
        return res.status(404).json({ message: `No pricing found for vehicle type: ${vehicleType || 'mini'}` });
      }
    } catch (error) {
      console.error('Error finding pricing in discoverAndEstimate:', error);
      return res.status(500).json({ message: `Database error: ${error.message}` });
    }

    const distanceKmVal = geolib.getDistance(
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: dropoff.latitude, longitude: dropoff.longitude }
    ) / 1000;

    const fareBreakdown = {
      base: pricing.baseFare,
      distanceCost: distanceKmVal * pricing.perKm,
      timeCost: 0,
      waitingCost: 0,
      surgeMultiplier: pricing.surgeMultiplier
    };
    const estimatedFare = (fareBreakdown.base + fareBreakdown.distanceCost + fareBreakdown.timeCost + fareBreakdown.waitingCost) * fareBreakdown.surgeMultiplier;

    return res.json({
      drivers,
      estimate: {
        vehicleType: vehicleType || 'mini',
        distanceKm: Math.round(distanceKmVal * 100) / 100,
        estimatedFare: Math.round(estimatedFare * 100) / 100,
        fareBreakdown
      }
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to discover drivers and estimate fare: ${e.message}` });
  }
}

// Debug endpoint for testing location matching
async function debugLocation(req, res) {
  try {
    const { latitude, longitude, radiusKm = 5 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    
    const passengerLat = parseFloat(latitude);
    const passengerLon = parseFloat(longitude);
    const searchRadius = parseFloat(radiusKm);
    
    console.log(`🔍 DEBUG: Testing location matching for passenger at ${passengerLat}, ${passengerLon} within ${searchRadius}km`);
    
    // Get all drivers from external service only
    const { listDrivers } = require('../services/userDirectory');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    
    let externalDrivers = [];
    try {
      externalDrivers = await listDrivers({}, { headers: authHeader });
      console.log(`📊 DEBUG: Found ${externalDrivers.length} total drivers from external service`);
    } catch (error) {
      console.error('❌ DEBUG: Failed to fetch drivers from external service:', error.message);
      return res.status(500).json({ message: 'Failed to fetch drivers from external service' });
    }
    
    const availableDrivers = externalDrivers.filter(d => d.available);
    console.log(`📊 DEBUG: Found ${availableDrivers.length} available drivers`);
    
    const driversWithLocation = availableDrivers.filter(d => {
      const location = d.location || d.lastKnownLocation;
      return location && location.latitude && location.longitude;
    });
    console.log(`📊 DEBUG: Found ${driversWithLocation.length} available drivers with location data`);
    
    const nearbyDrivers = driversWithLocation.filter(d => {
      const location = d.location || d.lastKnownLocation;
      const distance = distanceKm(location, { latitude: passengerLat, longitude: passengerLon });
      console.log(`📍 DEBUG: Driver ${d.id} (${d.name || 'No name'}) at ${location.latitude}, ${location.longitude} - distance: ${distance.toFixed(2)}km`);
      return distance <= searchRadius;
    });
    
    console.log(`✅ DEBUG: Found ${nearbyDrivers.length} drivers within ${searchRadius}km`);
    
    const response = {
      passengerLocation: { latitude: passengerLat, longitude: passengerLon },
      searchRadius: searchRadius,
      totalDrivers: externalDrivers.length,
      availableDrivers: availableDrivers.length,
      driversWithLocation: driversWithLocation.length,
      nearbyDrivers: nearbyDrivers.length,
      drivers: nearbyDrivers.map(d => {
        const location = d.location || d.lastKnownLocation;
        return {
          id: String(d.id),
          name: d.name || 'No name',
          phone: d.phone || 'No phone',
          vehicleType: d.vehicleType,
          available: d.available,
          location: location,
          distanceKm: distanceKm(location, { latitude: passengerLat, longitude: passengerLon })
        };
      })
    };
    
    return res.json(response);
  } catch (e) {
    console.error('DEBUG ERROR:', e);
    return res.status(500).json({ message: `Debug failed: ${e.message}` });
  }
}

module.exports.discoverAndEstimate = discoverAndEstimate;
module.exports.debugLocation = debugLocation;

