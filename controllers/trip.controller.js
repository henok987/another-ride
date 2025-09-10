const { TripHistory, Booking } = require('../models/bookingModels');
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

    const [passengers, drivers, bookings] = await Promise.all([
      Passenger.find({ _id: { $in: passengerIds } }).select({ _id: 1, name: 1, phone: 1, email: 1 }).lean(),
      Driver.find({ _id: { $in: driverIds } }).select({ _id: 1, name: 1, phone: 1, email: 1, vehicleType: 1 }).lean(),
      Booking.find({ _id: { $in: bookingIds } }).select({ _id: 1, pickup: 1, dropoff: 1, vehicleType: 1, passengerName: 1, passengerPhone: 1 }).lean()
    ]);

    const pidMap = Object.fromEntries(passengers.map(p => [String(p._id), p]));
    const didMap = Object.fromEntries(drivers.map(d => [String(d._id), d]));
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
      r.passengerId ? Passenger.findById(r.passengerId).select({ _id: 1, name: 1, phone: 1, email: 1 }).lean() : null,
      r.driverId ? Driver.findById(r.driverId).select({ _id: 1, name: 1, phone: 1, email: 1, vehicleType: 1 }).lean() : null,
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
      passenger: toBasicUser(p) || (b ? { id: String(r.passengerId), name: b.passengerName, phone: b.passengerPhone } : undefined),
      driver: toBasicUser(d),
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


