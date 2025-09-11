const { TripHistory, Booking } = require('../models/bookingModels');
const { getPassengerById, getDriverById } = require('../integrations/userService');

function toBasicUser(u) {
  if (!u) return undefined;
  return {
    id: String(u._id || u.id),
    name: u.name,
    phone: u.phone,
    email: u.email
  };
}

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;

    const rows = await TripHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await TripHistory.countDocuments(query);

    const passengerIds = [...new Set(rows.map(r => r.passengerId).filter(Boolean))];
    const driverIds = [...new Set(rows.map(r => r.driverId).filter(Boolean))];
    const bookingIds = rows.map(r => r.bookingId).filter(Boolean);

    const [bookings] = await Promise.all([
      Booking.find({ _id: { $in: bookingIds } }).select({ _id: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean()
    ]);
    // Fetch from external user service in parallel
    const passengerLookups = await Promise.all(passengerIds.map(async (id) => {
      const info = await getPassengerById(id).catch(() => null);
      return info ? [String(id), { id: String(id), name: info.name, phone: info.phone }] : null;
    }));
    const driverLookups = await Promise.all(driverIds.map(async (id) => {
      const info = await getDriverById(id).catch(() => null);
      return info ? [String(id), { id: String(id), name: info.name, phone: info.phone }] : null;
    }));
    const pidMap = Object.fromEntries(passengerLookups.filter(Boolean));
    const didMap = Object.fromEntries(driverLookups.filter(Boolean));
    const bidMap = Object.fromEntries(bookings.map(b => [String(b._id), b]));

    const data = rows.map(r => {
      const b = bidMap[String(r.bookingId)];
      return {
        id: String(r._id),
        bookingId: String(r.bookingId),
        driverId: r.driverId && String(r.driverId),
        passengerId: r.passengerId && String(r.passengerId),
        status: r.status,
        dateOfTravel: r.dateOfTravel,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        passenger: toBasicUser(pidMap[String(r.passengerId)]) || (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
        driver: toBasicUser(didMap[String(r.driverId)]),
        booking: b ? {
          id: String(b._id),
          vehicleType: b.vehicleType,
          pickup: b.pickup,
          dropoff: b.dropoff
        } : undefined
      };
    });

    return res.json({
      trips: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to list trips: ${e.message}` });
  }
};

exports.get = async (req, res) => {
  try {
    const r = await TripHistory.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ message: 'Trip not found' });

    const [p, d, b] = await Promise.all([
      r.passengerId ? getPassengerById(r.passengerId).catch(() => null) : null,
      r.driverId ? getDriverById(r.driverId).catch(() => null) : null,
      r.bookingId ? Booking.findById(r.bookingId).select({ _id: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean() : null
    ]);

    const data = {
      id: String(r._id),
      bookingId: String(r.bookingId),
      driverId: r.driverId && String(r.driverId),
      passengerId: r.passengerId && String(r.passengerId),
      status: r.status,
      dateOfTravel: r.dateOfTravel,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      passenger: p ? { id: String(r.passengerId), name: p.name, phone: p.phone } : (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
      driver: d ? { id: String(r.driverId), name: d.name, phone: d.phone } : undefined,
      booking: b ? {
        id: String(b._id),
        vehicleType: b.vehicleType,
        pickup: b.pickup,
        dropoff: b.dropoff
      } : undefined
    };

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: `Failed to get trip: ${e.message}` });
  }
};

exports.create = async (req, res) => {
  try {
    const { 
      bookingId, 
      driverId, 
      passengerId, 
      status = 'completed', 
      fare, 
      distance, 
      duration, 
      pickupLocation, 
      dropoffLocation, 
      startTime, 
      endTime, 
      notes 
    } = req.body;

    if (!bookingId || !driverId || !passengerId) {
      return res.status(400).json({ message: 'bookingId, driverId, and passengerId are required' });
    }

    const trip = new TripHistory({
      bookingId,
      driverId,
      passengerId,
      status,
      fare,
      distance,
      duration,
      pickupLocation,
      dropoffLocation,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date(),
      dateOfTravel: new Date(),
      notes
    });

    await trip.save();

    return res.status(201).json({
      id: String(trip._id),
      bookingId: String(trip.bookingId),
      driverId: String(trip.driverId),
      passengerId: String(trip.passengerId),
      status: trip.status,
      fare: trip.fare,
      distance: trip.distance,
      duration: trip.duration,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      startTime: trip.startTime,
      endTime: trip.endTime,
      dateOfTravel: trip.dateOfTravel,
      notes: trip.notes,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to create trip: ${e.message}` });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      fare, 
      distance, 
      duration, 
      pickupLocation, 
      dropoffLocation, 
      startTime, 
      endTime, 
      notes 
    } = req.body;

    const trip = await TripHistory.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Update fields if provided
    if (status) trip.status = status;
    if (fare !== undefined) trip.fare = fare;
    if (distance !== undefined) trip.distance = distance;
    if (duration !== undefined) trip.duration = duration;
    if (pickupLocation) trip.pickupLocation = pickupLocation;
    if (dropoffLocation) trip.dropoffLocation = dropoffLocation;
    if (startTime) trip.startTime = new Date(startTime);
    if (endTime) trip.endTime = new Date(endTime);
    if (notes !== undefined) trip.notes = notes;

    trip.updatedAt = new Date();
    await trip.save();

    return res.json({
      id: String(trip._id),
      bookingId: String(trip.bookingId),
      driverId: String(trip.driverId),
      passengerId: String(trip.passengerId),
      status: trip.status,
      fare: trip.fare,
      distance: trip.distance,
      duration: trip.duration,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      startTime: trip.startTime,
      endTime: trip.endTime,
      dateOfTravel: trip.dateOfTravel,
      notes: trip.notes,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to update trip: ${e.message}` });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await TripHistory.findById(id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    await TripHistory.findByIdAndDelete(id);

    return res.json({ message: 'Trip deleted successfully' });
  } catch (e) {
    return res.status(500).json({ message: `Failed to delete trip: ${e.message}` });
  }
};


// Minimal CRUD handlers for trips (primarily for admin/staff tools)
exports.create = async (req, res) => {
  try {
    const { bookingId, driverId, passengerId, status, dateOfTravel } = req.body || {};
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });
    const created = await TripHistory.create({
      bookingId,
      driverId: driverId && String(driverId),
      passengerId: passengerId && String(passengerId),
      status: status || 'requested',
      dateOfTravel: dateOfTravel ? new Date(dateOfTravel) : new Date()
    });
    return res.status(201).json({
      id: String(created._id),
      bookingId: String(created.bookingId),
      driverId: created.driverId && String(created.driverId),
      passengerId: created.passengerId && String(created.passengerId),
      status: created.status,
      dateOfTravel: created.dateOfTravel,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to create trip: ${e.message}` });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await TripHistory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Trip not found' });
    return res.json({
      id: String(updated._id),
      bookingId: String(updated.bookingId),
      driverId: updated.driverId && String(updated.driverId),
      passengerId: updated.passengerId && String(updated.passengerId),
      status: updated.status,
      dateOfTravel: updated.dateOfTravel,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to update trip: ${e.message}` });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await TripHistory.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: 'Trip not found' });
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ message: `Failed to delete trip: ${e.message}` });
  }
};

