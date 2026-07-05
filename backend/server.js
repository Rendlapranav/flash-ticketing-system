require('dotenv').config();
const dns = require('dns');
const http = require('http');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { Redis } = require('@upstash/redis');
const { Server } = require('socket.io');

const Booking = require('./models/Booking');
const Seat = require('./models/Seat');
const {
  LOCK_TTL_SECONDS,
  seatLockKey,
  userCartKey,
} = require('./utils/redisKeys');
const {
  broadcastSeatUpdate,
  setSocketServer,
} = require('./utils/socketEvents');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const requiredEnv = ['MONGO_URI', 'REDIS_URL', 'REDIS_TOKEN'];
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

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

function normalizeSeatNumber(seatNumber) {
  return String(seatNumber || '').trim().toUpperCase();
}

function startExpirationWorker() {
  const POLL_INTERVAL_MS = 10_000;

  setInterval(async () => {
    try {
      const lockedSeats = await Seat.find({ status: 'locked' }).lean();

      for (const seat of lockedSeats) {
        const lockKey = seatLockKey(seat.seatNumber);
        const lockOwner = await redis.get(lockKey);

        if (!lockOwner) {
          await Seat.findOneAndUpdate(
            { seatNumber: seat.seatNumber, status: 'locked' },
            { $set: { status: 'available', lockedBy: null } }
          );

          if (seat.lockedBy) {
            const cartKey = userCartKey(seat.lockedBy);
            await redis.srem(cartKey, seat.seatNumber);
          }

          broadcastSeatUpdate(seat.seatNumber, 'available');
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

app.get('/api/seats', async (req, res) => {
  try {
    const seats = await Seat.find({}).sort({ seatNumber: 1 }).lean();
    return res.json(seats);
  } catch (err) {
    console.error('Failed to fetch seats:', err.message);
    return res.status(500).json({ message: 'Unable to fetch seats.' });
  }
});

app.post('/api/seats/lock', async (req, res) => {
  const seatNumber = normalizeSeatNumber(req.body.seatNumber);
  const userId = String(req.body.userId || '').trim();

  if (!seatNumber || !userId) {
    return res.status(400).json({ message: 'seatNumber and userId are required.' });
  }

  const lockKey = seatLockKey(seatNumber);
  const cartKey = userCartKey(userId);
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

    broadcastSeatUpdate(seatNumber, 'locked');

    Seat.findOneAndUpdate(
      { seatNumber, status: { $ne: 'booked' } },
      {
        $set: {
          seatNumber,
          status: 'locked',
          lockedBy: userId,
          bookedBy: null,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
      .catch(async (err) => {
        console.error('Background seat lock update failed:', err.message);
        await redis.del(lockKey);
        await redis.srem(cartKey, seatNumber);
        broadcastSeatUpdate(seatNumber, 'available');
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
  const seatNumber = normalizeSeatNumber(req.body.seatNumber);
  const userId = String(req.body.userId || '').trim();

  if (!seatNumber || !userId) {
    return res.status(400).json({ message: 'Missing seatNumber or userId' });
  }

  try {
    const lockKey = seatLockKey(seatNumber);
    await redis.del(lockKey);
    await redis.srem(userCartKey(userId), seatNumber);

    const seat = await Seat.findOneAndUpdate(
      { seatNumber, status: 'locked', lockedBy: userId },
      { $set: { status: 'available', lockedBy: null, lockedAt: null } },
      { new: true }
    );
    
    if (seat) {
        broadcastSeatUpdate(seatNumber, 'available');
    }

    return res.status(200).json({ message: 'Seat unlocked successfully' });
  } catch (err) {
    console.error('Seat unlock failed:', err);
    return res.status(500).json({ message: 'Unable to unlock seat' });
  }
});

app.post('/api/seats/book', async (req, res) => {
  const seatNumber = normalizeSeatNumber(req.body.seatNumber);
  const userId = String(req.body.userId || '').trim();

  if (!seatNumber || !userId) {
    return res.status(400).json({ message: 'seatNumber and userId are required.' });
  }

  const lockKey = seatLockKey(seatNumber);
  const cartKey = userCartKey(userId);
  const session = await mongoose.startSession();

  try {
    const lockOwner = await redis.get(lockKey);

    if (lockOwner !== userId) {
      return res
        .status(400)
        .json({ message: 'Session expired. Your seat was released.' });
    }

    let booking;

    await session.withTransaction(async () => {
      const seat = await Seat.findOneAndUpdate(
        {
          seatNumber,
          status: { $ne: 'booked' },
        },
        {
          $set: {
            status: 'booked',
            lockedBy: null,
            bookedBy: userId,
          },
        },
        {
          returnDocument: 'after',
          session,
        }
      );

      if (!seat) {
        throw new Error('Seat is already booked.');
      }

      booking = await Booking.create(
        [
          {
            userId,
            seatNumbers: [seatNumber],
            paymentStatus: 'completed',
          },
        ],
        { session }
      );
    });

    await redis.del(lockKey);
    await redis.srem(cartKey, seatNumber);

    broadcastSeatUpdate(seatNumber, 'booked');

    return res.status(200).json({
      message: 'Seat booked successfully.',
      booking: booking[0],
    });
  } catch (err) {
    const statusCode = err.message === 'Seat is already booked.' ? 409 : 500;

    console.error('Seat booking failed:', err.message);
    return res.status(statusCode).json({ message: err.message });
  } finally {
    await session.endSession();
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
