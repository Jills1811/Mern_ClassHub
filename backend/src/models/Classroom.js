const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
    sparse: true // Allow multiple null values but enforce uniqueness for non-null values
  },
  classCode: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values but enforce uniqueness for non-null values
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
      assignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment'
    }],
    announcements: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Announcement'
    }],
    materials: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material'
    }]
}, { timestamps: true });

// Pre-save middleware to ensure both code fields are set
classroomSchema.pre('save', function(next) {
  // If code is set but classCode is not, set classCode to match
  if (this.code && !this.classCode) {
    this.classCode = this.code;
  }
  // If classCode is set but code is not, set code to match
  if (this.classCode && !this.code) {
    this.code = this.classCode;
  }
  next();
});

module.exports = mongoose.model('Classroom', classroomSchema);