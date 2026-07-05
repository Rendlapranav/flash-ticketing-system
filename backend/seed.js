require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);
const Seat = require('./models/Seat');

const ROWS = 'ABCDEFGHIJ'.split('');
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    const seats = [];

    for (const row of ROWS) {
      for (const col of COLS) {
        seats.push({
          seatNumber: `${row}${col}`,
          status: 'available',
          lockedBy: null,
          bookedBy: null,
        });
      }
    }

    await Seat.deleteMany({});
    await Seat.insertMany(seats);

    console.log(`Seeded ${seats.length} seats (A1 - J10)`);
    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
