let ioRef;

function attachSocketHandlers(io) {
  ioRef = io;
  io.on('connection', (socket) => {
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

