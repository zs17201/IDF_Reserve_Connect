const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User'); 

// Post comment
router.post('/', async (req, res) => {
    try {
      const { postId, userId, text, image } = req.body;
  
      const comment = new Comment({
        postId,
        userId,
        text,
        image: image || null,
      });
  
      const saved = await comment.save();
          // 2. Push comment ID into post's comments array
          await Post.findByIdAndUpdate(postId, {
            $push: { comments: saved._id },
          });
      
      res.status(201).json({ message: 'Comment added successfully' });
    } catch (err) {
      console.error('Failed to save comment:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

// Get comments for a post
// GET /api/comments/post/:postId?page=1&limit=10
router.get('/post/:postId', async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const postId = req.params.postId;
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      // Fetch paginated comments
      const comments = await Comment.find({ postId })
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
  
      const userIds = comments.map((c) => c.userId);
      const users = await User.find({ _id: { $in: userIds } }).lean();
  
      const userMap = {};
      users.forEach((u) => {
        userMap[u._id.toString()] = u;
      });
  
      const enrichedComments = comments.map((comment) => {
        const user = userMap[comment.userId.toString()];
        return {
          ...comment,
          userName: user?.fullName || 'Unknown',
          userImage: user?.profileImage || null,
        };
      });
  
      res.json(enrichedComments);
    } catch (err) {
      console.error('Fetch paginated comments error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // DELETE a comment
router.delete('/:commentId', async (req, res) => {
    try {
      const { commentId } = req.params;
  
      const deletedComment = await Comment.findByIdAndDelete(commentId);
  
      if (!deletedComment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
  
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err) {
      console.error('Error deleting comment:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  
module.exports = router;
