const Material = require('../models/Material');
const Classroom = require('../models/Classroom');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendEmail } = require('../services/emailService');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/temp';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 1 // Single file for materials
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|txt|zip|rar|mp4|mp3|avi|mov|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                    file.mimetype.includes('document') || 
                    file.mimetype.includes('presentation') ||
                    file.mimetype.includes('video') ||
                    file.mimetype.includes('audio');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

// Create a new material
exports.createMaterial = async (req, res) => {
  try {
    const { title, description, type, category, content, tags } = req.body;
    const teacherId = req.user._id;
    const { classroomId } = req.params;

    // Verify teacher has access to classroom
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let materialData = {
      title,
      description: description || '',
      type,
      category: category || 'other',
      classroom: classroomId,
      teacher: teacherId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    // Handle different content types
    if (type === 'file' && req.file) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'classroom-materials',
            resource_type: 'auto',
            public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`
          });
          materialData.content = {
            file: {
              filename: req.file.originalname,
              url: result.secure_url,
              publicId: result.public_id,
              fileType: req.file.mimetype,
              size: req.file.size
            }
          };
          fs.unlinkSync(req.file.path);
        } else {
          // Local storage fallback: move from temp to uploads root
          const uploadsRoot = path.join(__dirname, '..', 'uploads');
          if (!fs.existsSync(uploadsRoot)) {
            fs.mkdirSync(uploadsRoot, { recursive: true });
          }
          const fileName = path.basename(req.file.path);
          const finalPath = path.join(uploadsRoot, fileName);
          try {
            fs.renameSync(req.file.path, finalPath);
          } catch (moveErr) {
            // If rename fails across devices, fallback to copy + unlink
            fs.copyFileSync(req.file.path, finalPath);
            fs.unlinkSync(req.file.path);
          }

          materialData.content = {
            file: {
              filename: req.file.originalname,
              url: `/api/uploads/${fileName}`,
              publicId: null,
              fileType: req.file.mimetype,
              size: req.file.size
            }
          };
        }
      } catch (uploadError) {
        // Fallback to LOCAL storage if Cloudinary fails or any error occurs
        try {
          const uploadsRoot = path.join(__dirname, '..', 'uploads');
          if (!fs.existsSync(uploadsRoot)) {
            fs.mkdirSync(uploadsRoot, { recursive: true });
          }
          const fileName = path.basename(req.file.path);
          const finalPath = path.join(uploadsRoot, fileName);
          try {
            fs.renameSync(req.file.path, finalPath);
          } catch (moveErr) {
            fs.copyFileSync(req.file.path, finalPath);
            fs.unlinkSync(req.file.path);
          }

          materialData.content = {
            file: {
              filename: req.file.originalname,
              url: `/api/uploads/${fileName}`,
              publicId: null,
              fileType: req.file.mimetype,
              size: req.file.size
            }
          };
        } catch (localErr) {
          console.error('File upload error (cloud + local fallback failed):', uploadError, localErr);
          return res.status(500).json({ success: false, message: 'File upload failed' });
        }
      }
    } else if (type === 'link') {
      const linkData = typeof content === 'string' ? JSON.parse(content) : content;
      materialData.content = {
        link: {
          url: linkData.url,
          title: linkData.title || title,
          description: linkData.description || description
        }
      };
    } else if (type === 'google_drive') {
      const driveData = typeof content === 'string' ? JSON.parse(content) : content;
      materialData.content = {
        googleDrive: {
          url: driveData.url,
          title: driveData.title || title,
          description: driveData.description || description
        }
      };
    } else if (type === 'description') {
      materialData.content = {
        text: content || ''
      };
    }

    const material = new Material(materialData);
    await material.save();

    // Add material to classroom
    classroom.materials = classroom.materials || [];
    classroom.materials.push(material._id);
    await classroom.save();

    // Notify students in the classroom about the new material
    try {
      const populatedClassroom = await Classroom.findById(classroomId).populate('students', 'name email');
      const to = (populatedClassroom?.students || [])
        .map(s => s.email)
        .filter(Boolean);

      if (to.length > 0) {
        const subject = `New material posted: "${title}"`;
        const classroomName = populatedClassroom?.name || 'your class';
        const summary = description || (type === 'link' ? 'Link shared' : type === 'file' ? 'File uploaded' : 'Update posted');
        const html = `
          <div style=\"font-family:Arial,Helvetica,sans-serif;line-height:1.5\">\n            <h2 style=\"margin:0 0 8px\">New material posted</h2>\n            <p style=\"margin:0 0 8px\"><strong>Class:</strong> ${classroomName}</p>\n            <p style=\"margin:0 0 8px\"><strong>Title:</strong> ${title}</p>\n            <p style=\"margin:0 0 8px\">${summary}</p>\n            <p style=\"margin:16px 0 0\">— ClassHub</p>\n          </div>\n        `;
        const text = `New material posted\nClass: ${classroomName}\nTitle: ${title}\n${summary}\n\n— ClassHub`;
        await sendEmail({ to, subject, html, text });
      }
    } catch (notifyErr) {
      console.error('New material email notify error:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      material: await Material.findById(material._id).populate('teacher', 'name email')
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating material'
    });
  }
};

