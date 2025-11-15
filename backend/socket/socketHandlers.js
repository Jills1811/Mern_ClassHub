const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

const handleConnection = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Join user to their classrooms
    socket.on('join-classrooms', async () => {
      try {
        const user = await User.findById(socket.user._id).populate('classrooms');
        user.classrooms.forEach(classroom => {
          socket.join(`classroom-${classroom._id}`);
        });
      } catch (error) {
        console.error('Error joining classrooms:', error);
      }
    });

    // Handle classroom announcements
    socket.on('classroom-announcement', (data) => {
      socket.to(`classroom-${data.classroomId}`).emit('new-announcement', {
        message: data.message,
        author: socket.user.name,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
    });
  });
};

module.exports = { handleConnection };