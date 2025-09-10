const { BookingAssignment, Booking } = require('../models/bookingModels');
const { Passenger, Driver } = require('../models/userModels');

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

    const [passengers, drivers, bookings] = await Promise.all([
      Passenger.find({ _id: { $in: passengerIds } }).select({ _id: 1, name: 1, phone: 1, email: 1 }).lean(),
      Driver.find({ _id: { $in: driverIds } }).select({ _id: 1, name: 1, phone: 1, email: 1, vehicleType: 1 }).lean(),
      Booking.find({ _id: { $in: bookingIds } }).select({ _id: 1, status: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean()
    ]);

    const pidMap = Object.fromEntries(passengers.map(p => [String(p._id), p]));
    const didMap = Object.fromEntries(drivers.map(d => [String(d._id), d]));
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
      r.passengerId ? Passenger.findById(r.passengerId).select({ _id: 1, name: 1, phone: 1, email: 1 }).lean() : null,
      r.driverId ? Driver.findById(r.driverId).select({ _id: 1, name: 1, phone: 1, email: 1, vehicleType: 1 }).lean() : null,
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
      passenger: toBasicUser(p) || (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
      driver: toBasicUser(d),
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
    const { bookingId, driverId, passengerId, priority = 'normal', notes } = req.body;
    const dispatcherId = req.user?.id;

    if (!bookingId || !driverId || !passengerId) {
      return res.status(400).json({ message: 'bookingId, driverId, and passengerId are required' });
    }

    // Check if assignment already exists
    const existingAssignment = await BookingAssignment.findOne({ bookingId });
    if (existingAssignment) {
      return res.status(409).json({ message: 'Assignment already exists for this booking' });
    }

    const assignment = new BookingAssignment({
      bookingId,
      driverId,
      passengerId,
      dispatcherId,
      priority,
      notes,
      status: 'active'
    });

    await assignment.save();

    return res.status(201).json({
      id: String(assignment._id),
      bookingId: String(assignment.bookingId),
      driverId: String(assignment.driverId),
      passengerId: String(assignment.passengerId),
      dispatcherId: String(assignment.dispatcherId),
      priority: assignment.priority,
      notes: assignment.notes,
      status: assignment.status,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to create assignment: ${e.message}` });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, notes } = req.body;

    const assignment = await BookingAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Update fields if provided
    if (status) assignment.status = status;
    if (priority) assignment.priority = priority;
    if (notes !== undefined) assignment.notes = notes;

    assignment.updatedAt = new Date();
    await assignment.save();

    return res.json({
      id: String(assignment._id),
      bookingId: String(assignment.bookingId),
      driverId: String(assignment.driverId),
      passengerId: String(assignment.passengerId),
      dispatcherId: String(assignment.dispatcherId),
      priority: assignment.priority,
      notes: assignment.notes,
      status: assignment.status,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    });
  } catch (e) {
    return res.status(500).json({ message: `Failed to update assignment: ${e.message}` });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await BookingAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await BookingAssignment.findByIdAndDelete(id);

    return res.json({ message: 'Assignment deleted successfully' });
  } catch (e) {
    return res.status(500).json({ message: `Failed to delete assignment: ${e.message}` });
  }
};


