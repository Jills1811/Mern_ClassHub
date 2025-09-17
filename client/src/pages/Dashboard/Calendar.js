import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import API from '../../utils/Api';

const Calendar = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');

  const fetchFullAssignmentDetails = useCallback(async (assignments) => {
    try {
      const updatedAssignments = [...assignments];
      
      for (let i = 0; i < updatedAssignments.length; i++) {
        const assignment = updatedAssignments[i];
        
        // If assignment details are incomplete, fetch the full assignment
        if (!assignment.title || assignment.title === 'Loading...') {
                      try {
              const assignmentResponse = await API.get(`/assignments/${assignment._id}`);
              // The response format is different - it returns the assignment directly
              const fullAssignment = assignmentResponse.data;
              updatedAssignments[i] = {
                ...fullAssignment,
                classroomName: assignment.classroomName,
                classroomSubject: assignment.classroomSubject,
                classroomId: assignment.classroomId
              };
            } catch (error) {
              console.error(`Error fetching assignment ${assignment._id}:`, error);
            }
        }
      }
      
      // For students, filter out assignments that have been submitted after fetching full details
      let filteredAssignments = updatedAssignments;
      if (user?.role === 'student') {
        filteredAssignments = updatedAssignments.filter(assignment => {
          return !assignment.submissionStatus?.submitted;
        });
      }
      
      // Re-sort with full details
      filteredAssignments.sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
        return aDate - bDate;
      });
      
      setAssignments(filteredAssignments);
    } catch (error) {
      console.error('Error fetching full assignment details:', error);
    }
  }, [user?.role]);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // First, get user's classrooms with populated assignments
      const classroomsResponse = await API.get('/classrooms/my-classrooms');
      
      if (!classroomsResponse.data.success) {
        throw new Error('Failed to fetch classrooms');
      }

      const classrooms = classroomsResponse.data.classrooms;
      
      // Debug log
      console.log('Classrooms data:', classrooms);
      console.log('First classroom assignments:', classrooms[0]?.assignments);
      console.log('First assignment details:', classrooms[0]?.assignments?.[0]);
      console.log('Assignment type check:', typeof classrooms[0]?.assignments?.[0]);
      
      // Collect all assignments from all classrooms
      let allAssignments = [];
      
      for (const classroom of classrooms) {
        if (classroom.assignments && classroom.assignments.length > 0) {
                // Check if assignments are populated or just IDs
      const populatedAssignments = classroom.assignments.map(assignment => {
        console.log('Assignment data:', assignment); // Debug log
        console.log('Assignment due date:', assignment.dueDate); // Debug log
        console.log('Assignment title:', assignment.title); // Debug log
        console.log('Assignment type:', typeof assignment); // Debug log
        
        // If assignment is just an ID, we need to fetch its details
        if (typeof assignment === 'string' || !assignment.title) {
          // This is just an ID or missing data, return basic info
          return {
            _id: assignment._id || assignment,
            title: 'Loading...',
            description: 'Loading...',
            dueDate: null,
            points: 0,
            classroomName: classroom.name,
            classroomSubject: classroom.subject,
            classroomId: classroom._id
          };
        } else {
          // Assignment is already populated
          return {
            ...assignment,
            classroomName: classroom.name,
            classroomSubject: classroom.subject,
            classroomId: classroom._id
          };
        }
      });
          allAssignments = [...allAssignments, ...populatedAssignments];
        }
      }

      // For students, filter out assignments that have been submitted
      if (user?.role === 'student') {
        allAssignments = allAssignments.filter(assignment => {
          // If assignment is still loading, keep it
          if (assignment.title === 'Loading...') {
            return true;
          }
          // Filter out submitted assignments
          return !assignment.submissionStatus?.submitted;
        });
      }

      // Sort assignments by due date (closest first), putting invalid dates last
      allAssignments.sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
        return aDate - bDate;
      });
      
      setAssignments(allAssignments);
      
      // Now fetch full details for any assignments that are just IDs
      await fetchFullAssignmentDetails(allAssignments);
      
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, fetchFullAssignmentDetails]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchAssignments();
  }, [isAuthenticated, navigate, fetchAssignments]);

  const getDaysUntilDue = (dueDate) => {
    // Check if dueDate is valid
    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      return 'No due date';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Reset time to start of day
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (isNaN(diffDays) || diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getDueDateColor = (dueDate) => {
    // Check if dueDate is valid
    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      return 'default';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Reset time to start of day
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'error';
    } else if (diffDays <= 3) {
      return 'warning';
    } else {
      return 'success';
    }
  };

  const handleAssignmentClick = (classroomId, assignmentId) => {
    navigate(`/assignment/${assignmentId}`);
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
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={fetchAssignments}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your upcoming assignments and due dates
        </Typography>
      </Box>

      {/* Calendar View */}
      <Grid container spacing={3}>
        {/* Upcoming Assignments */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Upcoming Assignments
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={fetchAssignments}
              >
                Refresh
              </Button>
            </Box>
            
            {assignments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No upcoming assignments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.role === 'teacher' 
                    ? 'Create assignments in your classrooms to see them here'
                    : 'Your teachers haven\'t assigned any work yet'
                  }
                </Typography>
              </Box>
            ) : (
              <Box>
                {assignments.map((assignment) => (
                  <Card 
                    key={assignment._id} 
                    sx={{ 
                      mb: 2, 
                      elevation: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        elevation: 3,
                        transform: 'translateY(-1px)',
                        transition: 'all 0.2s ease'
                      }
                    }}
                    onClick={() => handleAssignmentClick(assignment.classroomId, assignment._id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {assignment.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <SchoolIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                            {assignment.classroomName} - {assignment.classroomSubject}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {assignment.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              label={getDaysUntilDue(assignment.dueDate)}
                              color={getDueDateColor(assignment.dueDate)}
                              size="small"
                              icon={<AccessTimeIcon />}
                            />
                            {assignment.submissionStatus?.submitted && (
                              <Chip
                                label="Submitted"
                                color="success"
                                size="small"
                                variant="outlined"
                              />
                            )}
                                                         <Typography variant="caption" color="text.secondary">
                               Due: {assignment.dueDate && !isNaN(new Date(assignment.dueDate).getTime()) 
                                 ? new Date(assignment.dueDate).toLocaleDateString() 
                                 : 'No due date set'
                               }
                             </Typography>
                            {assignment.points && (
                              <Typography variant="caption" color="text.secondary">
                                Points: {assignment.points}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Chip
                          label="Assignment"
                          color="primary"
                          size="small"
                          icon={<AssignmentIcon />}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SchoolIcon />}
                onClick={() => navigate('/dashboard')}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                View All Classes
              </Button>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                • {assignments.length} {user?.role === 'student' ? 'remaining' : 'total'} assignments
              </Typography>
                             <Typography variant="body2" color="text.secondary">
                 • {assignments.filter(a => {
                   if (!a.dueDate || isNaN(new Date(a.dueDate).getTime())) {
                     return false; // Skip assignments with invalid dates
                   }
                   const today = new Date();
                   today.setHours(0, 0, 0, 0);
                   const due = new Date(a.dueDate);
                   due.setHours(0, 0, 0, 0);
                   return due < today;
                 }).length} overdue
               </Typography>
                             <Typography variant="body2" color="text.secondary">
                 • {assignments.filter(a => {
                   if (!a.dueDate || isNaN(new Date(a.dueDate).getTime())) {
                     return false; // Skip assignments with invalid dates
                   }
                   const due = new Date(a.dueDate);
                   const today = new Date();
                   const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                   return diffDays >= 0 && diffDays <= 7;
                 }).length} due this week
               </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Calendar;
