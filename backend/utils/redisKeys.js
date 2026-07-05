const LOCK_TTL_SECONDS = 60;
const LOCK_KEY_PREFIX = 'lock:seat:';
const CART_KEY_PREFIX = 'cart:user:';

function seatLockKey(seatNumber) {
  return `${LOCK_KEY_PREFIX}${seatNumber}`;
}

function userCartKey(userId) {
  return `${CART_KEY_PREFIX}${userId}`;
}

function parseSeatNumberFromLockKey(key) {
  if (!key.startsWith(LOCK_KEY_PREFIX)) {
    return null;
  }

  return key.slice(LOCK_KEY_PREFIX.length);
}

module.exports = {
  CART_KEY_PREFIX,
  LOCK_KEY_PREFIX,
  LOCK_TTL_SECONDS,
  parseSeatNumberFromLockKey,
  seatLockKey,
  userCartKey,
};
