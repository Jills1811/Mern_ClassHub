const express = require('express');
const router = express.Router();
const { auth, teacherAuth } = require('../middleware/auth');
const classroomController = require('../controllers/classroomController');
const announcementController = require('../controllers/announcementController');

// Create new classroom (teachers only)
router.post('/', auth, teacherAuth, classroomController.createClassroom);

// Join classroom by class code (students only)
router.post('/join', auth, classroomController.joinClassroomByCode);

// Get list of user's classrooms
router.get('/my-classrooms', auth, classroomController.getMyClassrooms);

// Get specific classroom by ID
router.get('/:id', auth, classroomController.getClassroom);

// Join classroom (students only)
router.post('/:classroomId/join', auth, classroomController.joinClassroom);

// Leave classroom (students only)
router.post('/:classroomId/leave', auth, classroomController.leaveClassroom);

// Delete classroom (teachers only)
router.delete('/:classroomId', auth, teacherAuth, classroomController.deleteClassroom);

// Announcement routes - nested under classrooms
router.post('/:classroomId/announcements', auth, announcementController.createAnnouncement);
router.get('/:classroomId/announcements', auth, announcementController.getClassroomAnnouncements);

module.exports = router;