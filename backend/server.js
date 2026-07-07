require('dotenv').config();
const dns = require('dns');
const http = require('http');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');
const { Server } = require('socket.io');

const Booking = require('./models/Booking');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const {
  LOCK_TTL_SECONDS,
  seatLockKey,
  userCartKey,
} = require('./utils/redisKeys');
const {
  broadcastAdminUpdate,
  broadcastSeatUpdate,
  eventRoom,
  setSocketServer,
} = require('./utils/socketEvents');
const { isAdminToken, requireAdmin, requireAuth } = require('./middleware/auth');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const requiredEnv = ['MONGO_URI', 'REDIS_URL', 'REDIS_TOKEN', 'CLERK_SECRET_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required env variable(s): ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});
setSocketServer(io);

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});


app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-event', (eventId) => {
    if (typeof eventId === 'string' && mongoose.isValidObjectId(eventId)) {
      socket.join(eventRoom(eventId));
    }
  });

  socket.on('leave-event', (eventId) => {
    if (typeof eventId === 'string' && mongoose.isValidObjectId(eventId)) {
      socket.leave(eventRoom(eventId));
    }
  });

  socket.on('join-admin', async (token) => {
    if (typeof token === 'string' && (await isAdminToken(token))) {
      socket.join('admin-room');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

function normalizeSeatNumber(seatNumber) {
  return String(seatNumber || '').trim().toUpperCase();
}

function computePriceRange(tiers) {
  const prices = tiers.map((tier) => tier.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function startExpirationWorker() {
  const POLL_INTERVAL_MS = 10_000;

  setInterval(async () => {
    try {
      const lockedSeats = await Seat.find({ status: 'locked' }).lean();

      for (const seat of lockedSeats) {
        const lockKey = seatLockKey(seat.eventId, seat.seatNumber);
        const lockOwner = await redis.get(lockKey);

        if (!lockOwner) {
          await Seat.findOneAndUpdate(
            { _id: seat._id, status: 'locked' },
            { $set: { status: 'available', lockedBy: null } }
          );

          if (seat.lockedBy) {
            const cartKey = userCartKey(seat.eventId, seat.lockedBy);
            await redis.srem(cartKey, seat.seatNumber);
          }

          broadcastSeatUpdate(seat.eventId, seat.seatNumber, 'available');
          console.log(`Released expired lock for seat ${seat.seatNumber}`);
        }
      }
    } catch (err) {
      console.error('Expiration worker error:', err.message);
    }
  }, POLL_INTERVAL_MS);

  console.log(`Expiration worker polling every ${POLL_INTERVAL_MS / 1000}s`);
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redis ? 'configured' : 'not configured',
    sockets: io.engine.clientsCount,
  });
});

// ─────────────────────────── Events ───────────────────────────

app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ dateTime: 1 }).lean();
    return res.json(
      events.map((event) => ({
        ...event,
        priceRange: computePriceRange(event.tiers),
      }))
    );
  } catch (err) {
    console.error('Failed to fetch events:', err.message);
    return res.status(500).json({ message: 'Unable to fetch events.' });
  }
});

app.get('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({ message: 'Invalid event id.' });
  }

  try {
    const event = await Event.findById(eventId).lean();

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json({ ...event, priceRange: computePriceRange(event.tiers) });
  } catch (err) {
    console.error('Failed to fetch event:', err.message);
    return res.status(500).json({ message: 'Unable to fetch event.' });
  }
});

app.get('/api/events/:eventId/seats', async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.isValidObjectId(eventId)) {
    return res.status(400).json({ message: 'Invalid event id.' });
  }

  try {
    const seats = await Seat.find({ eventId }).sort({ seatNumber: 1 }).lean();
    return res.json(seats);
  } catch (err) {
    console.error('Failed to fetch seats:', err.message);
    return res.status(500).json({ message: 'Unable to fetch seats.' });
  }
});

// ─────────────────────────── Seat locking ───────────────────────────

