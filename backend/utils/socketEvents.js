let ioServer = null;

function setSocketServer(io) {
  ioServer = io;
}

function broadcastSeatUpdate(seatNumber, status) {
  if (!ioServer) {
    return;
  }

  ioServer.emit('seat:status-changed', {
    seatNumber,
    status,
  });
}

module.exports = {
  broadcastSeatUpdate,
  setSocketServer,
};
