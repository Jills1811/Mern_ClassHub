import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Box,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
  TextField
} from '@mui/material';
import { 
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Class as ClassIcon,
  Edit as EditIcon,
  ExitToApp as ExitToAppIcon,
  GroupAdd as GroupAddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../../utils/Api';

// Color palette for classroom headers
const headerColors = [
  '#00897B', // Teal
  '#E91E63', // Pink
  '#00897B', // Teal
  '#424242', // Dark Grey
  '#1976D2', // Blue
  '#1976D2', // Blue
];

// Icons for classroom headers
const headerIcons = [
  <SchoolIcon key="school" />,
  <BookIcon key="book" />,
  <ClassIcon key="class" />,
  <BookIcon key="book2" />,
  <ClassIcon key="class2" />,
  <EditIcon key="edit" />
];

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leavingClassroom, setLeavingClassroom] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState(false);
  const [joinClassroomDialogOpen, setJoinClassroomDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState('');

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        if (!isAuthenticated) {
          throw new Error('Please login to view your classrooms');
        }

        const response = await API.get('/classrooms/my-classrooms');
        if (response.data.success) {
          setClassrooms(response.data.classrooms);
        }
      } catch (err) {
        console.error('Error fetching classrooms:', err);
        setError(err.message || 'Failed to load classrooms');
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, [isAuthenticated]);

  const getHeaderColor = (index) => {
    return headerColors[index % headerColors.length];
  };

  const getHeaderIcon = (index) => {
    return headerIcons[index % headerIcons.length];
  };

  const handleCardClick = (classroomId) => {
    navigate(`/classroom/${classroomId}`);
  };

  const handleCreateClassroom = () => {
    navigate('/create-classroom');
  };

  const handleMenuOpen = (event, classroom) => {
    event.stopPropagation();
    console.log('=== MENU OPEN DEBUG ===');
    console.log('Opening menu for classroom:', classroom);
    console.log('Classroom ID:', classroom._id);
    console.log('Classroom name:', classroom.name);
    console.log('User role:', user?.role);
    setAnchorEl(event.currentTarget);
    setSelectedClassroom(classroom);
    console.log('Selected classroom set:', classroom);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClassroom(null);
  };

  const handleLeaveClassroom = () => {
    console.log('=== LEAVE CLASSROOM MENU CLICK ===');
    console.log('Selected classroom:', selectedClassroom);
    console.log('User role:', user?.role);
    setAnchorEl(null); // Close menu but keep selectedClassroom
    setLeaveDialogOpen(true);
    console.log('Leave dialog opened');
  };

  const confirmLeaveClassroom = async () => {
    if (!selectedClassroom) {
      console.error('No classroom selected');
      toast.error('No classroom selected');
      return;
    }
    
    try {
      setLeavingClassroom(true);
      console.log('=== LEAVE CLASSROOM DEBUG ===');
      console.log('Selected classroom:', selectedClassroom);
      console.log('Classroom ID:', selectedClassroom._id);
      console.log('Classroom name:', selectedClassroom.name);
      console.log('User role:', user?.role);
      console.log('API URL:', `/classrooms/${selectedClassroom._id}/leave`);
      
      const response = await API.post(`/classrooms/${selectedClassroom._id}/leave`);
      console.log('Leave response:', response);
      console.log('Response data:', response.data);
      
      if (response.data.success) {
        // Remove the classroom from the list
        setClassrooms(classrooms.filter(c => c._id !== selectedClassroom._id));
        setLeaveDialogOpen(false);
        setSelectedClassroom(null);
        toast.success(`Successfully left ${selectedClassroom.name}`);
        console.log('Successfully left classroom');
      } else {
        console.error('Failed to leave classroom:', response.data.message);
        toast.error(response.data.message || 'Failed to leave classroom');
      }
    } catch (error) {
      console.error('=== ERROR LEAVING CLASSROOM ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      toast.error(error.response?.data?.message || 'Error leaving classroom');
    } finally {
      setLeavingClassroom(false);
    }
  };

  const cancelLeaveClassroom = () => {
    setLeaveDialogOpen(false);
    setSelectedClassroom(null);
  };

  const handleDeleteClassroom = () => {
    console.log('=== DELETE CLASSROOM MENU CLICK ===');
    console.log('Selected classroom:', selectedClassroom);
    console.log('User role:', user?.role);
    setAnchorEl(null); // Close menu but keep selectedClassroom
    setDeleteDialogOpen(true);
    console.log('Delete dialog opened');
  };

  const confirmDeleteClassroom = async () => {
    if (!selectedClassroom) {
      console.error('No classroom selected');
      toast.error('No classroom selected');
      return;
    }
    
    try {
      setDeletingClassroom(true);
      console.log('=== DELETE CLASSROOM DEBUG ===');
      console.log('Selected classroom:', selectedClassroom);
      console.log('Classroom ID:', selectedClassroom._id);
      console.log('Classroom name:', selectedClassroom.name);
      console.log('User role:', user?.role);
      console.log('API URL:', `/classrooms/${selectedClassroom._id}`);
      
      const response = await API.delete(`/classrooms/${selectedClassroom._id}`);
      console.log('Delete response:', response);
      console.log('Response data:', response.data);
      
      if (response.data.success) {
        // Remove the classroom from the list
        setClassrooms(classrooms.filter(c => c._id !== selectedClassroom._id));
        setDeleteDialogOpen(false);
        setSelectedClassroom(null);
        toast.success(`Successfully deleted ${selectedClassroom.name}`);
        console.log('Successfully deleted classroom');
      } else {
        console.error('Failed to delete classroom:', response.data.message);
        toast.error(response.data.message || 'Failed to delete classroom');
      }
    } catch (error) {
      console.error('=== ERROR DELETING CLASSROOM ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      toast.error(error.response?.data?.message || 'Error deleting classroom');
    } finally {
      setDeletingClassroom(false);
    }
  };

  const cancelDeleteClassroom = () => {
    setDeleteDialogOpen(false);
    setSelectedClassroom(null);
  };

  const handleJoinClassroom = () => {
    setJoinClassroomDialogOpen(true);
  };

  const handleJoinClassroomSubmit = async () => {
    if (!classCode) {
      toast.error('Please enter a class code.');
      return;
    }

    try {
      const joinResponse = await API.post('/classrooms/join', { classCode });
      if (joinResponse.data.success) {
        toast.success(`Successfully joined ${joinResponse.data.classroom.name}`);
        setJoinClassroomDialogOpen(false);
        setClassCode('');
        // Refresh classrooms list
        const refreshResponse = await API.get('/classrooms/my-classrooms');
        if (refreshResponse.data.success) {
          setClassrooms(refreshResponse.data.classrooms);
        }
      } else {
        toast.error(joinResponse.data.message || 'Failed to join classroom');
      }
    } catch (error) {
      console.error('=== ERROR JOINING CLASSROOM ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      toast.error(error.response?.data?.message || 'Error joining classroom');
    }
  };

  const handleJoinClassroomCancel = () => {
    setJoinClassroomDialogOpen(false);
    setClassCode('');
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
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 500 }}>
          {user?.role === 'teacher' ? 'My Classes' : 'My Enrolled Classes'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {user?.role === 'teacher' 
            ? 'Manage your classrooms and assignments'
            : 'Access your enrolled courses and assignments'
          }
        </Typography>
      </Box>

      {/* Create Classroom Button for Teachers */}
      {user?.role === 'teacher' && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClassroom}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Create Class
          </Button>
        </Box>
      )}

      {/* Join Classroom Button for Students */}
      {user?.role === 'student' && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<GroupAddIcon />}
            onClick={handleJoinClassroom}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Join Classroom
          </Button>
        </Box>
      )}

             {/* Classrooms Grid */}
       <Grid container spacing={3}>
         {classrooms.map((classroom, index) => (
           <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={classroom._id}>
             <Card 
               elevation={2}
               sx={{ 
                 width: 230,
                 height: 230,
                 cursor: 'pointer',
                 transition: 'all 0.3s ease',
                 '&:hover': {
                   elevation: 8,
                   transform: 'translateY(-4px)',
                   boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                 }
               }}
               onClick={() => handleCardClick(classroom._id)}
             >
                             {/* Header */}
               <Box
                 sx={{
                   height: 100,
                   background: `linear-gradient(135deg, ${getHeaderColor(index)} 0%, ${getHeaderColor(index)}dd 100%)`,
                   color: 'white',
                   position: 'relative',
                   p: 2,
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'space-between'
                 }}
               >
                                 {/* Header Content */}
                 <Box>
                   <Typography 
                     variant="h6" 
                     sx={{ 
                       fontWeight: 600,
                       mb: 0.5,
                       textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                     }}
                   >
                     {classroom.name}
                   </Typography>
                   <Typography 
                     variant="body2" 
                     sx={{ 
                       opacity: 0.9,
                       textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                     }}
                   >
                     {classroom.teacher?.name || 'Teacher'}
                   </Typography>
                 </Box>

                {/* Teacher Avatar */}
                <Box sx={{ position: 'absolute', bottom: -20, right: 16 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      bgcolor: getHeaderColor(index)
                    }}
                  >
                    {classroom.teacher?.name?.charAt(0) || 'T'}
                  </Avatar>
                </Box>

                {/* Header Icon */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8,
                  opacity: 0.3
                }}>
                  {getHeaderIcon(index)}
                </Box>
              </Box>

                             {/* Card Body */}
               <CardContent sx={{ pt: 3, pb: 2 }}>
                 <Box sx={{ mb: 2 }}>
                   {classroom.description && (
                     <Typography 
                       variant="body2" 
                       color="text.secondary"
                       sx={{
                         overflow: 'hidden',
                         textOverflow: 'ellipsis',
                         display: '-webkit-box',
                         WebkitLineClamp: 2,
                         WebkitBoxOrient: 'vertical',
                         lineHeight: 1.4
                       }}
                     >
                       {classroom.description}
                     </Typography>
                   )}
                 </Box>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`${classroom.students?.length || 0} students`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                  <Chip 
                    label={`${classroom.assignments?.length || 0} assignments`}
                    size="small"
                    variant="outlined"
                    color="secondary"
                  />
                </Box>

                                 {/* Action Icons */}
                 <Box sx={{ 
                   display: 'flex', 
                   justifyContent: 'flex-end',
                   gap: 1
                 }}>
                   <IconButton 
                     size="small"
                     sx={{ 
                       color: 'text.secondary',
                       '&:hover': { color: 'primary.main' }
                     }}
                     onClick={(e) => handleMenuOpen(e, classroom)}
                   >
                     <MoreVertIcon fontSize="small" />
                   </IconButton>
                 </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Empty State */}
        {classrooms.length === 0 && (
          <Grid item xs={12}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 6, 
                textAlign: 'center',
                borderRadius: 2
              }}
            >
              <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                {user?.role === 'teacher' ? 'No classes yet' : 'No enrolled classes'}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {user?.role === 'teacher' 
                  ? 'Create your first class to get started!'
                  : 'Join a class using a class code to get started!'
                }
              </Typography>
              {user?.role === 'teacher' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateClassroom}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 3,
                    py: 1
                  }}
                >
                  Create Your First Class
                </Button>
              )}
            </Paper>
          </Grid>
                 )}
       </Grid>

       {/* Classroom Options Menu */}
       <Menu
         anchorEl={anchorEl}
         open={Boolean(anchorEl)}
         onClose={handleMenuClose}
         onClick={(e) => e.stopPropagation()}
         PaperProps={{
           elevation: 3,
           sx: {
             overflow: 'visible',
             filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
             mt: 1.5,
             '& .MuiMenuItem-root': {
               px: 2,
               py: 1.5,
             },
           },
         }}
         transformOrigin={{ horizontal: 'right', vertical: 'top' }}
         anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
               >
          {user?.role === 'student' && selectedClassroom && (
            <MenuItem onClick={handleLeaveClassroom} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Leave Classroom</ListItemText>
            </MenuItem>
          )}
          {user?.role === 'teacher' && (
            <MenuItem onClick={handleDeleteClassroom} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Delete Classroom</ListItemText>
            </MenuItem>
          )}
        </Menu>

               {/* Leave Classroom Confirmation Dialog */}
        <Dialog
          open={leaveDialogOpen}
          onClose={cancelLeaveClassroom}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Leave Classroom
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to leave "{selectedClassroom?.name}"? 
              You will no longer have access to this classroom and its assignments.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelLeaveClassroom} disabled={leavingClassroom}>
              Cancel
            </Button>
            <Button 
              onClick={confirmLeaveClassroom} 
              color="error" 
              variant="contained"
              disabled={leavingClassroom}
            >
              {leavingClassroom ? 'Leaving...' : 'Leave Classroom'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Classroom Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDeleteClassroom}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Delete Classroom
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedClassroom?.name}"? 
              This action cannot be undone and will permanently remove the classroom and all its assignments.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDeleteClassroom} disabled={deletingClassroom}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDeleteClassroom} 
              color="error" 
              variant="contained"
              disabled={deletingClassroom}
            >
              {deletingClassroom ? 'Deleting...' : 'Delete Classroom'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Join Classroom Dialog */}
        <Dialog
          open={joinClassroomDialogOpen}
          onClose={handleJoinClassroomCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Join Classroom</DialogTitle>
          <DialogContent>
            <TextField
              label="Class Code"
              fullWidth
              margin="normal"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleJoinClassroomCancel}>Cancel</Button>
            <Button onClick={handleJoinClassroomSubmit} variant="contained">Join</Button>
          </DialogActions>
        </Dialog>
     </Box>
   );
 };

export default Dashboard;