import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Button,
  Chip,
  DialogActions,
  DialogTitle,
  DialogContent,
  TextField,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import {
  School as SchoolIcon,
  ExitToApp as ExitToAppIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  GroupAdd as GroupAddIcon
} from '@mui/icons-material';
import API from '../../utils/Api';
import { toast } from 'react-toastify';

const Enrolled = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [leavingClassroom, setLeavingClassroom] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchClassrooms();
  }, [isAuthenticated, navigate]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await API.get('/classrooms/my-classrooms');
      if (response.data.success) {
        setClassrooms(response.data.classrooms);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setError('Failed to fetch classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, classroom) => {
    setAnchorEl(event.currentTarget);
    setSelectedClassroom(classroom);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClassroom(null);
  };

  const handleLeaveClassroom = () => {
    setLeaveDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClassroom = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmLeaveClassroom = async () => {
    try {
      const response = await API.post(`/classrooms/${selectedClassroom._id}/leave`);
      if (response.data.success) {
        toast.success('Successfully left the classroom');
        fetchClassrooms();
      }
    } catch (error) {
      console.error('Error leaving classroom:', error);
      toast.error('Failed to leave classroom');
    } finally {
      setLeaveDialogOpen(false);
      setSelectedClassroom(null);
    }
  };

  const confirmDeleteClassroom = async () => {
    try {
      const response = await API.delete(`/classrooms/${selectedClassroom._id}`);
      if (response.data.success) {
        toast.success('Classroom deleted successfully');
        fetchClassrooms();
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error('Failed to delete classroom');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedClassroom(null);
    }
  };

  const handleJoinClassroom = () => {
    setJoinDialogOpen(true);
  };

  const handleJoinClassroomSubmit = async () => {
    try {
      const response = await API.post('/classrooms/join', { classCode: joinCode });
      if (response.data.success) {
        toast.success('Successfully joined the classroom');
        setJoinCode('');
        setJoinDialogOpen(false);
        fetchClassrooms();
      }
    } catch (error) {
      console.error('Error joining classroom:', error);
      toast.error(error.response?.data?.message || 'Failed to join classroom');
    }
  };

  const handleCardClick = (classroomId) => {
    navigate(`/classroom/${classroomId}`);
  };

  const getHeaderColor = (index) => {
    const colors = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#ff9800'];
    return colors[index % colors.length];
  };

  const getHeaderIcon = (index) => {
    const icons = [
      <SchoolIcon key="school" />,
      <GroupAddIcon key="group" />,
      <CheckCircleIcon key="check" />,
      <RadioButtonUncheckedIcon key="radio" />
    ];
    return icons[index % icons.length];
  };

  const handleCreateClassroom = () => {
    navigate('/create-classroom');
  };

  const handleJoinClassroomCancel = () => {
    setJoinDialogOpen(false);
    setJoinCode('');
  };

  const cancelLeaveClassroom = () => {
    setLeaveDialogOpen(false);
    setLeavingClassroom(false);
  };

  const cancelDeleteClassroom = () => {
    setDeleteDialogOpen(false);
    setDeletingClassroom(false);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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

  // Safety check for user object
  if (!user || typeof user !== 'object') {
    console.log('User object issue:', { user, type: typeof user, isAuthenticated });
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading user data...</Typography>
      </Box>
    );
  }

  console.log('Rendering Enrolled component with user:', user);

  return (
    <Box sx={{ p: 3 }}>
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

      {/* Classrooms Grid - Full Width */}
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
                    {classroom.subject}
                  </Typography>
                </Box>

                {/* Teacher Avatar */}
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}
                  >
                    {classroom.teacher?.name?.charAt(0) || 'T'}
                  </Avatar>
                </Box>

                {/* Header Icon */}
                <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                  {getHeaderIcon(index)}
                </Box>
              </Box>

              {/* Card Content */}
              <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Teacher Name */}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  {classroom.teacher?.name || 'Unknown Teacher'}
                </Typography>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${classroom.students?.length || 0} students`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                  {classroom.assignments && (
                    <Chip 
                      label={`${classroom.assignments.length} assignments`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Box>

                {/* Action Icons */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 'auto'
                }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, classroom)}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main' }
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Three Dots Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {user?.role === 'student' && (
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
        open={joinDialogOpen}
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
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
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

export default Enrolled;
