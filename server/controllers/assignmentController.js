const Assignment = require('../models/Assignment');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');
const { sendEmail } = require('../services/emailService');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Create Assignment
const createAssignment = async (req, res) => {
  try {
    console.log('Received request body:', req.body); // Debug log
    console.log('Received files:', req.files); // Debug log

    const { title, description, dueDate, points, classroom, teacher, collectSubmissions } = req.body;

    // Validate classroom and teacher IDs
    if (!classroom || !teacher) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${!classroom ? 'classroom, ' : ''}${!teacher ? 'teacher' : ''}`
      });
    }

    // Verify teacher exists and has permission
    const verifyTeacher = await User.findById(teacher);
    if (!verifyTeacher || verifyTeacher.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Invalid teacher ID or insufficient permissions'
      });
    }

    // Verify classroom exists
    const verifyClassroom = await Classroom.findById(classroom);
    if (!verifyClassroom) {
      return res.status(400).json({
        success: false,
        message: 'Invalid classroom ID'
      });
    }

    // Process uploaded files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      // For now, always use local storage to avoid Cloudinary timeout issues
      // TODO: Re-enable Cloudinary with better error handling later
      console.log('Using local storage for file uploads to avoid timeout issues');
      
      for (const file of req.files) {
        attachments.push({
          filename: file.originalname,
          url: `/api/uploads/${file.filename}`, // Local file path
          publicId: null,
          size: file.size,
          fileType: file.mimetype,
          localPath: file.path
        });
      }
    }

    const assignment = new Assignment({
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      points: points || 100,
      classroom,
      teacher,
      attachments,
      collectSubmissions: collectSubmissions !== undefined ? collectSubmissions : true,
      isPublished: true // Explicitly set to true
    });

    await assignment.save();
    console.log('Created assignment:', {
      id: assignment._id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      isPublished: assignment.isPublished
    });

    // Add assignment to classroom
    await Classroom.findByIdAndUpdate(classroom, {
      $push: { assignments: assignment._id }
    });

    // Notify students in the classroom about the new assignment
    try {
      const populatedClassroom = await Classroom.findById(classroom).populate('students', 'name email');
      const to = (populatedClassroom?.students || [])
        .map(s => s.email)
        .filter(Boolean);

      if (to.length > 0) {
        const subject = `New assignment posted: "${title}"`;
        const dueDateStr = dueDate ? new Date(dueDate).toLocaleString() : 'No due date';
        const classroomName = populatedClassroom?.name || 'your class';
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 8px">New assignment posted</h2>
            <p style="margin:0 0 8px"><strong>Class:</strong> ${classroomName}</p>
            <p style="margin:0 0 8px"><strong>Assignment:</strong> ${title}</p>
            ${description ? `<p style=\"margin:0 0 8px\">${description}</p>` : ''}
            <p style="margin:0 0 8px"><strong>Due:</strong> ${dueDateStr}</p>
            <p style="margin:16px 0 0">— ClassHub</p>
          </div>
        `;
        const text = `New assignment posted\nClass: ${classroomName}\nAssignment: ${title}\nDue: ${dueDateStr}\n\n— ClassHub`;
        await sendEmail({ to, subject, html, text });
      }
    } catch (notifyErr) {
      console.error('New assignment email notify error:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Assignment creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating assignment'
    });
  }
};

// Get assignments for a classroom
const getClassroomAssignments = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Verify user has access to classroom
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const hasAccess = userRole === 'teacher' 
      ? classroom.teacher.toString() === userId.toString()
      : classroom.students.includes(userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let assignments = await Assignment.find({ classroom: classroomId })
      .populate('teacher', 'name email')
      .populate('classroom', 'name')
      .sort({ createdAt: -1 });

    // Filter published assignments for students
    if (userRole === 'student') {
      assignments = assignments.filter(assignment => assignment.isPublished);
      
      // Add submission status for each assignment
      assignments = assignments.map(assignment => {
        const submission = assignment.submissions.find(
          sub => sub.student.toString() === userId.toString()
        );
        
        return {
          ...assignment.toObject(),
          submissionStatus: submission ? {
            submitted: true,
            submittedAt: submission.submittedAt,
            grade: submission.grade,
            feedback: submission.feedback,
            isGraded: submission.isGraded
          } : { submitted: false }
        };
      });
    }

    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit Assignment
const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the classroom
    const classroom = await Classroom.findById(assignment.classroom);
    if (!classroom.students.includes(studentId)) {
      return res.status(403).json({ message: 'Not enrolled in this classroom' });
    }

    // Block submissions when teacher disabled collection
    if (assignment.collectSubmissions === false) {
      return res.status(400).json({ message: 'Submissions are not allowed for this assignment' });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.student.toString() === studentId.toString()
    );

    if (existingSubmission) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'submissions',
            resource_type: 'auto'
          });
          attachments.push({
            filename: file.originalname,
            url: result.secure_url,
              fileType: file.mimetype,
              publicId: result.public_id
            });
          } else {
            // Local storage path served by /api/uploads
            attachments.push({
              filename: file.originalname,
              url: `/api/uploads/${file.filename}`,
              fileType: file.mimetype,
              localPath: file.path
            });
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }
    }

    // Add submission
    assignment.submissions.push({
      student: studentId,
      attachments,
      submittedAt: new Date()
    });

    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: assignment.submissions[assignment.submissions.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Grade Assignment
const gradeAssignment = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { grade, feedback } = req.body;
    const teacherId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify teacher owns the assignment
    if (assignment.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Not authorized to grade this assignment' });
    }

    // Find the submission
    const submissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === studentId.toString()
    );

    if (submissionIndex === -1) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update grade and feedback
    assignment.submissions[submissionIndex].grade = grade;
    assignment.submissions[submissionIndex].feedback = feedback;
    assignment.submissions[submissionIndex].isGraded = true;

    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment graded successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unsubmit Assignment (student removes their submission)
const unsubmitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check enrollment
    const classroom = await Classroom.findById(assignment.classroom);
    if (!classroom.students.includes(studentId)) {
      return res.status(403).json({ message: 'Not enrolled in this classroom' });
    }

    const index = assignment.submissions.findIndex(
      sub => sub.student.toString() === studentId.toString()
    );

    if (index === -1) {
      return res.status(404).json({ message: 'No submission to unsubmit' });
    }

    // Optionally: delete uploaded files from storage if needed
    // Current submission format for student uploads does not persist publicId; skipping remote deletion.

    assignment.submissions.splice(index, 1);
    await assignment.save();

    res.json({ success: true, message: 'Submission removed' });
  } catch (error) {
    console.error('Unsubmit error:', error);
    res.status(500).json({ message: error.message || 'Error removing submission' });
  }
};

// Publish/Unpublish Assignment
const togglePublishAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    assignment.isPublished = !assignment.isPublished;
    await assignment.save();

    res.json({
      success: true,
      message: `Assignment ${assignment.isPublished ? 'published' : 'unpublished'} successfully`,
      isPublished: assignment.isPublished
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single assignment with details
const getAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id)
      .populate('teacher', 'name email')
      .populate('classroom', 'name')
      .populate('submissions.student', 'name email')
      .populate('comments.author', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify user has access to classroom
    const classroom = await Classroom.findById(assignment.classroom._id);
    const hasAccess = userRole === 'teacher' 
      ? classroom.teacher.toString() === userId.toString()
      : classroom.students.includes(userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if assignment is published for students
    if (userRole === 'student' && !assignment.isPublished) {
      return res.status(403).json({ message: 'Assignment not available' });
    }

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add comment to assignment
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify user has access to classroom
    const classroom = await Classroom.findById(assignment.classroom);
    const hasAccess = classroom.teacher.toString() === userId.toString() || 
                     classroom.students.includes(userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = {
      author: userId,
      text: text.trim()
    };

    assignment.comments.push(comment);
    await assignment.save();

    // Populate the comment author
    await assignment.populate('comments.author', 'name email');

    res.json({
      success: true,
      comment: assignment.comments[assignment.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark assignment as done (for students)
const markAsDone = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student is enrolled in the classroom
    const classroom = await Classroom.findById(assignment.classroom);
    if (!classroom.students.includes(studentId)) {
      return res.status(403).json({ message: 'Not enrolled in this classroom' });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.student.toString() === studentId.toString()
    );

    if (existingSubmission) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    // Add submission
    assignment.submissions.push({
      student: studentId,
      submittedAt: new Date()
    });

    await assignment.save();

    res.json({
      success: true,
      message: 'Assignment marked as done successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Assignment
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Find the assignment
    const assignment = await Assignment.findById(id).populate('classroom');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user is the teacher who created the assignment
    if (userRole !== 'teacher' || assignment.teacher.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own assignments'
      });
    }

    // Delete attachments from Cloudinary or local storage
    if (assignment.attachments && assignment.attachments.length > 0) {
      try {
        for (const attachment of assignment.attachments) {
          if (attachment.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(attachment.publicId);
          } else if (attachment.localPath) {
            // Delete local file
            const fs = require('fs');
            if (fs.existsSync(attachment.localPath)) {
              fs.unlinkSync(attachment.localPath);
            }
          }
        }
      } catch (fileError) {
        console.error('Error deleting files:', fileError);
        // Continue with assignment deletion even if file deletion fails
      }
    }

    // Remove assignment from classroom
    await Classroom.findByIdAndUpdate(assignment.classroom._id, {
      $pull: { assignments: assignment._id }
    });

    // Delete the assignment
    await Assignment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Assignment deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting assignment'
    });
  }
};

// Update Assignment
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const { title, description, dueDate, points, collectSubmissions } = req.body;

    // Find the assignment
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user is the teacher who created the assignment
    if (userRole !== 'teacher' || assignment.teacher.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own assignments'
      });
    }

    // Process new uploaded files if any
    let newAttachments = [];
    if (req.files && req.files.length > 0) {
      try {
        // Check if Cloudinary is configured
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          // Upload to Cloudinary
          for (const file of req.files) {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'assignments',
              resource_type: 'auto'
            });

            newAttachments.push({
              filename: file.originalname,
              url: result.secure_url,
              publicId: result.public_id,
              size: file.size,
              mimetype: file.mimetype
            });
          }
        } else {
          // Store file info without Cloudinary (local storage)
          for (const file of req.files) {
            newAttachments.push({
              filename: file.originalname,
              url: `/uploads/${file.filename}`, // Local file path
              publicId: null,
              size: file.size,
              mimetype: file.mimetype,
              localPath: file.path
            });
          }
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading files: ' + uploadError.message
        });
      }
    }

    // Update assignment
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (points) updateData.points = parseInt(points);
    if (newAttachments.length > 0) {
      updateData.attachments = [...assignment.attachments, ...newAttachments];
    }
    if (collectSubmissions !== undefined) updateData.collectSubmissions = collectSubmissions;

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('teacher', 'name email');

    res.json({
      success: true,
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Assignment update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating assignment'
    });
  }
};

module.exports = { 
  upload,
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
};