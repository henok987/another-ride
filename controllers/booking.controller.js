const dayjs = require('dayjs');
const geolib = require('geolib');
const { Booking, BookingAssignment, TripHistory, Live, BookingStatus } = require('../models/bookingModels');
const { Pricing } = require('../models/pricing');
const { broadcast } = require('../sockets');
const positionUpdateService = require('../services/positionUpdate');

async function estimateFare({ vehicleType = 'mini', pickup, dropoff }) {
  const distanceKm = geolib.getDistance(
    { latitude: pickup.latitude, longitude: pickup.longitude },
    { latitude: dropoff.latitude, longitude: dropoff.longitude }
  ) / 1000;
  const p = await Pricing.findOne({ vehicleType, isActive: true }).sort({ updatedAt: -1 }) || { baseFare: 2, perKm: 1, perMinute: 0.2, waitingPerMinute: 0.1, surgeMultiplier: 1 };
  const fareBreakdown = {
    base: p.baseFare,
    distanceCost: distanceKm * p.perKm,
    timeCost: 0, // Removed time-based calculation
    waitingCost: 0, // Removed waiting time calculation
    surgeMultiplier: p.surgeMultiplier,
  };
  const fareEstimated = (fareBreakdown.base + fareBreakdown.distanceCost + fareBreakdown.timeCost + fareBreakdown.waitingCost) * fareBreakdown.surgeMultiplier;
  return { distanceKm, fareEstimated, fareBreakdown };
}

function toBasicUser(userLike) {
  if (!userLike) return undefined;
  return {
    id: userLike.id && String(userLike.id) || userLike._id && String(userLike._id) || undefined,
    name: userLike.name,
    phone: userLike.phone
  };
}

function normalizeBooking(b) {
  if (!b) return null;
  const id = String(b._id || b.id || '');
  return {
    id,
    passengerId: String(b.passengerId || ''),
    passenger: b.passenger ? toBasicUser(b.passenger) : (b.passengerName || b.passengerPhone ? { id: String(b.passengerId || ''), name: b.passengerName, phone: b.passengerPhone } : undefined),
    driverId: b.driverId && String(b.driverId),
    driver: b.driver ? toBasicUser(b.driver) : undefined,
    vehicleType: b.vehicleType,
    pickup: b.pickup,
    dropoff: b.dropoff,
    status: b.status,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  };
}

exports.create = async (req, res) => {
  try {
    const passengerId = String(req.user?.id);
    if (!passengerId) return res.status(400).json({ message: 'Invalid passenger ID: user not authenticated' });
    const { vehicleType, pickup, dropoff } = req.body;
    if (!pickup || !dropoff) return res.status(400).json({ message: 'Pickup and dropoff locations are required' });
    // Prevent multiple requested bookings per passenger
    const existingRequested = await Booking.findOne({ passengerId, status: 'requested' }).lean();
    if (existingRequested) {
      return res.status(400).json({ message: 'You already have a requested booking. Cancel it before creating a new one.' });
    }
    const est = await estimateFare({ vehicleType, pickup, dropoff });
    // Resolve passenger basic info from external User Service (JWT preferred)
    const { getPassengerById } = require('../integrations/userService');
    // Extract passenger info from JWT token
    const extractFromToken = (user) => {
      if (!user) return {};
      console.log('Extracting from JWT token - full user object:', JSON.stringify(user, null, 2));
      
      // The JWT token now contains passenger data directly
      const result = {
        name: user.name || user.fullName || user.displayName,
        phone: user.phone || user.phoneNumber || user.mobile,
        email: user.email
      };
      
      console.log('Extracted token meta:', result);
      return result;
    };
    const tokenMeta = extractFromToken(req.user);
    // Priority: JWT > External User Service > Stored fallback
    let passengerName = tokenMeta.name || undefined;
    let passengerPhone = tokenMeta.phone || undefined;
    if (!passengerName || !passengerPhone) {
      const info = await getPassengerById(passengerId).catch(() => null);
      if (info) {
        passengerName = passengerName || info.name;
        passengerPhone = passengerPhone || info.phone;
      }
    }
    // Final generic fallback to avoid failure when external is unavailable
    if (!passengerName) passengerName = `Passenger ${passengerId}`;
    if (!passengerPhone) passengerPhone = `+123456789${passengerId}`;

    console.log('Creating booking with passenger data:', {
      passengerId,
      passengerName,
      passengerPhone,
      tokenMeta
    });

    const booking = await Booking.create({ 
      passengerId, 
      passengerName, 
      passengerPhone, 
      vehicleType, pickup, dropoff, 
      distanceKm: est.distanceKm, 
      fareEstimated: est.fareEstimated, 
      fareBreakdown: est.fareBreakdown 
    });
    
    console.log('Created booking with stored passenger data:', {
      passengerId: booking.passengerId,
      passengerName: booking.passengerName,
      passengerPhone: booking.passengerPhone
    });
    const data = normalizeBooking(booking);
    return res.status(201).json([data]);
  } catch (e) { return res.status(500).json({ message: `Failed to create booking: ${e.message}` }); }
}

