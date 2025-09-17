import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Group as GroupIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import API from '../../utils/Api';

const People = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          People
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect with teachers and students across your enrolled classrooms
        </Typography>
      </Box>

      {classrooms.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No classrooms yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join or create classrooms to see people here
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {classrooms.map((classroom) => (
            <Grid item xs={12} md={6} key={classroom._id}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SchoolIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h6" component="h3">
                        {classroom.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {classroom.subject}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Teacher */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Teacher
                    </Typography>
                    <ListItem disablePadding>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {classroom.teacher?.name?.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={classroom.teacher?.name || 'Teacher'}
                        secondary={classroom.teacher?.email}
                      />
                      <Chip label="Teacher" size="small" color="primary" />
                    </ListItem>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Students */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Students ({classroom.students?.length || 0})
                    </Typography>
                    {classroom.students && classroom.students.length > 0 ? (
                      <List dense>
                        {classroom.students.slice(0, 3).map((student, index) => (
                          <ListItem key={student._id || index} disablePadding>
                            <ListItemAvatar>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {student.name?.charAt(0).toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={student.name}
                              secondary={student.email}
                            />
                          </ListItem>
                        ))}
                        {classroom.students.length > 3 && (
                          <ListItem disablePadding>
                            <ListItemText
                              primary={`+${classroom.students.length - 3} more students`}
                              sx={{ textAlign: 'center', fontStyle: 'italic' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No students enrolled yet
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default People;
