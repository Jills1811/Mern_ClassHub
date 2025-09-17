require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const cron = require('node-cron');
const Assignment = require('./models/Assignment');
const Classroom = require('./models/Classroom');
const User = require('./models/User');
const { sendEmail } = require('./services/emailService');

const app = express();

// Verify environment variables
if (!process.env.MONGODB_URI) {
    console.error('Fatal Error: MONGODB_URI is not defined');
    process.exit(1);
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/materials', require('./routes/materials'));

const PORT = process.env.PORT || 5000;

// Daily at 08:00 server time: email reminders for assignments due tomorrow
cron.schedule('0 8 * * *', async () => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

        const assignmentsDueTomorrow = await Assignment.find({
            dueDate: { $gte: start, $lte: end },
            isPublished: true,
            collectSubmissions: true
        }).populate('classroom').populate('teacher');

        for (const assignment of assignmentsDueTomorrow) {
            const classroom = await Classroom.findById(assignment.classroom._id)
                .populate('students', 'name email');

            if (!classroom || !classroom.students || classroom.students.length === 0) continue;

            // Build a set of student IDs who have submitted already
            const submittedStudentIdSet = new Set(
                (assignment.submissions || [])
                    .map(sub => (sub.student ? String(sub.student) : null))
                    .filter(Boolean)
            );

            // Only email students who have not turned in yet
            const to = classroom.students
                .filter(s => !submittedStudentIdSet.has(String(s._id)))
                .map(s => s.email)
                .filter(Boolean);

            if (to.length === 0) continue;

            const subject = `Reminder: "${assignment.title}" due tomorrow`;
            const dueDateStr = assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'tomorrow';
            const classroomName = assignment.classroom?.name || 'your class';

            const html = `
                <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
                    <h2 style="margin:0 0 8px">Assignment due tomorrow</h2>
                    <p style="margin:0 0 8px"><strong>Class:</strong> ${classroomName}</p>
                    <p style="margin:0 0 8px"><strong>Assignment:</strong> ${assignment.title}</p>
                    ${assignment.description ? `<p style="margin:0 0 8px">${assignment.description}</p>` : ''}
                    <p style="margin:0 0 8px"><strong>Due:</strong> ${dueDateStr}</p>
                    <p style="margin:16px 0 0">— ClassHub</p>
                </div>
            `;
            const text = `Assignment due tomorrow\nClass: ${classroomName}\nAssignment: ${assignment.title}\nDue: ${dueDateStr}\n\n— ClassHub`;

            try {
                await sendEmail({ to, subject, html, text });
                console.log(`Reminder emails queued: assignment ${assignment._id} to ${to.length} students`);
            } catch (err) {
                console.error('Failed sending reminder emails', assignment._id, err.message);
            }
        }
    } catch (error) {
        console.error('Cron job error (due reminders):', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});