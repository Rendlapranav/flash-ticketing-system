let ioServer = null;

function setSocketServer(io) {
  ioServer = io;
}

function eventRoom(eventId) {
  return `event:${eventId}`;
}

function broadcastSeatUpdate(eventId, seatNumber, status) {
  if (!ioServer) {
    return;
  }

  ioServer.to(eventRoom(eventId)).emit('seat:status-changed', {
    seatNumber,
    status,
  });
}

function broadcastAdminUpdate() {
  if (!ioServer) {
    return;
  }

  ioServer.to('admin-room').emit('admin:booking-changed');
}

module.exports = {
  broadcastAdminUpdate,
  broadcastSeatUpdate,
  eventRoom,
  setSocketServer,
};
