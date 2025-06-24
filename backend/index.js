require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const postRoutes = require('./routes/posts');
const usersRoutes = require('./routes/auth');
const commentsRoutes = require('./routes/comments');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    const db = mongoose.connection;
    console.log(`✓ MongoDB connected – using DB: ${db.name}`);
  })
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (_req, res) => res.send('API is running'));
app.use('/api/auth', usersRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/messages', messageRoutes);

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌  User connected: ${socket.id}`);

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`✅  Registered user ${userId} with socket ${socket.id}`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const saved = await Message.create(data);
      const recSock = onlineUsers.get(data.to);
      if (recSock) {
        io.to(recSock).emit('receiveMessage', {
          ...saved.toObject(),
          status: 'delivered',
        });
        saved.status = 'delivered';
        await saved.save();
      }
      socket.emit('messageStatusUpdate', { _id: saved._id, status: saved.status });
    } catch (err) {
      console.error('❌  sendMessage error:', err.message);
    }
  });

  socket.on('markAsRead', async ({ messageId }) => {
    try {
      const msg = await Message.findByIdAndUpdate(
        messageId,
        { status: 'read' },
        { new: true }
      );
      if (!msg) return;
      const senderSock = onlineUsers.get(msg.from.toString());
      if (senderSock) io.to(senderSock).emit('messageRead', { messageId });
    } catch (err) {
      console.error('❌  markAsRead error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        console.log(`🔌  User ${uid} disconnected`);
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`🚀  Server running on port ${PORT})`));
