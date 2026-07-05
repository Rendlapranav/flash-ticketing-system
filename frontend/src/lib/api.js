const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export async function fetchSeats() {
  const res = await fetch(`${BASE_URL}/api/seats`);
  if (!res.ok) throw new Error('Failed to fetch seats');
  return res.json();
}

export async function lockSeat(seatNumber, userId) {
  const res = await fetch(`${BASE_URL}/api/seats/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatNumber, userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to lock seat');
  return data;
}

export async function bookSeat(seatNumber, userId) {
  const res = await fetch(`${BASE_URL}/api/seats/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatNumber, userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to book seat');
  return data;
}

export async function unlockSeat(seatNumber, userId) {
  const res = await fetch(`${BASE_URL}/api/seats/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatNumber, userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to unlock seat');
  return data;
}
