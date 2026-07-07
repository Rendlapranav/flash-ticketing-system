const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    tier: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked'],
      default: 'available',
      required: true,
    },
    lockedBy: {
      type: String,
      default: null,
    },
    bookedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seatSchema.index({ eventId: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);
