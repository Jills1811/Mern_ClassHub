const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['file', 'link', 'google_drive', 'description'],
    required: true
  },
  content: {
    // For file uploads
    file: {
      filename: String,
      url: String,
      publicId: String,
      fileType: String,
      size: Number
    },
    // For links
    link: {
      url: String,
      title: String,
      description: String
    },
    // For Google Drive
    googleDrive: {
      url: String,
      title: String,
      description: String
    },
    // For descriptions only
    text: { type: String, default: '' }
  },
  category: {
    type: String,
    enum: ['lecture_notes', 'practice_assignments', 'resources', 'announcements', 'other'],
    default: 'other'
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Index for better query performance
materialSchema.index({ classroom: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('Material', materialSchema);
