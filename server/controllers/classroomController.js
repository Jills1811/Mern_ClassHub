const Classroom = require('../models/Classroom');
const User = require('../models/User');
const { auth, teacherAuth } = require('../middleware/auth');

// Create new classroom (teachers only)
const createClassroom = async (req, res) => {
    try {
        const { name, subject, description, classCode } = req.body;
        const teacherId = req.user._id;

        // Check if class code already exists
        if (classCode) {
            const existingClassroom = await Classroom.findOne({ classCode });
            if (existingClassroom) {
                return res.status(400).json({
                    success: false,
                    message: 'Class code already exists. Please choose a different one.'
                });
            }
        }

        const generatedCode = classCode || generateClassCode();
        const classroom = new Classroom({
            name,
            subject,
            description,
            code: generatedCode,
            classCode: generatedCode,
            teacher: teacherId,
            students: []
        });

        await classroom.save();

        // Populate teacher details
        await classroom.populate('teacher', 'name email');

        res.status(201).json({
            success: true,
            message: 'Classroom created successfully',
            classroom
        });
    } catch (error) {
        console.error('Error creating classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create classroom'
        });
    }
};

// Get specific classroom by ID
const getClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const classroom = await Classroom.findById(id)
            .populate('teacher', 'name email')
            .populate('students', 'name email')
            .populate('assignments')
            .populate({
                path: 'announcements',
                populate: {
                    path: 'author',
                    select: 'name email role'
                }
            });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Check if user has access to this classroom
        const isTeacher = classroom.teacher._id.toString() === userId.toString();
        const isStudent = classroom.students.some(student => student._id.toString() === userId.toString());

        if (!isTeacher && !isStudent) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this classroom'
            });
        }

        res.json({
            success: true,
            classroom
        });
    } catch (error) {
        console.error('Error fetching classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classroom'
        });
    }
};

// Get list of user's classrooms
const getMyClassrooms = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let classrooms = [];

        if (userRole === 'teacher') {
            // Get classrooms where user is the teacher
            classrooms = await Classroom.find({ teacher: userId })
                .populate('teacher', 'name email')
                .populate('students', 'name email')
                .populate('assignments')
                .sort({ createdAt: -1 });
                
            console.log('Teacher classrooms with assignments:', classrooms.map(c => ({
                name: c.name,
                assignmentCount: c.assignments?.length || 0,
                assignments: c.assignments?.map(a => ({ id: a._id, title: a.title, dueDate: a.dueDate })) || []
            })));
            
            // Ensure teacher assignments are also properly serialized
            classrooms = classrooms.map(classroom => ({
                ...classroom.toObject(),
                assignments: classroom.assignments?.map(assignment => {
                    return assignment.toObject ? assignment.toObject() : assignment;
                }) || []
            }));
        } else {
            // Get classrooms where user is a student
            classrooms = await Classroom.find({ students: userId })
                .populate('teacher', 'name email')
                .populate('students', 'name email')
                .populate('assignments')
                .sort({ createdAt: -1 });
                
            console.log('Student classrooms with assignments:', classrooms.map(c => ({
                name: c.name,
                assignmentCount: c.assignments?.length || 0,
                assignments: c.assignments?.map(a => ({ id: a._id, title: a.title, dueDate: a.dueDate })) || []
            })));

            // Add submission status for each assignment in each classroom and filter published assignments
            for (const classroom of classrooms) {
                if (classroom.assignments && classroom.assignments.length > 0) {
                    console.log(`Classroom ${classroom.name} assignments before filtering:`, classroom.assignments.map(a => ({
                        id: a._id,
                        title: a.title,
                        dueDate: a.dueDate,
                        isPublished: a.isPublished
                    })));
                    
                    // Filter published assignments and add submission status
                    const publishedAssignments = classroom.assignments.filter(assignment => assignment.isPublished);
                    console.log(`Published assignments for ${classroom.name}:`, publishedAssignments.map(a => ({
                        id: a._id,
                        title: a.title,
                        dueDate: a.dueDate
                    })));
                    
                    classroom.assignments = publishedAssignments.map(assignment => {
                        const submission = assignment.submissions.find(
                            sub => sub.student.toString() === userId.toString()
                        );
                        
                        // Convert to plain object if it's a Mongoose document
                        const assignmentObj = assignment.toObject ? assignment.toObject() : assignment;
                        
                        const processedAssignment = {
                            ...assignmentObj,
                            submissionStatus: submission ? {
                                submitted: true,
                                submittedAt: submission.submittedAt,
                                grade: submission.grade,
                                feedback: submission.feedback,
                                isGraded: submission.isGraded
                            } : { submitted: false }
                        };
                        
                        console.log(`Processed assignment for student:`, {
                            id: processedAssignment._id,
                            title: processedAssignment.title,
                            dueDate: processedAssignment.dueDate,
                            isObject: typeof processedAssignment === 'object'
                        });
                        
                        return processedAssignment;
                    });
                }
            }
        }

        // Ensure all assignments are properly serialized as plain objects
        const serializedClassrooms = classrooms.map(classroom => {
            const classroomObj = classroom.toObject();
            
            // For students, assignments are already processed, so preserve them
            if (userRole === 'student') {
                // Use the processed assignments directly from the classroom object
                const processedAssignments = classroom.assignments || [];
                console.log('Using processed assignments for student:', processedAssignments.length);
                
                return {
                    ...classroomObj,
                    assignments: processedAssignments.map(assignment => {
                        // Ensure each assignment is a plain object with proper serialization
                        const assignmentObj = assignment.toObject ? assignment.toObject() : assignment;
                        console.log('Serializing assignment:', assignmentObj.title, assignmentObj.dueDate);
                        return {
                            ...assignmentObj,
                            _id: assignmentObj._id.toString(), // Convert ObjectId to string
                            classroom: assignmentObj.classroom?.toString() || assignmentObj.classroom,
                            teacher: assignmentObj.teacher?.toString() || assignmentObj.teacher
                        };
                    })
                };
            } else {
                // For teachers, convert assignments to plain objects
                return {
                    ...classroomObj,
                    assignments: (classroom.assignments || []).map(assignment => {
                        const assignmentObj = assignment.toObject ? assignment.toObject() : assignment;
                        return {
                            ...assignmentObj,
                            _id: assignmentObj._id.toString(), // Convert ObjectId to string
                            classroom: assignmentObj.classroom?.toString() || assignmentObj.classroom,
                            teacher: assignmentObj.teacher?.toString() || assignmentObj.teacher
                        };
                    })
                };
            }
        });

        console.log('Final classrooms being sent to client:', serializedClassrooms.map(c => ({
            name: c.name,
            assignmentCount: c.assignments?.length || 0,
            assignments: c.assignments?.map(a => ({ 
                id: a._id, 
                title: a.title, 
                dueDate: a.dueDate,
                isObject: typeof a === 'object',
                keys: Object.keys(a || {})
            })) || []
        })));
        
        // Log the actual assignment objects being sent
        console.log('Actual assignment objects being sent:', JSON.stringify(serializedClassrooms[0]?.assignments?.[0], null, 2));
        console.log('First assignment keys:', Object.keys(serializedClassrooms[0]?.assignments?.[0] || {}));
        console.log('First assignment title:', serializedClassrooms[0]?.assignments?.[0]?.title);
        console.log('First assignment dueDate:', serializedClassrooms[0]?.assignments?.[0]?.dueDate);

        res.json({
            success: true,
            classrooms: serializedClassrooms
        });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classrooms'
        });
    }
};

