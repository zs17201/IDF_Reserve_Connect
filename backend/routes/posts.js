const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post'); // assuming you have a Post model
const User = require('../models/User'); // if you're using User here too
const Comment = require('../models/Comment'); // ✅ Add this line


router.post('/create', async (req, res) => {
  try {
    const { email, text, unit, proficiency, user_id } = req.body;

    const newPost = new Post({
      email,
      text,
      unit,
      proficiency,
      createdAt: new Date(),
      user_id: new mongoose.Types.ObjectId(user_id), // <-- Convert string to ObjectId
    });

    await newPost.save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:postId/details', async (req, res) => {
  try {
    const postId = req.params.postId;

    // 1. Get the post
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // 2. Get the author of the post
    const author = await User.findById(post.user_id).lean();

    // 3. Get comments
    const comments = await Comment.find({ postId }).lean();

    // 4. Get users who wrote the comments
    const userIds = comments.map((c) => c.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    // 5. Attach user info to comments
    const enrichedComments = comments.map((comment) => {
      const user = userMap[comment.userId.toString()];
      return {
        ...comment,
        userName: user?.fullName || 'Unknown',
        userImage: user?.profileImage || null,
      };
    });

    // 6. Send response
    res.json({
      post: {
        ...post,
        authorName: author?.fullName || 'Unknown',
        authorImage: author?.profileImage || null,
      },
      comments: enrichedComments,
    });
  } catch (err) {
    console.error('Error fetching post details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/', async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: 'Users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          email: 1,
          text: 1,
          unit: 1,
          proficiency: 1,
          createdAt: 1,
          profileImage: '$userInfo.profileImage',
          fullName: '$userInfo.fullName',
          rank: '$userInfo.rank',
          user_id: 1
        }
      }
    ]);

    res.json(posts);
  } catch (err) {
    console.error('Fetch posts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a post and its comments
router.delete('/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete all associated comments
    await Comment.deleteMany({ _id: { $in: post.comments } });

    // Delete the post itself
    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post and associated comments deleted successfully' });
  } catch (error) {
    console.error('Error deleting post and comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
