const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { readdirSync } = require('fs');
const path = require('path');
const assignmentsRouter = require('./routes/assignments');
const classroomsRouter = require('./routes/classrooms');
const authRouter = require('./routes/auth');
const materialsRouter = require('./routes/materials');
const { auth } = require('./middleware/auth');
const { getClassroomMaterials } = require('./controllers/materialController');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route for file access
app.get('/test-files', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-file-access.html'));
});

// DB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/materials', materialsRouter);

// Fallback mapping for materials classroom route in case router mounting order conflicts
app.get('/api/materials/classroom/:classroomId', auth, getClassroomMaterials);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});