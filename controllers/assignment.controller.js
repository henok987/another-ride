const { BookingAssignment, Booking } = require('../models/bookingModels');
const { getPassengerById, getDriverById } = require('../services/userDirectory');

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

    // Build query. If status is provided, join via Booking status
    let query = {};
    if (status) {
      // Find booking ids that match the status
      const bookings = await Booking.find({ status }).select({ _id: 1 }).lean();
      const bookingIds = bookings.map(b => b._id);
      query.bookingId = { $in: bookingIds };
    }

    const rows = await BookingAssignment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await BookingAssignment.countDocuments(query);

    // Collect unique ids for enrichment
    const passengerIds = [...new Set(rows.map(r => r.passengerId).filter(Boolean))];
    const driverIds = [...new Set(rows.map(r => r.driverId).filter(Boolean))];
    const bookingIds = rows.map(r => r.bookingId).filter(Boolean);

    const [bookings] = await Promise.all([
      Booking.find({ _id: { $in: bookingIds } }).select({ _id: 1, status: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean()
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
        dispatcherId: r.dispatcherId && String(r.dispatcherId),
        driverId: r.driverId && String(r.driverId),
        passengerId: r.passengerId && String(r.passengerId),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        passenger: toBasicUser(pidMap[String(r.passengerId)]) || (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
        driver: toBasicUser(didMap[String(r.driverId)]),
        booking: b ? {
          id: String(b._id),
          status: b.status,
          vehicleType: b.vehicleType,
          pickup: b.pickup,
          dropoff: b.dropoff
        } : undefined
      };
    });

    return res.json({
      assignments: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to list assignments: ${e.message}` });
  }
};

exports.get = async (req, res) => {
  try {
    const r = await BookingAssignment.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ message: 'Assignment not found' });

    const [p, d, b] = await Promise.all([
      r.passengerId ? getPassengerById(r.passengerId).catch(() => null) : null,
      r.driverId ? getDriverById(r.driverId).catch(() => null) : null,
      r.bookingId ? Booking.findById(r.bookingId).select({ _id: 1, status: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean() : null
    ]);

    const data = {
      id: String(r._id),
      bookingId: String(r.bookingId),
      dispatcherId: r.dispatcherId && String(r.dispatcherId),
      driverId: r.driverId && String(r.driverId),
      passengerId: r.passengerId && String(r.passengerId),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      passenger: p ? { id: String(r.passengerId), name: p.name, phone: p.phone } : (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
      driver: d ? { id: String(r.driverId), name: d.name, phone: d.phone } : undefined,
      booking: b ? {
        id: String(b._id),
        status: b.status,
        vehicleType: b.vehicleType,
        pickup: b.pickup,
        dropoff: b.dropoff
      } : undefined
    };

    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: `Failed to get assignment: ${e.message}` });
  }
};

exports.create = async (req, res) => {
  try {
    const { bookingId, driverId, dispatcherId, passengerId } = req.body || {};
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });
    if (!driverId) return res.status(400).json({ message: 'driverId is required' });

    let passengerIdResolved = passengerId;
    if (!passengerIdResolved) {
      const b = await Booking.findById(bookingId).select({ passengerId: 1 }).lean();
      if (!b) return res.status(404).json({ message: 'Booking not found' });
      passengerIdResolved = String(b.passengerId || '');
    }

    const created = await BookingAssignment.create({
      bookingId,
      driverId: String(driverId),
      dispatcherId: dispatcherId ? String(dispatcherId) : undefined,
      passengerId: String(passengerIdResolved)
    });
    return res.status(201).json({
      id: String(created._id),
      bookingId: String(created.bookingId),
      driverId: String(created.driverId),
      dispatcherId: created.dispatcherId && String(created.dispatcherId),
      passengerId: String(created.passengerId),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to create assignment: ${e.message}` });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await BookingAssignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Assignment not found' });
    return res.json({
      id: String(updated._id),
      bookingId: String(updated.bookingId),
      driverId: updated.driverId && String(updated.driverId),
      dispatcherId: updated.dispatcherId && String(updated.dispatcherId),
      passengerId: updated.passengerId && String(updated.passengerId),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to update assignment: ${e.message}` });
  }
};

exports.remove = async (req, res) => {
  try {
    const r = await BookingAssignment.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: 'Assignment not found' });
    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ message: `Failed to delete assignment: ${e.message}` });
  }
};

