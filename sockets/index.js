let ioRef;
const drivers = {}; // { driverId: { socketId, latitude, longitude } }

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function attachSocketHandlers(io) {
  ioRef = io;
  io.on('connection', (socket) => {
    // Register driver and update location
    socket.on('register_driver', (payload = {}) => {
      const driverId = String(payload.driverId || '');
      if (!driverId) return;
      drivers[driverId] = {
        socketId: socket.id,
        latitude: Number(payload.lat),
        longitude: Number(payload.lng)
      };
    });
    socket.on('driver_location', (payload = {}) => {
      const driverId = String(payload.driverId || '');
      if (!driverId || !drivers[driverId]) return;
      drivers[driverId].latitude = Number(payload.lat);
      drivers[driverId].longitude = Number(payload.lng);
      drivers[driverId].socketId = socket.id;
    });

    // Passenger creates a booking request
    socket.on('booking_request', async (payload) => {
      try {
        const { Booking } = require('../models/bookingModels');
        const { authenticateSocket } = require('./socketAuth');

        const user = await authenticateSocket(socket);
        if (!user || user.type !== 'passenger') {
          return socket.emit('booking_error', { message: 'Unauthorized: passenger token required' });
        }

        const pickup = payload?.pickup || payload?.from || {};
        const dropoff = payload?.dropoff || payload?.to || {};
        if (pickup.latitude == null || pickup.longitude == null || dropoff.latitude == null || dropoff.longitude == null) {
          return socket.emit('booking_error', { message: 'pickup and dropoff with valid coordinates are required' });
        }

        // Prevent multiple requested bookings per passenger
        const existingRequested = await Booking.findOne({ passengerId: String(user.id), status: 'requested' }).lean();
        if (existingRequested) {
          return socket.emit('booking_error', { message: 'You already have a requested booking. Cancel it before creating a new one.' });
        }

        const booking = await Booking.create({
          passengerId: String(user.id),
          passengerName: user.name,
          passengerPhone: user.phone,
          pickup: { latitude: pickup.latitude, longitude: pickup.longitude },
          dropoff: { latitude: dropoff.latitude, longitude: dropoff.longitude },
          status: 'requested'
        });

        const bookingPayload = JSON.stringify({
          id: String(booking._id),
          passengerId: booking.passengerId,
          passenger: { id: String(user.id), name: user.name, phone: user.phone },
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          status: booking.status,
          createdAt: booking.createdAt
        });

        // Find nearest driver within 3km and emit only to that driver
        let nearest = { driverId: null, distance: Number.POSITIVE_INFINITY, socketId: null };
        Object.entries(drivers).forEach(([did, d]) => {
          if (d && d.latitude != null && d.longitude != null) {
            const dist = haversine(d.latitude, d.longitude, booking.pickup.latitude, booking.pickup.longitude);
            if (dist < nearest.distance) {
              nearest = { driverId: did, distance: dist, socketId: d.socketId };
            }
          }
        });
        if (nearest.socketId && nearest.distance <= 3) {
          io.to(nearest.socketId).emit('new_booking', bookingPayload);
        } else {
          // fallback: broadcast (no nearby driver)
          io.emit('booking:new', bookingPayload);
        }
        socket.emit('booking_created', bookingPayload);
      } catch (e) {
        socket.emit('booking_error', { message: e.message });
      }
    });

    // Driver accepts booking via socket
    socket.on('accept_booking', async (payload = {}) => {
      try {
        const { Booking } = require('../models/bookingModels');
        const { authenticateSocket } = require('./socketAuth');
        const user = await authenticateSocket(socket);
        if (!user || user.type !== 'driver') return;
        const bookingId = String(payload.booking_id || payload.bookingId || '');
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== 'requested') return;
        booking.driverId = String(user.id);
        booking.status = 'accepted';
        booking.acceptedAt = new Date();
        await booking.save();
        const msg = JSON.stringify({ id: String(booking._id), status: booking.status, driverId: booking.driverId, passengerId: booking.passengerId });
        io.emit('booking:update', msg);
      } catch (_) {}
    });

    socket.on('reject_booking', async (payload = {}) => {
      // Placeholder for custom logic; currently no state change on reject
    });

    socket.on('start_booking', async (payload = {}) => {
      try {
        const { Booking } = require('../models/bookingModels');
        const { authenticateSocket } = require('./socketAuth');
        const user = await authenticateSocket(socket);
        if (!user || user.type !== 'driver') return;
        const bookingId = String(payload.booking_id || payload.bookingId || '');
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== 'accepted' || String(booking.driverId) !== String(user.id)) return;
        booking.status = 'ongoing';
        booking.startedAt = new Date();
        await booking.save();
        const msg = JSON.stringify({ id: String(booking._id), status: booking.status, driverId: booking.driverId, passengerId: booking.passengerId });
        io.emit('booking:update', msg);
      } catch (_) {}
    });

    socket.on('driver:position', (payload) => {
      io.emit('driver:position', payload);
    });
    socket.on('pricing:update', (payload) => {
      io.emit('pricing:update', payload);
    });

    socket.on('disconnect', () => {
      Object.keys(drivers).forEach((id) => {
        if (drivers[id] && drivers[id].socketId === socket.id) {
          delete drivers[id];
        }
      });
    });
  });
}

function broadcast(event, data) {
  if (ioRef) ioRef.emit(event, data);
}

module.exports = { attachSocketHandlers, broadcast };

module.exports = { attachSocketHandlers, broadcast };