exports.list = async (req, res) => {
  try { 
    const userType = req.user?.type;
    const userId = req.user?.id;
    let query = {};
    
    // Debug logging
    console.log('Booking list request:', { userType, userId, user: req.user });
    
    // If user is passenger, only show their bookings
    // If user is admin/superadmin, show all bookings
    if (userType === 'passenger') {
      query.passengerId = String(userId);
    }
    // For admin/superadmin, no filter is applied (shows all bookings)
    
    console.log('Query being used:', query);
    const rows = await Booking.find(query).sort({ createdAt: -1 }).lean(); 
    console.log('Found bookings in DB:', rows.length);
    console.log('Sample booking:', rows[0]);
    console.log('Sample booking passenger data:', {
      passengerId: rows[0]?.passengerId,
      passengerName: rows[0]?.passengerName,
      passengerPhone: rows[0]?.passengerPhone
    });
    
    const passengerIds = [...new Set(rows.map(r => r.passengerId))];
    console.log('Unique passenger IDs:', passengerIds);
    const { getPassengerById } = require('../integrations/userService');
    const fetchedPassengers = await Promise.all(
      passengerIds.map(async (id) => {
        try {
          const info = await getPassengerById(id);
          return info ? [String(id), { id: String(id), name: info.name, phone: info.phone }] : null;
        } catch (e) {
          return null;
        }
      })
    );
    const pidToPassenger = Object.fromEntries(fetchedPassengers.filter(Boolean));
    
    // Get passenger info from JWT token if available
    let jwtPassengerInfo = null;
    if (req.user && req.user.id && req.user.type === 'passenger') {
      console.log('Full JWT user object:', JSON.stringify(req.user, null, 2));
      
      // The JWT token now contains passenger data directly
      jwtPassengerInfo = {
        id: String(req.user.id),
        name: req.user.name || req.user.fullName || req.user.displayName,
        phone: req.user.phone || req.user.phoneNumber || req.user.mobile,
        email: req.user.email
      };
      console.log('Extracted JWT passenger info:', jwtPassengerInfo);
    }

    const normalized = rows.map(b => {
      // Priority order: JWT token data > Stored booking data > Database lookup > Fallback
      let passenger = undefined;
      
      // 1. Try JWT passenger info first (most current)
      if (jwtPassengerInfo && String(jwtPassengerInfo.id) === String(b.passengerId)) {
        passenger = jwtPassengerInfo;
        console.log(`Using JWT passenger info for booking ${b._id}:`, passenger);
      }
      // 2. Try stored passenger data in booking (from creation time)
      else if (b.passengerName || b.passengerPhone) {
        passenger = { id: b.passengerId, name: b.passengerName, phone: b.passengerPhone };
        console.log(`Using stored passenger data for booking ${b._id}:`, passenger);
      }
      // 3. Try external user service lookup
      else if (pidToPassenger[b.passengerId]) {
        passenger = pidToPassenger[b.passengerId];
        console.log(`Using database passenger data for booking ${b._id}:`, passenger);
      }
      // 4. Fallback to generic data for testing
      else {
        passenger = { id: String(b.passengerId), name: `Passenger ${b.passengerId}`, phone: `+123456789${b.passengerId}` };
        console.log(`Using generic fallback passenger data for booking ${b._id}:`, passenger);
      }
      
      console.log(`Final passenger for booking ${b._id}:`, passenger);
      
      return {
      id: String(b._id),
      passengerId: b.passengerId,
        passenger: passenger,
      vehicleType: b.vehicleType,
      pickup: b.pickup,
      dropoff: b.dropoff,
      distanceKm: b.distanceKm,
      fareEstimated: b.fareEstimated,
      fareFinal: b.fareFinal,
      fareBreakdown: b.fareBreakdown,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
      };
    });
    console.log('Found bookings:', normalized.length);
    console.log('Sample normalized booking:', normalized[0]);
    return res.json(normalized); 
  } catch (e) { 
    console.error('Error in booking list:', e);
    return res.status(500).json({ message: `Failed to retrieve bookings: ${e.message}` }); 
  }
}

