// bookingController.js (Booking Service)
const dayjs = require('dayjs');
const geolib = require('geolib');
const { Booking, BookingAssignment, TripHistory } = require('../models/bookingModels');
const { Pricing } = require('../models/pricing');
const { broadcast } = require('../sockets');
const positionUpdateService = require('../services/positionUpdate');
const {
  getPassengerDetails,
  getDriverDetails,
  getDriversByIds,
} = require('../integrations/userServiceClient');

// --- Fare Estimation ---
async function estimateFare({ vehicleType = 'mini', pickup, dropoff }) {
  const distanceKm =
    geolib.getDistance(
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: dropoff.latitude, longitude: dropoff.longitude }
    ) / 1000;

  const p =
    (await Pricing.findOne({ vehicleType, isActive: true }).sort({ updatedAt: -1 })) || {
      baseFare: 2,
      perKm: 1,
      perMinute: 0.2,
      waitingPerMinute: 0.1,
      surgeMultiplier: 1,
    };

  const fareBreakdown = {
    base: p.baseFare,
    distanceCost: distanceKm * p.perKm,
    timeCost: 0,
    waitingCost: 0,
    surgeMultiplier: p.surgeMultiplier,
  };

  const fareEstimated =
    (fareBreakdown.base +
      fareBreakdown.distanceCost +
      fareBreakdown.timeCost +
      fareBreakdown.waitingCost) *
    fareBreakdown.surgeMultiplier;

  return { distanceKm, fareEstimated, fareBreakdown };
}

// --- Create Booking ---
exports.create = async (req, res) => {
  try {
    const passengerId = String(req.user?.id);
    if (!passengerId)
      return res.status(400).json({ message: 'Invalid passenger ID: user not authenticated' });

    const { vehicleType, pickup, dropoff } = req.body;
    if (!pickup || !dropoff)
      return res.status(400).json({ message: 'Pickup and dropoff locations are required' });

    const est = await estimateFare({ vehicleType, pickup, dropoff });

    const booking = await Booking.create({
      passengerId,
      vehicleType,
      pickup,
      dropoff,
      distanceKm: est.distanceKm,
      fareEstimated: est.fareEstimated,
      fareBreakdown: est.fareBreakdown,
      status: 'requested',
    });

    const token = req.headers.authorization;
    const passengerResult = await getPassengerDetails(passengerId, token);

    const responseData = {
      id: String(booking._id),
      booking,
      passenger: passengerResult.success
        ? passengerResult.user
        : { id: passengerId, error: passengerResult.message },
    };

    return res.status(201).json(responseData);
  } catch (e) {
    return res.status(500).json({ message: `Failed to create booking: ${e.message}` });
  }
};

