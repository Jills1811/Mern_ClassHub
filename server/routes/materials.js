const express = require('express');
const router = express.Router();
const {
  createMaterial,
  getClassroomMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  uploadMaterialFile
} = require('../controllers/materialController');
const { auth, teacherAuth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create material (with optional file upload)
router.post('/:classroomId', uploadMaterialFile, createMaterial);

// Get materials for a classroom
router.get('/classroom/:classroomId', getClassroomMaterials);

// Get a single material
router.get('/:materialId', getMaterial);

// Update material
router.put('/:materialId', updateMaterial);

// Delete material
router.delete('/:materialId', deleteMaterial);

module.exports = router;