app.post('/api/seats/lock', async (req, res) => {
  const eventId = String(req.body.eventId || '').trim();
  const seatNumber = normalizeSeatNumber(req.body.seatNumber);
  const userId = String(req.body.userId || '').trim();

  if (!mongoose.isValidObjectId(eventId) || !seatNumber || !userId) {
    return res
      .status(400)
      .json({ message: 'eventId, seatNumber and userId are required.' });
  }

  const lockKey = seatLockKey(eventId, seatNumber);
  const cartKey = userCartKey(eventId, userId);
  const expiresAt = new Date(Date.now() + LOCK_TTL_SECONDS * 1000).toISOString();

  try {
    const lockResult = await redis.set(lockKey, userId, {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });

    if (!lockResult) {
      return res
        .status(409)
        .json({ message: 'Seat is already selected by another user.' });
    }

    await redis.sadd(cartKey, seatNumber);

    broadcastSeatUpdate(eventId, seatNumber, 'locked');

    Seat.findOneAndUpdate(
      { eventId, seatNumber, status: { $ne: 'booked' } },
      { $set: { status: 'locked', lockedBy: userId, bookedBy: null } }
    )
      .catch(async (err) => {
        console.error('Background seat lock update failed:', err.message);
        await redis.del(lockKey);
        await redis.srem(cartKey, seatNumber);
        broadcastSeatUpdate(eventId, seatNumber, 'available');
      });

    return res.status(200).json({
      message: 'Seat locked successfully.',
      seatNumber,
      expiresAt,
    });
  } catch (err) {
    console.error('Seat lock failed:', err.message);
    return res.status(500).json({ message: 'Unable to lock seat.' });
  }
});

app.post('/api/seats/unlock', async (req, res) => {
  const eventId = String(req.body.eventId || '').trim();
  const seatNumber = normalizeSeatNumber(req.body.seatNumber);
  const userId = String(req.body.userId || '').trim();

  if (!mongoose.isValidObjectId(eventId) || !seatNumber || !userId) {
    return res.status(400).json({ message: 'Missing eventId, seatNumber or userId' });
  }

  try {
    const lockKey = seatLockKey(eventId, seatNumber);
    await redis.del(lockKey);
    await redis.srem(userCartKey(eventId, userId), seatNumber);

    const seat = await Seat.findOneAndUpdate(
      { eventId, seatNumber, status: 'locked', lockedBy: userId },
      { $set: { status: 'available', lockedBy: null } },
      { new: true }
    );

    if (seat) {
      broadcastSeatUpdate(eventId, seatNumber, 'available');
    }

    return res.status(200).json({ message: 'Seat unlocked successfully' });
  } catch (err) {
    console.error('Seat unlock failed:', err);
    return res.status(500).json({ message: 'Unable to unlock seat' });
  }
});

// ─────────────────────────── Bookings ───────────────────────────

app.post('/api/bookings/checkout', requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  const eventId = String(req.body.eventId || '').trim();
  const seatNumbers = Array.isArray(req.body.seatNumbers)
    ? [...new Set(req.body.seatNumbers.map(normalizeSeatNumber))].filter(Boolean)
    : [];

  if (!mongoose.isValidObjectId(eventId) || seatNumbers.length === 0) {
    return res
      .status(400)
      .json({ message: 'eventId and at least one seatNumber are required.' });
  }

  const session = await mongoose.startSession();

  try {
    for (const seatNumber of seatNumbers) {
      const lockOwner = await redis.get(seatLockKey(eventId, seatNumber));
      if (lockOwner !== userId) {
        return res.status(400).json({
          message: `Seat ${seatNumber} is no longer reserved for you. Please reselect.`,
        });
      }
    }

    let booking;
    let totalAmount = 0;

    await session.withTransaction(async () => {
      totalAmount = 0;

      for (const seatNumber of seatNumbers) {
        const seat = await Seat.findOneAndUpdate(
          { eventId, seatNumber, status: { $ne: 'booked' } },
          { $set: { status: 'booked', lockedBy: null, bookedBy: userId } },
          { returnDocument: 'after', session }
        );

        if (!seat) {
          throw new Error(`Seat ${seatNumber} is already booked.`);
        }

        totalAmount += seat.price;
      }

      booking = await Booking.create(
        [
          {
            userId,
            eventId,
            seatNumbers,
            totalAmount,
            paymentStatus: 'completed',
            status: 'confirmed',
          },
        ],
        { session }
      );
    });

    await Promise.all(
      seatNumbers.map(async (seatNumber) => {
        await redis.del(seatLockKey(eventId, seatNumber));
        await redis.srem(userCartKey(eventId, userId), seatNumber);
        broadcastSeatUpdate(eventId, seatNumber, 'booked');
      })
    );

    broadcastAdminUpdate();

    return res.status(200).json({
      message: 'Booking confirmed.',
      booking: booking[0],
    });
  } catch (err) {
    const statusCode = err.message.includes('already booked') ? 409 : 500;
    console.error('Checkout failed:', err.message);
    return res.status(statusCode).json({ message: err.message });
  } finally {
    await session.endSession();
  }
});

