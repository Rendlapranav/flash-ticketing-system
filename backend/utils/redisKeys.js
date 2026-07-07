const LOCK_TTL_SECONDS = 60;
const LOCK_KEY_PREFIX = 'lock:event:';
const CART_KEY_PREFIX = 'cart:event:';

function seatLockKey(eventId, seatNumber) {
  return `${LOCK_KEY_PREFIX}${eventId}:seat:${seatNumber}`;
}

function userCartKey(eventId, userId) {
  return `${CART_KEY_PREFIX}${eventId}:user:${userId}`;
}

module.exports = {
  CART_KEY_PREFIX,
  LOCK_KEY_PREFIX,
  LOCK_TTL_SECONDS,
  seatLockKey,
  userCartKey,
};