// Join classroom by class code (students only)
const joinClassroomByCode = async (req, res) => {
    try {
        const { classCode } = req.body;
        const userId = req.user._id;

        if (req.user.role === 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Teachers cannot join classrooms as students'
            });
        }

        const classroom = await Classroom.findOne({ classCode })
            .populate('teacher', 'name email')
            .populate('students', 'name email');

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Invalid class code'
            });
        }

        // Check if student is already enrolled
        if (classroom.students.some(student => student._id.toString() === userId.toString())) {
            return res.status(400).json({
                success: false,
                message: 'You are already enrolled in this classroom'
            });
        }

        // Add student to classroom
        classroom.students.push(userId);
        await classroom.save();

        // Populate the updated classroom
        await classroom.populate('teacher', 'name email');
        await classroom.populate('students', 'name email');

        res.json({
            success: true,
            message: 'Successfully joined classroom',
            classroom
        });
    } catch (error) {
        console.error('Error joining classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join classroom'
        });
    }
};

// Join classroom (students only)
const joinClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        if (req.user.role === 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Teachers cannot join classrooms as students'
            });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Check if student is already enrolled
        if (classroom.students.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'You are already enrolled in this classroom'
            });
        }

        classroom.students.push(userId);
        await classroom.save();

        res.json({
            success: true,
            message: 'Successfully joined classroom'
        });
    } catch (error) {
        console.error('Error joining classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join classroom'
        });
    }
};

// Leave classroom (students only)
const leaveClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Remove student from classroom
        classroom.students = classroom.students.filter(
            studentId => studentId.toString() !== userId.toString()
        );
        await classroom.save();

        res.json({
            success: true,
            message: 'Successfully left classroom'
        });
    } catch (error) {
        console.error('Error leaving classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave classroom'
        });
    }
};

// Delete classroom (teachers only)
const deleteClassroom = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Check if user is the teacher of this classroom
        if (classroom.teacher.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the teacher can delete this classroom'
            });
        }

        await Classroom.findByIdAndDelete(classroomId);

        res.json({
            success: true,
            message: 'Classroom deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting classroom:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete classroom'
        });
    }
};

// Helper function to generate unique class code
const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

module.exports = {
    createClassroom,
    getClassroom,
    getMyClassrooms,
    joinClassroomByCode,
    joinClassroom,
    leaveClassroom,
    deleteClassroom
};