exports.get = async (req, res) => {
  try { 
    const userType = req.user?.type;
    let query = { _id: req.params.id };
    
    // If user is passenger, only show their bookings
    // If user is admin/superadmin, show any booking
    if (userType === 'passenger') {
      query.passengerId = String(req.user?.id);
    }
    
    const item = await Booking.findOne(query).lean(); 
    if (!item) return res.status(404).json({ message: 'Booking not found or you do not have permission to access it' }); 
    // attach basic passenger info consistently from external user service
    const { getPassengerById } = require('../integrations/userService');
    let passenger = undefined;
    
    // Try to get passenger info from JWT token first
    if (req.user && req.user.id && req.user.type === 'passenger' && String(req.user.id) === String(item.passengerId)) {
      // The JWT token now contains passenger data directly
      passenger = {
        id: String(req.user.id),
        name: req.user.name || req.user.fullName || req.user.displayName,
        phone: req.user.phone || req.user.phoneNumber || req.user.mobile,
        email: req.user.email
      };
    }
    
    // Fallback to external user service
    if (!passenger && item.passengerId) {
      const info = await getPassengerById(item.passengerId).catch(() => null);
      if (info) passenger = { id: String(item.passengerId), name: info.name, phone: info.phone };
    }
    
    // Final fallback to stored passenger data
    if (!passenger && (item.passengerName || item.passengerPhone)) {
      passenger = { id: String(item.passengerId), name: item.passengerName, phone: item.passengerPhone };
    }
    
    // Generic fallback for testing
    if (!passenger) {
      passenger = { id: String(item.passengerId), name: `Passenger ${item.passengerId}`, phone: `+123456789${item.passengerId}` };
    }
    return res.json([normalizeBooking({ ...item, passenger })]); 
  } catch (e) { 
    return res.status(500).json({ message: `Failed to retrieve booking: ${e.message}` }); 
  }
}