app.get('/api/bookings/mine', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .populate('eventId')
      .lean();

    return res.json(bookings);
  } catch (err) {
    console.error('Failed to fetch bookings:', err.message);
    return res.status(500).json({ message: 'Unable to fetch bookings.' });
  }
});

app.post('/api/bookings/:bookingId/cancel', requireAuth, async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.auth.userId;

  if (!mongoose.isValidObjectId(bookingId)) {
    return res.status(400).json({ message: 'Invalid booking id.' });
  }

  const session = await mongoose.startSession();

  try {
    let booking;

    await session.withTransaction(async () => {
      booking = await Booking.findOne({
        _id: bookingId,
        userId,
        status: 'confirmed',
      }).session(session);

      if (!booking) {
        throw new Error('Booking not found or already cancelled.');
      }

      const event = await Event.findById(booking.eventId).session(session);

      if (event && event.dateTime.getTime() < Date.now()) {
        throw new Error('Cannot cancel a booking for an event that already happened.');
      }

      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      await booking.save({ session });

      await Seat.updateMany(
        { eventId: booking.eventId, seatNumber: { $in: booking.seatNumbers } },
        { $set: { status: 'available', bookedBy: null, lockedBy: null } },
        { session }
      );
    });

    booking.seatNumbers.forEach((seatNumber) =>
      broadcastSeatUpdate(String(booking.eventId), seatNumber, 'available')
    );
    broadcastAdminUpdate();

    return res.status(200).json({ message: 'Booking cancelled.', booking });
  } catch (err) {
    const statusCode = err.message.includes('not found') ? 404 : 400;
    console.error('Cancel failed:', err.message);
    return res.status(statusCode).json({ message: err.message });
  } finally {
    await session.endSession();
  }
});

// ─────────────────────────── Admin ───────────────────────────

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [summary] = await Booking.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 },
          totalSeatsSold: { $sum: { $size: '$seatNumbers' } },
        },
      },
    ]);

    const events = await Event.find({}).sort({ dateTime: 1 }).lean();

    const seatCounts = await Seat.aggregate([
      { $group: { _id: { eventId: '$eventId', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const perEvent = {};
    seatCounts.forEach(({ _id, count }) => {
      const key = String(_id.eventId);
      perEvent[key] = perEvent[key] || { available: 0, locked: 0, booked: 0 };
      perEvent[key][_id.status] = count;
    });

    const eventOccupancy = events.map((event) => ({
      eventId: event._id,
      name: event.name,
      dateTime: event.dateTime,
      seats: perEvent[String(event._id)] || { available: 0, locked: 0, booked: 0 },
    }));

    return res.json({
      totalRevenue: summary?.totalRevenue || 0,
      totalBookings: summary?.totalBookings || 0,
      totalSeatsSold: summary?.totalSeatsSold || 0,
      totalEvents: events.length,
      eventOccupancy,
    });
  } catch (err) {
    console.error('Failed to fetch admin stats:', err.message);
    return res.status(500).json({ message: 'Unable to fetch admin stats.' });
  }
});

app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('eventId')
      .lean();

    return res.json(bookings);
  } catch (err) {
    console.error('Failed to fetch admin bookings:', err.message);
    return res.status(500).json({ message: 'Unable to fetch bookings.' });
  }
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    await redis.ping();
    console.log('Redis connected');

    startExpirationWorker();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();
