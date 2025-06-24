const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: String,
  proficiency: String,
  unit: String,
  rank: String,
  age: Number,
  militaryId: String,
  profileImage: String, // URL or base64
});

module.exports = mongoose.model('User',UserSchema,'Users');