// Get materials for a classroom
exports.getClassroomMaterials = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Verify user has access to classroom
    let classroom = await Classroom.findById(classroomId);
    // If not found by ObjectId, try by class code (string)
    if (!classroom) {
      classroom = await Classroom.findOne({ code: classroomId }) || await Classroom.findOne({ classCode: classroomId });
    }
    if (!classroom) {
      return res.status(200).json({ success: true, materials: [] });
    }

    const hasAccess = userRole === 'teacher' 
      ? classroom.teacher.toString() === userId.toString()
      : classroom.students.includes(userId);

    if (!hasAccess) {
      return res.status(200).json({ success: true, materials: [] });
    }

    const { category, type } = req.query;
    let query = { classroom: classroom._id };


    if (category && category !== 'all') {
      query.category = category;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter published materials for students
    if (userRole === 'student') {
      query.isPublished = true;
    }

    const materials = await Material.find(query)
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      materials
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single material
exports.getMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const material = await Material.findById(materialId)
      .populate('teacher', 'name email')
      .populate('classroom', 'name');

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Verify user has access to classroom
    const classroom = await Classroom.findById(material.classroom._id);
    const hasAccess = userRole === 'teacher' 
      ? classroom.teacher.toString() === userId.toString()
      : classroom.students.includes(userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if material is published for students
    if (userRole === 'student' && !material.isPublished) {
      return res.status(403).json({ message: 'Material not available' });
    }

    res.json({
      success: true,
      material
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update material
exports.updateMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const teacherId = req.user._id;
    const { title, description, category, content, tags, isPublished } = req.body;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Verify teacher owns this material
    if (material.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (title) material.title = title;
    if (description !== undefined) material.description = description;
    if (category) material.category = category;
    if (tags) material.tags = tags.split(',').map(tag => tag.trim());
    if (isPublished !== undefined) material.isPublished = isPublished;

    // Update content based on type
    if (content && material.type === 'link') {
      const linkData = JSON.parse(content);
      material.content.link = {
        url: linkData.url,
        title: linkData.title || material.title,
        description: linkData.description || material.description
      };
    } else if (content && material.type === 'google_drive') {
      const driveData = JSON.parse(content);
      material.content.googleDrive = {
        url: driveData.url,
        title: driveData.title || material.title,
        description: driveData.description || material.description
      };
    } else if (content && material.type === 'description') {
      material.content.text = content;
    }

    await material.save();

    res.json({
      success: true,
      material: await Material.findById(materialId).populate('teacher', 'name email')
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const teacherId = req.user._id;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Verify teacher owns this material
    if (material.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file from Cloudinary if it's a file material
    if (material.type === 'file' && material.content.file && material.content.file.publicId) {
      try {
        await cloudinary.uploader.destroy(material.content.file.publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
      }
    }

    // Remove material from classroom
    const classroom = await Classroom.findById(material.classroom);
    if (classroom) {
      classroom.materials = classroom.materials.filter(
        matId => matId.toString() !== materialId
      );
      await classroom.save();
    }

    await Material.findByIdAndDelete(materialId);

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload file for material
exports.uploadMaterialFile = upload.single('file');

module.exports = exports;
