const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');


// Route to send a message
router.post('/send', async (req, res) => {
  const { from, to, message } = req.body;

  try {
    const newMessage = new Message({
      from,
      to,
      message,
    });

    await newMessage.save();
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message', details: error });
  }
});

// Fetch messages for a user and delete them after
router.post('/fetchAndDelete', async (req, res) => {
    const { userId, recipientId } = req.body;
  
    try {
      const messages = await Message.find({
        to: userId,
        from: recipientId,
      });
    
      // Delete after fetching
      await Message.deleteMany({
        to: userId,
        from: recipientId,
      });
  
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch and delete messages' });
    }
  });


  router.get('/chats/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const objectUserId = new mongoose.Types.ObjectId(userId);
  
      const messages = await Message.aggregate([
        {
          $match: {
            to: objectUserId,
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: "$from",
            latestMessage: { $first: "$message" },
            latestTimestamp: { $first: "$createdAt" },
            unreadCount: { 
              $sum: { 
                $cond: [
                  { $ne: ["$status", "read"] }, // if status is NOT 'read'
                  1, 
                  0
                ] 
              } 
            },
          }
        },
        {
          $lookup: {
            from: "Users",
            let: { senderId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", { $toObjectId: "$$senderId" }] }
                }
              },
              {
                $project: { fullName: 1, profileImage: 1 }
              }
            ],
            as: "senderInfo"
          }
        },
        {
          $unwind: "$senderInfo"
        },
        {
          $project: {
            recipientId: "$_id",
            recipientName: "$senderInfo.fullName",
            recipientImage: "$senderInfo.profileImage",
            latestMessage: 1,
            latestTimestamp: 1,
            unreadCount: 1,
          }
        }
      ]);
  
      res.status(200).json(messages);
  
    } catch (error) {
      console.error('Failed to load chats', error);
      res.status(500).json({ error: 'Failed to load chats', details: error });
    }
  });
  
  
  

module.exports = router;

