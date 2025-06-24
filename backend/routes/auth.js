const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Message = require('../models/Message');


// Register
router.post('/register', async (req, res) => {
  const { email, password, ...rest } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword, ...rest });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/id/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ profileImage: user.profileImage });
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('fullName profileImage rank unit proficiency email age');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update user by ID
router.put('/:userId', async (req, res) => {
  try {
    const { fullName, proficiency, unit, rank, age, militaryId, profileImage } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { fullName, proficiency, unit, rank, age, militaryId, profileImage },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile image by ID
router.put('/:userId/image', async (req, res) => {
  try {
    const { profileImage } = req.body;

    // Find user and update only the profileImage field
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { profileImage },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser); // Send the updated user with the new image
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/get-profile-images', async (req, res) => {
  const { recipientIds } = req.body; // expecting an array of user IDs
  try {
    const profiles = await User.find({ _id: { $in: recipientIds } }, '_id profileImage fullName'); 
    res.json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching profile images');
  }
});

// Update user password by ID
router.put('/password/:userId', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find user by ID and update the password
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { password: hashedPassword },
      { new: true }
    ).select('-password'); // Exclude password field from response

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' }); // Better to send confirmation
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/auth/:userId
router.delete('/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Delete related comments
    await Comment.deleteMany({ userId: userId });

    // Delete related posts
    await Post.deleteMany({ user_id: userId });

    // Delete related messages (both sent and received)
    await Message.deleteMany({ 
      $or: [{ to: userId }, { from: userId }] 
    });

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Account and related data deleted.' });
  } catch (err) {
    console.error('Error deleting user account:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});





module.exports = router;
