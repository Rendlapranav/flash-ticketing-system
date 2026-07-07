import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Singleton socket — initialized outside React lifecycle to prevent
// duplicate connections on re-renders.
const socket = io(BACKEND_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});

export function joinEventRoom(eventId) {
  if (eventId) socket.emit('join-event', eventId);
}

export function leaveEventRoom(eventId) {
  if (eventId) socket.emit('leave-event', eventId);
}

export function joinAdminRoom(token) {
  if (token) socket.emit('join-admin', token);
}

export default socket;
