import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  Typography,
  Button,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import API from '../../utils/Api';
import { toast } from 'react-toastify';

const AssignmentDetail = () => {
  const truncateMiddle = (text, maxLength = 48) => {
    if (!text || typeof text !== 'string') return text;
    if (text.length <= maxLength) return text;
    const lastDot = text.lastIndexOf('.');
    const hasExt = lastDot > 0 && lastDot < text.length - 1;
    const ext = hasExt ? text.substring(lastDot) : '';
    const available = maxLength - ext.length - 3; // 3 for '...'
    if (available <= 0) return '...' + ext;
    const startLen = Math.ceil(available / 2);
    const endLen = Math.floor(available / 2);
    const start = text.substring(0, startLen);
    const end = hasExt ? text.substring(lastDot - endLen, lastDot) : text.substring(text.length - endLen);
    return `${start}...${end}${ext}`;
  };
  const formatDate = (value, pattern = 'MMM d') => {
    if (!value) return '—';
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return format(dateObj, pattern);
  };

  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Text submissions disabled; files only
  const [attachments, setAttachments] = useState([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfMenuAnchorEl, setPdfMenuAnchorEl] = useState(null);
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState([]);

  const fetchAssignment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get(`/assignments/${id}`);
      
      if (response.data.success) {
        setAssignment(response.data.assignment);
        // For teachers, fetch classroom roster to compute remaining
        if (user.role === 'teacher' && response.data.assignment?.classroom) {
          try {
            const classroomRef = response.data.assignment.classroom;
            const classroomId = (classroomRef && typeof classroomRef === 'object') ? classroomRef._id : classroomRef;
            const clsRes = await API.get(`/classrooms/${classroomId}`);
            if (clsRes.data?.success) {
              setClassroomStudents(clsRes.data.classroom?.students || []);
            }
          } catch (e) {
            console.error('Failed to fetch classroom roster:', e);
          }
        }
        
        // Check if user has already submitted
        if (user.role === 'student') {
          console.log('Assignment submissions:', response.data.assignment.submissions);
          console.log('Current user ID:', user._id);
          console.log('User role:', user.role);
          
          // Log each submission's student ID for debugging
          if (response.data.assignment.submissions) {
            response.data.assignment.submissions.forEach((sub, index) => {
              const studentId = sub.student?._id || sub.student;
              console.log(`Submission ${index}:`, {
                studentId: sub.student,
                extractedStudentId: studentId,
                studentIdString: studentId?.toString(),
                submittedAt: sub.submittedAt,
                attachments: sub.attachments
              });
            });
          }
          
          const existingSubmission = response.data.assignment.submissions?.find(
            sub => {
              // Handle both cases: student as object or string
              const studentId = sub.student?._id || sub.student;
              return studentId?.toString() === user._id;
            }
          );
          
          console.log('Found existing submission:', existingSubmission);
          
          if (existingSubmission) {
            setSubmission(existingSubmission);
            // ignore any existing text; we only allow files
            setAttachments(existingSubmission.attachments || []);
          } else {
            console.log('No submission found for this user');
            // Try alternative matching methods
            const altMatch = response.data.assignment.submissions?.find(
              sub => {
                const studentId = sub.student?._id || sub.student;
                return studentId === user._id;
              }
            );
            console.log('Alternative match (no toString):', altMatch);
          }
        }
        
        // Fetch comments if any
        setComments(response.data.assignment.comments || []);
      } else {
        setError(response.data.message || 'Failed to fetch assignment');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      if (error.response?.status === 404) {
        setError('Assignment not found');
      } else if (error.response?.status === 403) {
        setError('Access denied to this assignment');
      } else {
        setError('Failed to load assignment. Please try again.');
      }
      } finally {
        setLoading(false);
      }
  }, [id, user]);

  useEffect(() => {
    if (id && user) {
      fetchAssignment();
    }
  }, [id, user, fetchAssignment]);

  const handleSubmitAssignment = async () => {
    if (attachments.length === 0) {
      toast.error('Please attach at least one file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      
      // Add file attachments
      attachments.forEach((file, index) => {
        if (file instanceof File) {
          formData.append('files', file);
        }
      });

      const response = await API.post(`/assignments/${id}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Assignment submitted successfully!');
        setSubmission(response.data.submission || { submittedAt: new Date().toISOString(), attachments });
        fetchAssignment(); // Refresh to get updated data
      } else {
        toast.error(response.data.message || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error(error.response?.data?.message || 'Error submitting assignment');
    } finally {
      setSubmitting(false);
    }
  };


  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteAssignment = async () => {
    try {
      setDeleting(true);
      const response = await API.delete(`/assignments/${id}`);
      
      if (response.data.success) {
        toast.success('Assignment deleted successfully!');
        navigate(-1); // Go back to previous page
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      handleMenuClose();
    }
  };

  const handleEditAssignment = () => {
    // Navigate to edit page (you can create an edit page later)
    navigate(`/assignment/${id}/edit`);
    handleMenuClose();
  };

  const handleDownloadAttachment = (attachment) => {
    if (attachment.url) {
      try {
        // Build absolute URL for backend (works when frontend is on :3000)
        const rawBase = (API?.defaults?.baseURL || 'http://localhost:5000/api');
        const apiBase = rawBase.replace(/\/?api\/?$/, '');
        // If it's a local file, construct the full URL
        const viewUrl = attachment.url.startsWith('http') 
          ? attachment.url 
          : `${apiBase}${attachment.url}`;
        
        console.log('Opening PDF inline viewer:', viewUrl);
        // Open inline viewer dialog
        setPdfUrl(viewUrl);
        setPdfOpen(true);
        
      } catch (error) {
        console.error('Error opening file:', error);
        toast.error('Failed to open file. Please try again.');
      }
    } else {
      toast.error('File URL not available');
    }
  };

  const handleUnsubmit = async () => {
    if (!assignment) return;
    setUnsubmitting(true);
    try {
      const response = await API.post(`/assignments/${id}/unsubmit`);
      if (response.data.success) {
        toast.success('Submission removed');
        setSubmission(null);
        setAttachments([]);
        fetchAssignment();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to unsubmit');
    } finally {
      setUnsubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await API.post(`/assignments/${id}/comments`, {
        text: comment.trim(),
        author: user._id
      });

      if (response.data.success) {
        setComments(prev => [...prev, response.data.comment]);
        setComment('');
        setCommentDialogOpen(false);
        toast.success('Comment added successfully!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment');
    } finally {
      setSubmittingComment(false);
    }
  };


  const isOverdue = assignment && assignment.dueDate && new Date(assignment.dueDate) < new Date();
  const isSubmitted = submission && submission.submittedAt;
  // Teacher grouping: on-time, late, remaining
  const dueDateObj = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  const allSubs = Array.isArray(assignment?.submissions) ? assignment.submissions : [];
  const turnedInOnTime = allSubs.filter(s => {
    if (!dueDateObj) return true; // no due date => treat as on time
    const subDate = s?.submittedAt ? new Date(s.submittedAt) : null;
    if (!subDate) return false;
    return subDate.getTime() <= dueDateObj.getTime();
  });
  const turnedInLate = allSubs.filter(s => {
    if (!dueDateObj) return false; // no late if no due date
    const subDate = s?.submittedAt ? new Date(s.submittedAt) : null;
    if (!subDate) return false;
    return subDate.getTime() > dueDateObj.getTime();
  });
  const submittedStudentIdSet = new Set(allSubs.map(s => (s.student?._id || s.student)?.toString()).filter(Boolean));
  const remainingStudents = (Array.isArray(classroomStudents) ? classroomStudents : []).filter(stu => !submittedStudentIdSet.has((stu?._id || stu)?.toString()));
  
  // Debug logging
  console.log('Current submission state:', submission);
  console.log('Is submitted:', isSubmitted);

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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!assignment) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="warning">Assignment not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: theme.palette.mode === 'light' ? 'background.default' : '#1a1a1a',
      color: 'text.primary'
    }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Grid container spacing={4}>
        {/* Main Content - Left Side */}
        <Grid item xs={12} md={8}>
            {/* Assignment Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
                  <AssignmentIcon />
              </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assignment.teacher?.name || 'Teacher'} • {formatDate(assignment.createdAt, 'MMM d')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {user.role === 'teacher' && (
                  <IconButton 
                    size="small" 
                    sx={{ mb: 1 }}
                    onClick={handleMenuOpen}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
                <Typography variant="body2" color="text.secondary">
                  {assignment.dueDate ? `Due ${formatDate(assignment.dueDate, 'MMM d')}` : 'No due date'}
                </Typography>
              </Box>
            </Box>

            {/* Assignment Description */}
            {assignment.description && (
              <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 4, fontSize: '1rem' }}>
                {assignment.description}
              </Typography>
            )}

            {/* Attachments */}
            {assignment.attachments && assignment.attachments.length > 0 && (
            <Box sx={{ mb: 4 }}>
                {assignment.attachments.map((attachment, index) => {
                  console.log('Attachment data:', attachment);
                  return (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2, 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 2,
                    width: '100%'
                  }}>
                    <AttachFileIcon sx={{ color: 'text.secondary' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 500, 
                          textDecoration: 'underline', 
                          color: 'text.primary',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        {truncateMiddle(attachment.filename, 48)}
              </Typography>
                        
            </Box>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownloadAttachment(attachment)}
                      sx={{ borderColor: 'divider', flexShrink: 0 }}
                      variant="outlined"
                    >
                      View
                    </Button>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Class Comments */}
                      <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CommentIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  Class comments
                        </Typography>
                      </Box>
              <Link
                component="button"
                variant="body2"
                onClick={() => setCommentDialogOpen(true)}
                sx={{ textDecoration: 'underline', color: '#1976d2' }}
              >
                Add a class comment
              </Link>
              
              {comments.length > 0 && (
                <List sx={{ mt: 2 }}>
                  {comments.map((comment, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={comment.author?.name || 'Anonymous'}
                        secondary={
                          <Box component="span">
                            <Typography component="span" variant="body2" color="text.secondary">
                              {comment.text}
                        </Typography>
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {formatDate(comment.createdAt, 'MMM d, yyyy h:mm a')}
                        </Typography>
                    </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
                      </Box>
                    </Box>
              </Grid>

        {/* Right Sidebar - Student Work */}
            {user.role === 'student' && (
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 3, 
              mb: 3, 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Your work
                </Typography>
                {(() => {
                  const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;
                  const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt) : null;
                  const isLate = isSubmitted && due && submittedAt && submittedAt.getTime() > due.getTime();
                  const label = isSubmitted ? (isLate ? 'Late' : 'Turned in') : (assignment.collectSubmissions ? 'Assigned' : 'No submission required');
                  const color = isSubmitted ? (isLate ? 'error.main' : 'success.main') : 'text.secondary';
                  return (
                    <Typography variant="body2" sx={{ fontWeight: 500, color }}>
                      {label}
                    </Typography>
                  );
                })()}
                    </Box>

              {assignment.collectSubmissions ? (
                isSubmitted ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Submitted on {formatDate(submission?.submittedAt, 'MMM d, yyyy h:mm a')}
                    </Typography>
                    {Array.isArray(submission?.attachments) && submission.attachments.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                          Your submitted files:
                        </Typography>
                        {submission.attachments.map((attachment, index) => (
                          <Box key={index} sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2, 
                            p: 2, 
                            border: '1px solid #e0e0e0', 
                            borderRadius: 1,
                            mb: 2,
                            width: '100%'
                          }}>
                            <AttachFileIcon sx={{ color: 'text.secondary' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 500, 
                                  textDecoration: 'underline', 
                              color: 'text.primary',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  '&:hover': {
                                color: 'primary.main'
                                  }
                                }}
                                onClick={() => handleDownloadAttachment(attachment)}
                              >
                                {truncateMiddle(attachment.filename, 48)}
                              </Typography>
                              
                            </Box>
                          <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleDownloadAttachment(attachment)}
                              sx={{ borderColor: 'divider', flexShrink: 0 }}
                            variant="outlined"
                          >
                              View
                          </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={handleUnsubmit}
                      disabled={unsubmitting}
                      sx={{ borderColor: '#e0e0e0', color: 'text.primary' }}
                    >
                      {unsubmitting ? 'Unsubmitting...' : 'Unsubmit'}
                    </Button>
                      </Box>
                ) : (
                  <Box>
                            <Button
                              variant="outlined"
                      startIcon={<AddIcon />}
                      fullWidth
                      sx={{ mb: 2, borderColor: '#e0e0e0', color: 'text.primary' }}
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      Add or create
                            </Button>
                    
                    <input
                      type="file"
                      id="file-input"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />

                    {attachments.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Attachments:
                        </Typography>
                        {attachments.map((file, index) => (
                          <Chip
                            key={index}
                            label={file.name}
                            onDelete={() => removeAttachment(index)}
                            sx={{ mr: 1, mb: 1 }}
                          />
                          ))}
                      </Box>
                    )}
                    {/* Removed text input; submission requires files */}

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSubmitAssignment}
                      disabled={submitting || attachments.length === 0 || isSubmitted}
                      sx={{ mb: 1 }}
                    >
                      {submitting ? 'Submitting...' : (isSubmitted ? 'Turned in' : 'Turn in')}
                    </Button>

                    {isOverdue && (
                      <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
                        Work cannot be turned in after the due date
                      </Typography>
                )}
              </Box>
              )
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    This assignment does not require submission.
                  </Typography>
              </Box>
            )}
            </Box>

            {/* Private comments removed as per requirement */}
        </Grid>
        )}

        {/* Teacher View */}
        {user.role === 'teacher' && (
        <Grid item xs={12} md={4}>
            <Box sx={{ 
              p: 3, 
              border: '1px solid #e0e0e0', 
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Student work
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setSubmissionsOpen(true)} sx={{ color: 'text.primary', borderColor: '#e0e0e0', mb: 2 }}>
                View grouped submissions
              </Button>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Turned in on time ({turnedInOnTime.length})</Typography>
                  {turnedInOnTime.length > 0 ? (
                    <List dense>
                      {turnedInOnTime.map((sub, idx) => (
                        <ListItem key={`on-${idx}`} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#2e7d32', width: 28, height: 28 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={sub.student?.name || 'Student'}
                            secondary={`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No on-time submissions</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Turned in late ({turnedInLate.length})</Typography>
                  {turnedInLate.length > 0 ? (
                    <List dense>
                      {turnedInLate.map((sub, idx) => (
                        <ListItem key={`late-${idx}`} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#d32f2f', width: 28, height: 28 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={sub.student?.name || 'Student'}
                            secondary={`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`}
                          />
                          <Chip label="Late" color="error" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No late submissions</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Remaining ({remainingStudents.length})</Typography>
                  {remainingStudents.length > 0 ? (
                    <List dense>
                      {remainingStudents.map((stu, idx) => (
                        <ListItem key={`rem-${idx}`} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#616161', width: 28, height: 28 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText primary={stu?.name || 'Student'} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="caption" color="text.secondary">No remaining students</Typography>
                  )}
                </Box>
              </Box>
            </Box>
        </Grid>
        )}
      </Grid>
                    
      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
                    <TextField
                      fullWidth
                      multiline
            rows={4}
            placeholder="Write your comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddComment}
            variant="contained"
            disabled={!comment.trim() || submittingComment}
            startIcon={<SendIcon />}
          >
            {submittingComment ? 'Adding...' : 'Add Comment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Preview
            <IconButton size="small" onClick={(e) => setPdfMenuAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '80vh', overflow: 'hidden' }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block' }}
              title="PDF Preview"
            />
          ) : null}
        </DialogContent>

        {/* PDF dialog menu */}
        <Menu
          anchorEl={pdfMenuAnchorEl}
          open={Boolean(pdfMenuAnchorEl)}
          onClose={() => setPdfMenuAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { if (pdfUrl) window.open(pdfUrl, '_blank'); setPdfMenuAnchorEl(null); }}>
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open in new tab</ListItemText>
          </MenuItem>
        </Menu>
      </Dialog>

      {/* Submissions Dialog (Teacher) */}
      <Dialog open={submissionsOpen} onClose={() => setSubmissionsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Student work</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Turned in on time ({turnedInOnTime.length})</Typography>
            {turnedInOnTime.length > 0 ? (
              <List>
                {turnedInOnTime.map((sub, idx) => (
                  <ListItem key={`dlg-on-${idx}`}>
                    <ListItemAvatar>
                      <Avatar><PersonIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={sub.student?.name || 'Student'} secondary={`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No on-time submissions</Typography>
            )}
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Turned in late ({turnedInLate.length})</Typography>
            {turnedInLate.length > 0 ? (
              <List>
                {turnedInLate.map((sub, idx) => (
                  <ListItem key={`dlg-late-${idx}`}>
                    <ListItemAvatar>
                      <Avatar><PersonIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={sub.student?.name || 'Student'} secondary={`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`} />
                    <Chip label="Late" color="error" size="small" />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No late submissions</Typography>
            )}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Remaining ({remainingStudents.length})</Typography>
            {remainingStudents.length > 0 ? (
              <List>
                {remainingStudents.map((stu, idx) => (
                  <ListItem key={`dlg-rem-${idx}`}>
                    <ListItemAvatar>
                      <Avatar><PersonIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={stu?.name || 'Student'} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No remaining students</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Teacher Action Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEditAssignment}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Assignment</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Assignment</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Assignment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this assignment? This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
            onClick={handleDeleteAssignment}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
              </Button>
        </DialogActions>
      </Dialog>
            </Box>
    </Box>
  );
};

export default AssignmentDetail;
