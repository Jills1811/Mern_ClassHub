const Announcement = require('../models/Announcement');
const Classroom = require('../models/Classroom');
const { sendEmail } = require('../services/emailService');

// Create a new announcement
const createAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;
        const { classroomId } = req.params;
        const teacherId = req.user._id;

        // Verify the classroom exists and user is the teacher
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found' });
        }

        // Allow both teachers and students to create announcements
        const isTeacher = classroom.teacher.toString() === teacherId.toString();
        const isStudent = classroom.students.includes(teacherId);
        
        if (!isTeacher && !isStudent) {
            return res.status(403).json({ success: false, message: 'Only classroom members can create announcements' });
        }

        // Create the announcement
        const announcement = new Announcement({
            title,
            content,
            classroom: classroomId,
            author: teacherId
        });

        await announcement.save();

        // Add announcement to classroom
        await Classroom.findByIdAndUpdate(classroomId, {
            $push: { announcements: announcement._id }
        });

        // Populate author info for response
        await announcement.populate('author', 'name email role');

        // Notify classroom students about the new announcement
        try {
            const populatedClassroom = await Classroom.findById(classroomId).populate('students', 'name email');
            const to = (populatedClassroom?.students || [])
                .map(s => s.email)
                .filter(Boolean);

            if (to.length > 0) {
                const subject = `New announcement: "${title}"`;
                const classroomName = populatedClassroom?.name || 'your class';
                const html = `
                    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
                        <h2 style="margin:0 0 8px">New announcement</h2>
                        <p style="margin:0 0 8px"><strong>Class:</strong> ${classroomName}</p>
                        <p style="margin:0 0 8px"><strong>Title:</strong> ${title}</p>
                        <div style="margin:8px 0 0; white-space:pre-line">${content}</div>
                        <p style="margin:16px 0 0">— ClassHub</p>
                    </div>
                `;
                const text = `New announcement\nClass: ${classroomName}\nTitle: ${title}\n\n${content}\n\n— ClassHub`;
                await sendEmail({ to, subject, html, text });
            }
        } catch (notifyErr) {
            console.error('New announcement email notify error:', notifyErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            announcement
        });

    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating announcement',
            error: error.message
        });
    }
};

// Get all announcements for a classroom
const getClassroomAnnouncements = async (req, res) => {
    try {
        const { classroomId } = req.params;

        // Verify the classroom exists
        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ success: false, message: 'Classroom not found' });
        }

        // Get announcements with author info
        const announcements = await Announcement.find({ classroom: classroomId })
            .populate('author', 'name email role')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            announcements
        });

    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcements',
            error: error.message
        });
    }
};

// Delete an announcement (teacher only)
const deleteAnnouncement = async (req, res) => {
    try {
        const { id: announcementId } = req.params;
        const teacherId = req.user._id;

        const announcement = await Announcement.findById(announcementId);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' });
        }

        // Verify user is the teacher who created the announcement
        if (announcement.teacher.toString() !== teacherId.toString()) {
            return res.status(403).json({ success: false, message: 'Only the announcement creator can delete it' });
        }

        // Remove announcement from classroom
        await Classroom.findByIdAndUpdate(announcement.classroom, {
            $pull: { announcements: announcementId }
        });

        await Announcement.findByIdAndDelete(announcementId);

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting announcement',
            error: error.message
        });
    }
};

module.exports = {
    createAnnouncement,
    getClassroomAnnouncements,
    deleteAnnouncement
};