exports.update = async (req, res) => {
  try {
    const updated = await Booking.findOneAndUpdate({ _id: req.params.id, passengerId: String(req.user?.id) }, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Booking not found or you do not have permission to update it' });
    return res.json(updated);
  } catch (e) { return res.status(500).json({ message: `Failed to update booking: ${e.message}` }); }
}

exports.remove = async (req, res) => {
  try { 
    const r = await Booking.findOneAndDelete({ _id: req.params.id, passengerId: String(req.user?.id) }); 
    if (!r) return res.status(404).json({ message: 'Booking not found or you do not have permission to delete it' }); 
    return res.status(204).send(); 
  } catch (e) { 
    return res.status(500).json({ message: `Failed to delete booking: ${e.message}` }); 
  }
}

exports.lifecycle = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!['requested','accepted','ongoing','completed','canceled'].includes(status)) return res.status(400).json({ message: `Invalid status '${status}'. Allowed values: requested, accepted, ongoing, completed, canceled` });
    
    // Prevent status changes on completed bookings
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Cannot change status of completed bookings' });
    }
    
    // Check if driver is trying to accept booking
    if (status === 'accepted' && req.user?.type === 'driver') {
      const { Driver } = require('../models/userModels');
      const driver = await Driver.findById(req.user.id);
      if (!driver || !driver.available) {
        return res.status(400).json({ message: 'Driver must be available to accept bookings. Driver is currently unavailable.' });
      }
      
      // Check if driver already has an active booking
      const activeBooking = await Booking.findOne({ 
        driverId: req.user.id, 
        status: { $in: ['accepted', 'ongoing'] } 
      });
      if (activeBooking) {
        return res.status(400).json({ message: 'Driver already has an active booking' });
      }

      // Verify driver is nearby to pickup (<= 3km)
      const driverLoc = driver.lastKnownLocation;
      const pickupLoc = booking.pickup;
      if (!driverLoc || driverLoc.latitude == null || driverLoc.longitude == null) {
        return res.status(400).json({ message: 'Driver location unknown. Update location before accepting.' });
      }
      const meters = require('geolib').getDistance(
        { latitude: driverLoc.latitude, longitude: driverLoc.longitude },
        { latitude: pickupLoc.latitude, longitude: pickupLoc.longitude }
      );
      const km = meters / 1000;
      if (km > 3) {
        return res.status(400).json({ message: `Driver too far from pickup (${km.toFixed(2)} km). Must be within 3 km to accept.` });
      }
      
      // Set driver ID and make driver unavailable
      booking.driverId = String(req.user.id);
      await Driver.findByIdAndUpdate(req.user.id, { available: false });
    }
    
    // Check if another driver is trying to change status of accepted booking
    if (req.user?.type === 'driver' && booking.driverId && booking.driverId !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned driver can change this booking status' });
    }
    
    booking.status = status;
    if (status === 'accepted') { booking.acceptedAt = new Date(); }
    if (status === 'ongoing') { 
      booking.startedAt = new Date();
      // Start position tracking for ongoing trips
      if (booking.driverId && booking.passengerId) {
        positionUpdateService.startTracking(booking._id.toString(), booking.driverId, booking.passengerId);
      }
    }
    if (status === 'completed') { 
      booking.completedAt = new Date(); 
      booking.fareFinal = booking.fareEstimated;
      
      // Create earnings records
      if (booking.driverId) {
        const { DriverEarnings, AdminEarnings, Commission } = require('../models/commission');
        
        // Get current commission rate
        const commission = await Commission.findOne({ isActive: true }).sort({ createdAt: -1 });
        const commissionRate = commission ? commission.percentage : 15; // Default 15%
        
        const grossFare = booking.fareFinal || booking.fareEstimated;
        const commissionAmount = (grossFare * commissionRate) / 100;
        const netEarnings = grossFare - commissionAmount;
        
        // Create driver earnings record
        await DriverEarnings.create({
          driverId: booking.driverId,
          bookingId: booking._id,
          tripDate: new Date(),
          grossFare,
          commissionAmount,
          netEarnings,
          commissionPercentage: commissionRate
        });
        
        // Create admin earnings record
        await AdminEarnings.create({
          bookingId: booking._id,
          tripDate: new Date(),
          grossFare,
          commissionEarned: commissionAmount,
          commissionPercentage: commissionRate,
          driverId: booking.driverId,
          passengerId: booking.passengerId
        });
        
        // Make driver available again when trip completes
        const { Driver } = require('../models/userModels');
        await Driver.findByIdAndUpdate(booking.driverId, { available: true });
        
        // Stop position tracking for completed trips
        positionUpdateService.stopTracking(booking._id.toString());
      }
    }
    if (status === 'canceled') {
      // Make driver available again when booking is canceled
      if (booking.driverId) {
        const { Driver } = require('../models/userModels');
        await Driver.findByIdAndUpdate(booking.driverId, { available: true });
      }
      
      // Stop position tracking for canceled trips
      positionUpdateService.stopTracking(booking._id.toString());
    }
    
    await booking.save();
    await TripHistory.create({ bookingId: booking._id, driverId: booking.driverId, passengerId: booking.passengerId, status: booking.status });
    const payload = normalizeBooking(booking);
    broadcast('booking:update', payload);
    return res.json([payload]);
  } catch (e) { return res.status(500).json({ message: `Failed to update booking lifecycle: ${e.message}` }); }
}

