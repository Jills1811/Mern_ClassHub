import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import API from '../../utils/Api';
import { toast } from 'react-toastify';

const CreateAssignment = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { id: classroomId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        // Wait for auth to complete
        if (authLoading) return;

        // Check if user is authenticated and has required data
        if (!isAuthenticated || !user?._id) {
          toast.error('Please login again');
          navigate('/login');
          return;
        }

        // Verify if user is a teacher
        if (user.role !== 'teacher') {
          toast.error('Only teachers can create assignments');
          navigate('/dashboard');
          return;
        }

        // Verify classroom exists and user has access
        if (classroomId) {
          const response = await API.get(`/classrooms/${classroomId}`);
          if (!response.data.success) {
            toast.error('Classroom not found');
            navigate('/dashboard');
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Access validation error:', error);
        toast.error('Error accessing classroom');
        navigate('/dashboard');
      }
    };

    validateAccess();
  }, [user, isAuthenticated, authLoading, classroomId, navigate]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: null,
    collectSubmissions: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF file. Only PDF files are allowed.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset file input
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Debug log
    console.log('Submit attempt with:', {
      userId: user?._id,
      classroomId,
      formData
    });

    try {
      if (!user?._id) {
        throw new Error('User not authenticated');
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      if (formData.dueDate) {
        formDataToSend.append('dueDate', formData.dueDate.toISOString());
      }
      formDataToSend.append('teacher', user._id);
      formDataToSend.append('classroom', classroomId);
      formDataToSend.append('collectSubmissions', formData.dueDate ? formData.collectSubmissions : false);

      // Add attachments if any
      attachments.forEach((file, index) => {
        formDataToSend.append('attachments', file);
      });

      const response = await API.post('/assignments', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Assignment created successfully!');
        navigate(`/classroom/${classroomId}`);
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to create assignment';
      console.error('Error creating assignment:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create New Assignment
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            name="title"
            label="Assignment Title"
            required
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
          />

          <TextField
            name="description"
            label="Assignment Description (Optional)"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Due Date (Optional)"
              value={formData.dueDate}
              onChange={(newValue) => {
                console.log('Due date changed:', newValue);
                setFormData({ 
                  ...formData, 
                  dueDate: newValue,
                  collectSubmissions: newValue ? true : false // Auto-enable submissions when due date is set
                });
              }}
              renderInput={(params) => (
                <TextField {...params} fullWidth margin="normal" />
              )}
              minDate={new Date()}
              clearable
            />
          </LocalizationProvider>

          

          {/* Show submissions status based on due date */}
          {console.log('Current dueDate value:', formData.dueDate, 'Boolean check:', !!formData.dueDate)}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {formData.dueDate ? 'Submissions: Enabled (due date set)' : 'Submissions are disabled when no due date is set'}
            </Typography>
          </Box>

          {/* File Upload Section */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Attachments (Optional) - PDF files only
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AttachFileIcon />}
              onClick={() => document.getElementById('file-input').click()}
              sx={{ mb: 2 }}
            >
              Upload PDF
            </Button>
            <input
              type="file"
              id="file-input"
              multiple
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            {attachments.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Selected files:
                </Typography>
                {attachments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => removeAttachment(index)}
                    deleteIcon={<DeleteIcon />}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/classroom/${classroomId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Assignment'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateAssignment;