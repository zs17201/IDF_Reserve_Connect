// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User collection
        required: true,
      },
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User collection
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
      },
    },
    { timestamps: true }
  );

module.exports = mongoose.model('Message', messageSchema, 'Messages');