// --- List Bookings ---
exports.list = async (req, res) => {
  try {
    const userType = req.user?.type;
    const userId = req.user?.id;
    let query = {};

    if (userType === 'passenger') {
      query.passengerId = String(userId);
    }

    const rows = await Booking.find(query).sort({ createdAt: -1 }).lean();

    const passengerIds = [...new Set(rows.map((r) => r.passengerId))];
    const driverIds = [...new Set(rows.map((r) => r.driverId).filter(Boolean))];

    const token = req.headers.authorization;

    // Fetch passengers from User Service
    const passengerPromises = passengerIds.map((id) => getPassengerDetails(id, token));
    const passengerResults = await Promise.all(passengerPromises);
    const passengerMap = {};
    passengerResults.forEach((res, i) => {
      passengerMap[passengerIds[i]] = res.success
        ? res.user
        : { id: passengerIds[i], error: res.message };
    });

    // Fetch drivers from User Service
    let driverMap = {};
    if (driverIds.length) {
      try {
        const infos = await getDriversByIds(driverIds, token);
        driverMap = Object.fromEntries(
          infos.map((d) => [String(d.id), { id: d.id, name: d.name, phone: d.phone }])
        );
      } catch (_) {}
    }

    const normalized = rows.map((b) => ({
      id: String(b._id),
      passengerId: b.passengerId,
      passenger: passengerMap[b.passengerId],
      driverId: b.driverId,
      driver: driverMap[b.driverId],
      vehicleType: b.vehicleType,
      pickup: b.pickup,
      dropoff: b.dropoff,
      distanceKm: b.distanceKm,
      fareEstimated: b.fareEstimated,
      fareFinal: b.fareFinal,
      fareBreakdown: b.fareBreakdown,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return res.json(normalized);
  } catch (e) {
    return res.status(500).json({ message: `Failed to retrieve bookings: ${e.message}` });
  }
};

// --- Get Booking by ID ---
exports.get = async (req, res) => {
  try {
    const userType = req.user?.type;
    let query = { _id: req.params.id };
    if (userType === 'passenger') query.passengerId = String(req.user?.id);

    const item = await Booking.findOne(query).lean();
    if (!item)
      return res.status(404).json({ message: 'Booking not found or you do not have permission to access it' });

    const token = req.headers.authorization;
    const passengerResult = await getPassengerDetails(item.passengerId, token);
    const driverResult = item.driverId ? await getDriverDetails(item.driverId, token) : null;

    return res.json({
      id: String(item._id),
      ...item,
      passenger: passengerResult.success
        ? passengerResult.user
        : { id: item.passengerId, error: passengerResult.message },
      driver: driverResult
        ? driverResult.success
          ? driverResult.user
          : { id: item.driverId, error: driverResult.message }
        : null,
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to retrieve booking: ${e.message}` });
  }
};

// --- Update Booking ---
exports.update = async (req, res) => {
  try {
    const updated = await Booking.findOneAndUpdate(
      { _id: req.params.id, passengerId: String(req.user?.id) },
      req.body,
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: 'Booking not found or you do not have permission to update it' });

    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ message: `Failed to update booking: ${e.message}` });
  }
};

// --- Remove Booking ---
exports.remove = async (req, res) => {
  try {
    const r = await Booking.findOneAndDelete({ _id: req.params.id, passengerId: String(req.user?.id) });
    if (!r)
      return res.status(404).json({ message: 'Booking not found or you do not have permission to delete it' });

    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ message: `Failed to delete booking: ${e.message}` });
  }
};

// --- Booking Lifecycle ---
exports.lifecycle = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!['requested', 'accepted', 'ongoing', 'completed', 'canceled'].includes(status))
      return res.status(400).json({ message: `Invalid status '${status}'.` });

    if (booking.status === 'completed')
      return res.status(400).json({ message: 'Cannot change status of completed bookings' });

    if (status === 'accepted' && req.user?.type === 'driver') booking.driverId = String(req.user.id);

    booking.status = status;
    if (status === 'completed') booking.fareFinal = booking.fareEstimated;

    await booking.save();
    await TripHistory.create({
      bookingId: booking._id,
      driverId: booking.driverId,
      passengerId: booking.passengerId,
      status: booking.status,
    });

    broadcast('booking:update', { id: booking._id, status });
    return res.json(booking);
  } catch (e) {
    return res.status(500).json({ message: `Failed to update booking lifecycle: ${e.message}` });
  }
};

// --- Assign Driver ---
exports.assign = async (req, res) => {
  try {
    const { driverId, dispatcherId } = req.body;
    const bookingId = req.params.id;
    if (!driverId || !dispatcherId)
      return res.status(400).json({ message: 'Driver and dispatcher IDs required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'requested')
      return res.status(400).json({ message: `Cannot assign booking with status '${booking.status}'` });

    const assignment = await BookingAssignment.create({
      bookingId,
      driverId: String(driverId),
      dispatcherId: String(dispatcherId),
      passengerId: booking.passengerId,
    });

    booking.driverId = String(driverId);
    booking.status = 'accepted';
    await booking.save();

    broadcast('booking:assigned', { bookingId, driverId });
    return res.json({ booking, assignment });
  } catch (e) {
    return res.status(500).json({ message: `Failed to assign booking: ${e.message}` });
  }
};

// --- Fare Estimation Endpoint ---
exports.estimate = async (req, res) => {
  try {
    const { vehicleType, pickup, dropoff } = req.body;
    if (!pickup || !dropoff)
      return res.status(400).json({ message: 'Pickup and dropoff locations are required for fare estimation' });

    const est = await estimateFare({ vehicleType, pickup, dropoff });
    return res.json(est);
  } catch (e) {
    return res.status(500).json({ message: `Failed to estimate fare: ${e.message}` });
  }
};

// --- Rating Endpoints ---
exports.ratePassenger = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.id;
    const driverId = req.user.id;

    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.driverId !== driverId) return res.status(403).json({ message: 'Only the assigned driver can rate the passenger' });
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Can only rate after completion' });

    booking.passengerRating = rating;
    if (comment) booking.passengerComment = comment;
    await booking.save();

    return res.json({ message: 'Passenger rated successfully', booking });
  } catch (e) {
    return res.status(500).json({ message: `Failed to rate passenger: ${e.message}` });
  }
};

exports.rateDriver = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.id;
    const passengerId = req.user.id;

    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.passengerId) !== String(passengerId)) return res.status(403).json({ message: 'Only the passenger can rate the driver' });
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Can only rate after completion' });

    booking.driverRating = rating;
    if (comment) booking.driverComment = comment;
    await booking.save();

    return res.json({ message: 'Driver rated successfully' });
  } catch (e) {
    return res.status(500).json({ message: `Failed to rate driver: ${e.message}` });
  }
};
