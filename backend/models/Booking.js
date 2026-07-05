const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  seatNumbers: {
    type: [String],
    required: true,
    validate: {
      validator: (seatNumbers) => seatNumbers.length > 0,
      message: 'A booking must contain at least one seat.',
    },
  },
  paymentStatus: {
    type: String,
    enum: ['completed'],
    default: 'completed',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Booking', bookingSchema);
