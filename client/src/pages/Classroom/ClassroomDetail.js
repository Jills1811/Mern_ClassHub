import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Typography,
    Box,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Paper,
    Chip,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    Grid,
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    useTheme
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Group as GroupIcon,
    Assignment as AssignmentIcon,
    Person as PersonIcon,
    Add as AddIcon,
    Announcement as AnnouncementIcon
} from '@mui/icons-material';
import API from '../../utils/Api';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import ClassworkDisplay from '../../components/ClassworkDisplay';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`classroom-tabpanel-${index}`}
            aria-labelledby={`classroom-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const ClassroomDetail = () => {
    const { id } = useParams();
    const theme = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        content: ''
    });
    const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

    const fetchClassroom = useCallback(async () => {
        if (!id || !user) {
            setError('Missing classroom ID or user information');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await API.get(`/classrooms/${id}`);
            
            if (response.data.success) {
                setClassroom(response.data.classroom);
            } else {
                setError(response.data.message || 'Failed to fetch classroom');
            }
        } catch (error) {
            console.error('Error fetching classroom:', error);
            if (error.response?.status === 404) {
                setError('Classroom not found');
            } else if (error.response?.status === 403) {
                setError('Access denied to this classroom');
            } else {
                setError('Failed to load classroom. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        if (id && user) {
            fetchClassroom();
        }
    }, [id, user, fetchClassroom]);

    const refreshClassroom = useCallback(async () => {
        try {
            const response = await API.get(`/classrooms/${id}`);
            if (response.data.success) {
                setClassroom(response.data.classroom);
            }
        } catch (err) {
            console.error('Error refreshing classroom:', err);
        }
    }, [id]);

    // Refresh classroom data when component regains focus
    useEffect(() => {
        const handleFocus = () => {
            if (id && user && classroom) {
                refreshClassroom();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [id, user, classroom, refreshClassroom]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };


    const handleCreateAnnouncement = () => {
        setAnnouncementDialogOpen(true);
    };

    const handleAnnouncementInputChange = (e) => {
        const { name, value } = e.target;
        setAnnouncementForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAnnouncementSubmit = async () => {
        if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
            toast.error('Please fill in both title and content');
            return;
        }

        setCreatingAnnouncement(true);
        try {
            const response = await API.post(`/classrooms/${id}/announcements`, {
                title: announcementForm.title.trim(),
                content: announcementForm.content.trim(),
                author: user._id
            });

            if (response.data.success) {
                toast.success('Announcement created successfully!');
                setAnnouncementDialogOpen(false);
                setAnnouncementForm({ title: '', content: '' });
                // Refresh classroom data to show new announcement
                refreshClassroom();
            } else {
                toast.error(response.data.message || 'Failed to create announcement');
            }
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error(error.response?.data?.message || 'Error creating announcement');
        } finally {
            setCreatingAnnouncement(false);
        }
    };

    const handleAnnouncementCancel = () => {
        setAnnouncementDialogOpen(false);
        setAnnouncementForm({ title: '', content: '' });
    };

    

    const copyClassCode = async () => {
        try {
            await navigator.clipboard.writeText(classroom.classCode || classroom.code);
            toast.success('Class code copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = classroom.classCode || classroom.code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Class code copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!classroom) {
        return (
            <Box sx={{ mt: 4 }}>
                <Alert severity="warning">Classroom not found</Alert>
            </Box>
        );
    }

    const isTeacher = user?.role === 'teacher' && 
        (classroom.teacher?._id === user._id || classroom.teacher === user._id);

    return (
        <Box>
            {/* Classroom Header */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: theme.palette.mode === 'light' ? 'primary.main' : 'primary.main', color: 'primary.contrastText', boxShadow: 'none' }}>
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid item xs={12} md={7}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                                    {classroom.name}
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                                    {classroom.subject}
                                </Typography>
                                {classroom.description && (
                                    <Typography variant="body1" sx={{ opacity: 0.8 }}>
                                        {classroom.description}
                        </Typography>
                                )}
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: { xs: 'flex-start', md: 'flex-end' },
                            height: '100%',
                            justifyContent: 'center'
                        }}>
                            {/* Only show class code for teachers */}
                            {console.log('User object:', user)}
                            {console.log('User role:', user?.role, 'Should show class code:', user?.role === 'teacher')}
                            {user && user.role === 'teacher' && (
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 2,
                                    justifyContent: { xs: 'flex-start', md: 'flex-end' }
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Class Code:
                            </Typography>
                                    <Chip
                                        label={classroom.classCode || classroom.code || 'No Code'}
                                        variant="outlined"
                                        sx={{ 
                                            bgcolor: 'white', 
                                            color: 'primary.main',
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            px: 2,
                                            py: 1,
                                            minHeight: '40px'
                                        }}
                                    />
                                    <Tooltip title="Copy class code">
                                        <IconButton 
                                            onClick={copyClassCode}
                                            sx={{ 
                                                color: 'white',
                                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255, 255, 255, 0.2)'
                                                },
                                                width: 40,
                                                height: 40
                                            }}
                                        >
                                            <CopyIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                            minHeight: 48
                        },
                        '& .Mui-selected': {
                            color: 'primary.main'
                        }
                    }}
                >
                    <Tab label="Stream" />
                    <Tab label="Classwork" />
                    <Tab label="People" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            <TabPanel value={tabValue} index={0}>
                {/* Stream Content */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            Stream
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreateAnnouncement}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 3,
                                py: 1
                            }}
                        >
                            Create Announcement
                        </Button>
                    </Box>
                    
                    {/* Announcements Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
                            Announcements
                        </Typography>
                        {classroom.announcements && classroom.announcements.length > 0 ? (
                            <List>
                                {classroom.announcements.map((announcement, index) => (
                                    <React.Fragment key={announcement._id || index}>
                                        <Paper sx={{ p: 2, mb: 2, bgcolor: theme.palette.mode === 'light' ? 'grey.50' : '#1f1f1f', border: theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)', color: 'text.primary' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: 'primary.main', mt: 0.5 }}>
                                                    <AnnouncementIcon />
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                                        {announcement.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        {announcement.content}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Posted: {new Date(announcement.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            by {announcement.author?.name || 'User'} ({announcement.author?.role || 'Unknown'})
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Paper>
                                        {index < classroom.announcements.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.mode === 'light' ? 'grey.50' : '#1f1f1f', border: theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)' }}>
                                <AnnouncementIcon sx={{ fontSize: 60, color: 'grey.500', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No announcements yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Create your first announcement to keep everyone updated!
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={handleCreateAnnouncement}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        px: 3,
                                        py: 1
                                    }}
                                >
                                    Create Announcement
                                </Button>
                            </Paper>
                        )}
                    </Box>
                    
                    {/* Assignments Section */}
                    {classroom.assignments && classroom.assignments.length > 0 && (
                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main', mb: 2 }}>
                                Recent Assignments
                            </Typography>
                            <List>
                                {classroom.assignments.map((assignment, index) => (
                                    <React.Fragment key={assignment._id || index}>
                                        <Paper 
                                            sx={{ 
                                                p: 2, 
                                                mb: 2, 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease-in-out',
                                        bgcolor: theme.palette.mode === 'light' ? 'grey.50' : '#1f1f1f',
                                        border: theme.palette.mode === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: 3,
                                                    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
                                                }
                                            }}
                                            onClick={() => navigate(`/assignment/${assignment._id}`)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: 'secondary.main', mt: 0.5 }}>
                                                    <AssignmentIcon />
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                            {assignment.title}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {assignment?.dueDate ? `Due ${format(new Date(assignment.dueDate), 'MMM d')}` : 'No due date'}
                                                            </Typography>
                                    {user?.role === 'student' && (
                                        (() => {
                                            const studentId = user?._id;
                                            const mySubmission = assignment?.submissions?.find((s) => {
                                                const sid = s.student?._id || s.student;
                                                return sid && sid.toString() === studentId;
                                            });
                                            const showAssigned = assignment?.collectSubmissions;
                                            if (mySubmission) {
                                                const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;
                                                const submittedAt = mySubmission?.submittedAt ? new Date(mySubmission.submittedAt) : null;
                                                const isLate = due && submittedAt && submittedAt.getTime() > due.getTime();
                                                return isLate ? (
                                                    <Chip label="Late" color="error" size="small" />
                                                ) : (
                                                    <Chip label="Turned in" color="success" size="small" />
                                                );
                                            }
                                            return showAssigned ? (
                                                <Chip label="Assigned" color="warning" size="small" />
                                            ) : null;
                                        })()
                                    )}
                                                        </Box>
                                                    </Box>
                                                    {assignment.description && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {assignment.description}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                        {assignment.dueDate ? (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                                            </Typography>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                No due date
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Paper>
                                        {index < classroom.assignments.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {/* Classwork Content - Combined Assignments and Materials */}
                <ClassworkDisplay 
                    classroomId={id} 
                    userRole={user?.role}
                    onContentUpdated={refreshClassroom}
                />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                {/* People Content */}
                <Box>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                        People
                    </Typography>
                    
                    {/* Teacher Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Teacher
                        </Typography>
                        <Paper sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                    <PersonIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {classroom.teacher?.name || 'Teacher Name'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {classroom.teacher?.email || 'teacher@email.com'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Box>

                    {/* Students Section */}
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
                            Students ({classroom.students?.length || 0})
                        </Typography>
                        
                        {classroom.students && classroom.students.length > 0 ? (
                            <Paper>
                                <List>
                                    {classroom.students.map((student, index) => (
                                        <React.Fragment key={student._id || index}>
                                            <ListItem>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                                        <PersonIcon />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={student.name || 'Student Name'}
                                                    secondary={student.email || 'student@email.com'}
                                                />
                                            </ListItem>
                                            {index < classroom.students.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Paper>
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                                <GroupIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No students yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {isTeacher ? 'Share the class code with your students to get them enrolled!' : 'No other students have joined yet.'}
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>
            </TabPanel>
            {/* Create Announcement Dialog */}
            <Dialog 
                open={announcementDialogOpen} 
                onClose={handleAnnouncementCancel}
                maxWidth="md" 
                fullWidth
            >

                <DialogTitle>
                    Create New Announcement
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Announcement Title"
                        name="title"
                        value={announcementForm.title}
                        onChange={handleAnnouncementInputChange}
                        margin="normal"
                        required
                        placeholder="e.g., Important Update, Class Reminder, etc."
                    />
                    <TextField
                        fullWidth
                        label="Announcement Content"
                        name="content"
                        value={announcementForm.content}
                        onChange={handleAnnouncementInputChange}
                        margin="normal"
                        required
                        multiline
                        rows={4}
                        placeholder="Write your announcement here..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleAnnouncementCancel}
                        disabled={creatingAnnouncement}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAnnouncementSubmit}
                        variant="contained"
                        disabled={creatingAnnouncement || !announcementForm.title.trim() || !announcementForm.content.trim()}
                        startIcon={creatingAnnouncement ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                        {creatingAnnouncement ? 'Creating...' : 'Create Announcement'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ClassroomDetail;