exports.assign = async (req, res) => {
  try {
    const { driverId, dispatcherId, passengerId } = req.body;
    const bookingId = req.params.id;
    
    // Validate required fields
    if (!driverId) return res.status(400).json({ message: 'Driver ID is required for assignment' });
    if (!dispatcherId) return res.status(400).json({ message: 'Dispatcher ID is required for assignment' });
    
    const { Types } = require('mongoose');
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Check if booking is already assigned or completed
    if (booking.status !== 'requested') {
      return res.status(400).json({ message: `Cannot assign booking with status '${booking.status}'. Only 'requested' bookings can be assigned.` });
    }
    
    // Check if driver is available
    const { Driver } = require('../models/userModels');
    const driver = await Driver.findById(driverId);
    if (!driver || !driver.available) {
      return res.status(400).json({ message: 'Driver is not available for assignment. Driver must be available to accept bookings.' });
    }
    
    // Check if driver already has an active booking
    const activeBooking = await Booking.findOne({ 
      driverId: String(driverId), 
      status: { $in: ['accepted', 'ongoing'] } 
    });
    if (activeBooking) {
      return res.status(400).json({ message: 'Driver already has an active booking' });
    }
    
    const assignment = await BookingAssignment.create({ 
      bookingId, 
      driverId: String(driverId), 
      dispatcherId: String(dispatcherId), 
      passengerId: String(passengerId || booking.passengerId) 
    });
    
    // Update booking and make driver unavailable
    booking.driverId = String(driverId); 
    booking.status = 'accepted'; 
    booking.acceptedAt = new Date(); 
    await booking.save();
    
    // Make driver unavailable
    await Driver.findByIdAndUpdate(driverId, { available: false });
    
    broadcast('booking:assigned', { bookingId, driverId });
    return res.json({ booking, assignment });
  } catch (e) { return res.status(500).json({ message: `Failed to assign booking: ${e.message}` }); }
}

exports.estimate = async (req, res) => {
  try {
    const { vehicleType, pickup, dropoff } = req.body;
    if (!pickup || !dropoff) return res.status(400).json({ message: 'Pickup and dropoff locations are required for fare estimation' });
    const est = await estimateFare({ vehicleType, pickup, dropoff });
    return res.json(est);
  } catch (e) { return res.status(500).json({ message: `Failed to estimate fare: ${e.message}` }); }
}

// Rate passenger (driver rates passenger after trip completion)
exports.ratePassenger = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.id;
    const driverId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the driver is authorized to rate this passenger
    if (booking.driverId !== driverId) {
      return res.status(403).json({ message: 'Only the assigned driver can rate the passenger' });
    }

    // Check if the trip is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate after trip completion' });
    }

    // Update booking with passenger rating
    booking.passengerRating = rating;
    if (comment) booking.passengerComment = comment;
    await booking.save();

    return res.json([{ id: String(booking._id), status: booking.status, passengerId: booking.passengerId, driverId: booking.driverId, rating }]);
  } catch (e) {
    return res.status(500).json({ message: `Failed to rate passenger: ${e.message}` });
  }
}

// Rate driver (passenger rates driver after trip completion)
exports.rateDriver = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.id;
    const passengerId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if the passenger is authorized to rate this driver
    const equalIds = (a, b) => String(a || '') === String(b || '');
    if (!equalIds(booking.passengerId, passengerId)) {
      return res.status(403).json({ message: 'Only the passenger can rate the driver' });
    }

    // Check if the trip is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate after trip completion' });
    }

    // Update booking with driver rating
    booking.driverRating = rating;
    if (comment) booking.driverComment = comment;
    await booking.save();

    return res.json([{ id: String(booking._id), status: booking.status, passengerId: booking.passengerId, driverId: booking.driverId, rating }]);
  } catch (e) {
    return res.status(500).json({ message: `Failed to rate driver: ${e.message}` });
  }
}

