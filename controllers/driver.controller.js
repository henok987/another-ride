const { Driver } = require('../models/userModels');
const { crudController } = require('./basic.crud');
const { Pricing } = require('../models/pricing');
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
    // Persist externalId mapping from JWT if present
    try {
      const jwtUserId = req.user && req.user.id ? String(req.user.id) : null;
      if (jwtUserId && (!d.externalId || String(d.externalId) !== jwtUserId)) {
        await Driver.findByIdAndUpdate(d._id, { $set: { externalId: jwtUserId } });
        d.externalId = jwtUserId;
      }
    } catch (_) {}
    
    // Fetch driver information from external service (no JWT fallback)
    const { getDriverById } = require('../integrations/userServiceClient');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    const lookupIdAvail = String(d.externalId || driverId);
    const ext = await getDriverById(lookupIdAvail, { headers: authHeader });
    const driverInfo = ext ? {
      id: String(driverId),
      name: ext.name,
      phone: ext.phone,
      email: ext.email,
      vehicleType: d.vehicleType
    } : {
      id: String(driverId),
      name: '',
      phone: '',
      email: '',
      vehicleType: d.vehicleType
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
    // Persist externalId mapping from JWT if present
    try {
      const jwtUserId = req.user && req.user.id ? String(req.user.id) : null;
      if (jwtUserId && (!d.externalId || String(d.externalId) !== jwtUserId)) {
        await Driver.findByIdAndUpdate(d._id, { $set: { externalId: jwtUserId } });
        d.externalId = jwtUserId;
      }
    } catch (_) {}
    
    // Fetch driver information from external service (no JWT fallback)
    const { getDriverById: getDriverByIdA } = require('../integrations/userServiceClient');
    const authHeaderA = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    const lookupIdLoc = String(d.externalId || driverId);
    const extA = await getDriverByIdA(lookupIdLoc, { headers: authHeaderA });
    const driverInfo = extA ? {
      id: String(driverId),
      name: extA.name,
      phone: extA.phone,
      email: extA.email,
      vehicleType: d.vehicleType
    } : {
      id: String(driverId),
      name: '',
      phone: '',
      email: '',
      vehicleType: d.vehicleType
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
    const all = await Driver.find({ available: true, ...(vehicleType ? { vehicleType } : {}) });
    const nearby = all.filter(d => d.lastKnownLocation && distanceKm(d.lastKnownLocation, { latitude: +latitude, longitude: +longitude }) <= +radiusKm);

    // Enrich driver info via templated external user directory to target the correct API
    const { getDriverById, getDriversByIds } = require('../integrations/userServiceClient');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;

    // Prefetch external data in batch for better hit rate and performance
    let batchMap = {};
    try {
      const batch = await getDriversByIds(nearby.map(d => String(d._id)), { headers: authHeader });
      batchMap = Object.fromEntries((batch || []).map(u => [String(u.id), { name: u.name, phone: u.phone, email: u.email }]));
    } catch (_) {}

    const enriched = await Promise.all(nearby.map(async (driver) => {
      const base = {
        id: String(driver._id),
        driverId: String(driver._id),
        vehicleType: driver.vehicleType,
        rating: driver.rating || 5.0,
        lastKnownLocation: {
          latitude: driver.lastKnownLocation.latitude,
          longitude: driver.lastKnownLocation.longitude,
          bearing: driver.lastKnownLocation.bearing || null
        },
        distanceKm: distanceKm(driver.lastKnownLocation, { latitude: +latitude, longitude: +longitude })
      };

      const lookupId = String(driver.externalId || driver._id);
      let name = batchMap[lookupId]?.name;
      let phone = batchMap[lookupId]?.phone;
      let email = batchMap[lookupId]?.email;
      if (!name || !phone) {
        try {
          const ext = await getDriverById(lookupId, { headers: authHeader });
          if (ext) {
            name = name || ext.name;
            phone = phone || ext.phone;
            email = email || ext.email;
            // persist enrichment for future requests
            try {
              const update = { };
              if (ext.name && !driver.name) update.name = ext.name;
              if (ext.phone && !driver.phone) update.phone = ext.phone;
              if (ext.email && !driver.email) update.email = ext.email;
              if (driver.externalId == null && lookupId !== String(driver._id)) update.externalId = lookupId;
              if (Object.keys(update).length) await Driver.findByIdAndUpdate(driver._id, { $set: update });
            } catch (_) {}
          }
        } catch (_) {}
      }

      // Only return drivers with real external data (require name and phone; email optional)
      if (!name || !phone) {
        return null;
      }

      const driverInfo = {
        id: String(driver._id),
        name: name,
        phone: phone,
        email: email,
        vehicleType: driver.vehicleType
      };

      return { ...base, driver: driverInfo };
    }));

    // Remove nulls and sort by distance (closest first)
    const filtered = enriched.filter(Boolean);
    filtered.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json(filtered);
  } catch (e) { return res.status(500).json({ message: `Failed to find nearby drivers: ${e.message}` }); }
}

