const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  unit: {
    type: String,
    required: false,
  },
  proficiency: {
    type: String,
    required: false,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // <-- FIX HERE
    required: true,
    ref: 'User',
  },
});

module.exports = mongoose.model('Post', postSchema, 'Posts');
