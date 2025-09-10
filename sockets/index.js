let ioRef;

function attachSocketHandlers(io) {
  ioRef = io;
  io.on('connection', (socket) => {
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

        const booking = await Booking.create({
          passengerId: String(user.id),
          passengerName: user.name,
          passengerPhone: user.phone,
          pickup: { latitude: pickup.latitude, longitude: pickup.longitude },
          dropoff: { latitude: dropoff.latitude, longitude: dropoff.longitude },
          status: 'requested'
        });

        const bookingPayload = {
          id: String(booking._id),
          passengerId: booking.passengerId,
          passenger: { id: String(user.id), name: user.name, phone: user.phone, email: user.email },
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          status: booking.status,
          createdAt: booking.createdAt
        };

        // Broadcast for drivers to listen
        io.emit('booking:new', bookingPayload);
        socket.emit('booking_created', bookingPayload);
      } catch (e) {
        socket.emit('booking_error', { message: e.message });
      }
    });

    socket.on('driver:position', (payload) => {
      io.emit('driver:position', payload);
    });
    socket.on('pricing:update', (payload) => {
      io.emit('pricing:update', payload);
    });
  });
}

function broadcast(event, data) {
  if (ioRef) ioRef.emit(event, data);
}

module.exports = { attachSocketHandlers, broadcast };

module.exports = { attachSocketHandlers, broadcast };