function distanceKm(a, b) {
  if (!a || !b || a.latitude == null || b.latitude == null) return Number.POSITIVE_INFINITY;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const aHarv = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
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
    const pricing = await Pricing.findOne({ vehicleType, isActive: true }).sort({ updatedAt: -1 });
    
    if (!pricing) {
      return res.status(404).json({ message: `No pricing found for vehicle type: ${vehicleType}` });
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
    const pricing = await Pricing.findOne({ vehicleType: booking.vehicleType, isActive: true }).sort({ updatedAt: -1 });
    
    if (!pricing) {
      return res.status(404).json({ message: `No pricing found for vehicle type: ${booking.vehicleType}` });
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
    const { Commission } = require('../models/commission');
    const commission = await Commission.findOne({ isActive: true }).sort({ createdAt: -1 });
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

    // Find nearby available drivers (reuse logic with minimal duplication)
    const all = await Driver.find({ available: true, ...(vehicleType ? { vehicleType } : {}) });
    const nearby = all.filter(d => d.lastKnownLocation && distanceKm(d.lastKnownLocation, { latitude: +pickup.latitude, longitude: +pickup.longitude }) <= +radiusKm);

    // Enrich driver data via templated external user directory to target the correct API
    const { getDriverById: getDriverById2, getDriversByIds: getDriversByIds2 } = require('../services/userDirectory');
    const authHeader2 = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;

    // Try batch first for efficiency
    let idToExternal = {};
    try {
      const batch = await getDriversByIds2(nearby.map(d => String(d._id)), { headers: authHeader2 });
      idToExternal = Object.fromEntries((batch || []).map(u => [String(u.id), { name: u.name, phone: u.phone, email: u.email }]));
    } catch (_) {}

    const drivers = await Promise.all(nearby.map(async (driver) => {
      const base = {
        id: String(driver._id),
        driverId: String(driver._id),
        vehicleType: driver.vehicleType,
        rating: driver.rating || 5.0,
        lastKnownLocation: driver.lastKnownLocation || null,
        distanceKm: distanceKm(driver.lastKnownLocation, { latitude: +pickup.latitude, longitude: +pickup.longitude })
      };

      const lookupId = driver.externalId || driver._id;
      let name = idToExternal[String(lookupId)]?.name || undefined;
      let phone = idToExternal[String(lookupId)]?.phone || undefined;
      let email = idToExternal[String(lookupId)]?.email || undefined;
      if (!name || !phone || !email) {
        try {
          const ext = await getDriverById2(String(lookupId), { headers: authHeader2 });
          if (ext) {
            name = name || ext.name;
            phone = phone || ext.phone;
            email = email || ext.email;
            // persist enrichment
            try {
              const update = { };
              if (ext.name && !driver.name) update.name = ext.name;
              if (ext.phone && !driver.phone) update.phone = ext.phone;
              if (ext.email && !driver.email) update.email = ext.email;
              if (driver.externalId == null && lookupId !== driver._id) update.externalId = String(lookupId);
              if (Object.keys(update).length) await Driver.findByIdAndUpdate(driver._id, { $set: update });
            } catch (_) {}
          }
        } catch (_) {}
      }

      const driverInfo = {
        id: String(driver._id),
        name: name || '',
        phone: phone || '',
        email: email || '',
        vehicleType: driver.vehicleType
      };

      return { ...base, driver: driverInfo };
    }));
    drivers.sort((a, b) => a.distanceKm - b.distanceKm);

    // Fare estimation
    const pricing = await Pricing.findOne({ vehicleType: vehicleType || 'mini', isActive: true }).sort({ updatedAt: -1 });
    if (!pricing) {
      return res.status(404).json({ message: `No pricing found for vehicle type: ${vehicleType || 'mini'}` });
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

module.exports.discoverAndEstimate = discoverAndEstimate;

// Get driver last known location with external service populated driver info
module.exports.getLocation = async function getLocation(req, res) {
  try {
    const driverId = String(req.params.id || '');
    if (!driverId) return res.status(400).json({ message: 'Invalid driver id' });
    const d = await Driver.findById(driverId).lean();
    if (!d) return res.status(404).json({ message: 'Driver not found' });

    const { getDriverById } = require('../integrations/userServiceClient');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    const lookupId = String(d.externalId || driverId);
    const ext = await getDriverById(lookupId, { headers: authHeader });

    const driverInfo = ext ? {
      id: String(driverId),
      name: ext.name,
      phone: ext.phone,
      email: ext.email
    } : { id: String(driverId), name: '', phone: '', email: '' };

    return res.json({
      id: String(d._id),
      driverId: String(d._id),
      available: !!d.available,
      vehicleType: d.vehicleType,
      lastKnownLocation: d.lastKnownLocation || null,
      rating: d.rating || 5.0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      driver: driverInfo
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// Get driver availability with external service populated driver info
module.exports.getAvailability = async function getAvailability(req, res) {
  try {
    const driverId = String(req.params.id || '');
    if (!driverId) return res.status(400).json({ message: 'Invalid driver id' });
    const d = await Driver.findById(driverId).lean();
    if (!d) return res.status(404).json({ message: 'Driver not found' });

    const { getDriverById } = require('../integrations/userServiceClient');
    const authHeader = req.headers && req.headers.authorization ? { Authorization: req.headers.authorization } : undefined;
    const lookupIdAvail = String(d.externalId || driverId);
    const ext = await getDriverById(lookupIdAvail, { headers: authHeader });

    return res.json({
      id: String(d._id),
      driverId: String(d._id),
      available: !!d.available,
      vehicleType: d.vehicleType,
      driver: ext ? { id: String(driverId), name: ext.name, phone: ext.phone, email: ext.email } : { id: String(driverId), name: '', phone: '', email: '' },
      updatedAt: d.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

