const express = require('express');
const router = express.Router();
const { auth, teacherAuth } = require('../middleware/auth');
const {
  createAssignment,
  getClassroomAssignments,
  getAssignment,
  submitAssignment,
  gradeAssignment,
  addComment,
  markAsDone,
  unsubmitAssignment,
  deleteAssignment,
  updateAssignment
} = require('../controllers/assignmentController');

// Import multer upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists at server/uploads
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads (save to server/uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|zip|doc|docx|png|jpe?g/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpeg';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: pdf, zip, doc, docx, png, jpg'));
    }
  }
});

// Create assignment with file upload support
router.post('/', [auth, teacherAuth, upload.array('attachments', 5)], (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
}, createAssignment);

// Get assignments for a classroom
router.get('/classroom/:classroomId', auth, getClassroomAssignments);

// Get single assignment with details
router.get('/:id', auth, getAssignment);

// Submit assignment (with files)
router.post('/:id/submit', [auth, upload.array('files', 5)], (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Maximum 5 files allowed.' });
    }
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'File upload error' });
  }
  next();
}, submitAssignment);

// Grade assignment
router.post('/:id/grade', auth, gradeAssignment);

// Add comment to assignment
router.post('/:id/comments', auth, addComment);

// Mark assignment as done
router.post('/:id/mark-done', auth, markAsDone);

// Unsubmit assignment
router.post('/:id/unsubmit', auth, unsubmitAssignment);

// Update assignment (teacher only)
router.put('/:id', [auth, teacherAuth, upload.array('attachments', 5)], (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
}, updateAssignment);

// Delete assignment (teacher only)
router.delete('/:id', [auth, teacherAuth], deleteAssignment);

module.exports = router;