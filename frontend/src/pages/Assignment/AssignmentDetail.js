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
  // Student submission features temporarily disabled
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const [downloadPrompt, setDownloadPrompt] = useState({ open: false, url: '', filename: '' });
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
        
        // For students, hydrate their existing submission if present
        if (user.role === 'student') {
          const subs = response.data.assignment.submissions || [];
          const existing = subs.find(sub => {
            const sid = sub.student?._id || sub.student;
            return sid && sid.toString() === user._id;
          });
          if (existing) {
            setSubmission(existing);
            setAttachments(existing.attachments || []);
          } else {
            setSubmission(null);
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
      const filesToSend = attachments.filter((f) => f instanceof File);
      if (filesToSend.length === 0) {
        setSubmitting(false);
        toast.error('Please add a new file to upload.');
        return;
      }
      filesToSend.forEach((file) => formData.append('files', file));

      const response = await API.post(`/assignments/${id}/submit`, formData, {
        // Let the browser set correct multipart boundary
        onUploadProgress: (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            if (pct % 10 === 0) console.debug(`Upload progress: ${pct}%`);
          }
        },
        timeout: 30000
      });

      if (response.data.success) {
        toast.success('Assignment submitted successfully!');
        setSubmission(response.data.submission || { submittedAt: new Date().toISOString(), attachments });
        fetchAssignment();
      } else {
        toast.error(response.data.message || 'Failed to submit assignment');
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast.error('Upload timed out. Please try again or use a smaller file.');
      } else {
        toast.error(error.response?.data?.message || 'Error submitting assignment');
      }
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

  const handleDownloadAttachment = async (attachment, options = {}) => {
    const { forceDownload = false } = options;
    if (!attachment?.url) {
      toast.error('File URL not available');
      return;
    }

    try {
        const rawBase = (API?.defaults?.baseURL || 'http://localhost:5000/api');
        const apiBase = rawBase.replace(/\/?api\/?$/, '');
      let fileUrl = attachment.url.startsWith('http')
          ? attachment.url 
          : `${apiBase}${attachment.url}`;
        
      const isPdf = (attachment.fileType && attachment.fileType.includes('pdf')) || /\.pdf$/i.test(attachment.filename || '');
      const isImage = (attachment.fileType && attachment.fileType.startsWith('image')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.filename || '');
      const isZip = (attachment.fileType && attachment.fileType.includes('zip')) || /\.(zip)$/i.test(attachment.filename || '');

      // If the file is hosted on Cloudinary and might be private/authenticated, ask backend for a signed URL
      const isCloudinary = /cloudinary\.com/.test(fileUrl);
      if ((attachment.publicId && attachment.fileType) || (/\/upload\//.test(fileUrl) && isCloudinary)) {
        try {
          // Prefer the secure_url already stored on the attachment for reliability
          if (attachment.url && attachment.url.startsWith('http')) {
            fileUrl = attachment.url;
          }

          // Prefer structured fields if present
          let publicId = attachment.publicId;
          let format = attachment.format || (attachment.filename || '').split('.').pop();
          let resourceTypeFromUrl = attachment.resourceType || (attachment.fileType && attachment.fileType.startsWith('image') ? 'image' : (attachment.fileType && attachment.fileType.startsWith('video') ? 'video' : 'raw'));

          // Fallback: extract from URL when structured fields are missing
          // Examples:
          //  - https://res.cloudinary.com/<cloud>/(raw|image|video)/upload/v123/submissions/abc123.zip
          //  - https://res.cloudinary.com/<cloud>/(raw|image|video)/upload/submissions/abc123.zip (no version)
          if (!publicId) {
            const typeMatch = fileUrl.match(/\/(raw|image|video)\/upload\//);
            resourceTypeFromUrl = typeMatch ? typeMatch[1] : resourceTypeFromUrl || 'raw';
            const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.(\w+)$/);
            publicId = match && match[1] ? match[1] : undefined;
            format = match && match[2] ? match[2] : format;
          }
          if (publicId) {
            // Ensure we do NOT include extension in publicId
            publicId = publicId.replace(/\.(pdf|zip|docx?|png|jpe?g|gif|webp)$/i, '');
            // Only attempt signing if the direct secure_url fails for some reason
            if (!fileUrl || !fileUrl.startsWith('http')) {
              const wantInline = (!forceDownload && (isPdf || isImage)) ? 'inline' : 'download';
              const signedResp = await API.get(`/files/download`, {
                params: { publicId, resource_type: resourceTypeFromUrl, format, mode: wantInline }
              });
              if (signedResp?.data?.success && signedResp.data.url) {
                fileUrl = signedResp.data.url;
              } else {
                throw new Error('Failed to sign Cloudinary URL');
              }
            }
          }
        } catch (e) {
          console.warn('Signing Cloudinary URL failed:', e);
          toast.error('Unable to download file (authorization required).');
          return;
        }
      }

      // Preview behavior: PDFs -> inline dialog, Images -> open in new tab
      if (!forceDownload) {
        if (isPdf) {
          // For students, prefer opening in a new tab to avoid blank iframe issues
          if (user?.role === 'student') {
            window.open(fileUrl, '_blank');
            return;
          }
          // Teachers: show inline dialog preview
          setPdfUrl(fileUrl);
          setPdfOpen(true);
          return;
        }
        if (isImage) {
          window.open(fileUrl, '_blank');
          return;
        }
        // For non-previewables (e.g., zip, docx), show prompt dialog instead of auto download
        setDownloadPrompt({ open: true, url: fileUrl, filename: attachment.filename || 'download' });
        return;
      }

      // For cross-origin (e.g., Cloudinary) or when forcing download, use anchor to avoid CORS issues
      const isCrossOrigin = !fileUrl.startsWith(apiBase);
      if (isCrossOrigin || forceDownload) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.filename || 'download';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      // Same-origin: fetch blob and download
      const response = await fetch(fileUrl, { method: 'GET' });
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.warn('Blob download failed, falling back to direct URL:', error);
      try {
        // Fallback: navigate to direct URL to let browser handle download
        const rawBase = (API?.defaults?.baseURL || 'http://localhost:5000/api');
        const apiBase = rawBase.replace(/\/?api\/?$/, '');
        const fileUrl = attachment.url.startsWith('http')
          ? attachment.url
          : `${apiBase}${attachment.url}`;
        // For PDFs, open in the viewer; others open in a new tab triggering browser download
        const isPdf = (attachment.fileType && attachment.fileType.includes('pdf')) || /\.pdf$/i.test(attachment.filename || '');
        if (isPdf && !forceDownload) {
          setPdfUrl(fileUrl);
          setPdfOpen(true);
    } else {
          window.open(fileUrl, '_blank');
        }
      } catch (e) {
        toast.error('Failed to download file.');
      }
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
      color: 'text.primary',
      overflowX: 'hidden',
      width: '100%'
    }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3, width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Grid container spacing={4} sx={{ width: '100%', margin: 0, overflowX: 'hidden' }}>
        {/* Main Content - Left Side */}
        <Grid item xs={12} md={8} sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', overflowX: 'hidden', boxSizing: 'border-box' }}>
            {/* Assignment Header */}
          <Box sx={{ mb: 4, width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, width: '100%', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 0 }}>
                <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40, flexShrink: 0 }}>
                  <AssignmentIcon />
              </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assignment.teacher?.name || 'Teacher'} • {formatDate(assignment.createdAt, 'MMM d')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                {user.role === 'teacher' && (
                  <IconButton 
                    size="small" 
                    sx={{ mb: 1 }}
                    onClick={handleMenuOpen}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {assignment.dueDate ? `Due ${formatDate(assignment.dueDate, 'MMM d')}` : 'No due date'}
                </Typography>
              </Box>
            </Box>

            {/* Assignment Description */}
            {assignment.description && (
              <Box sx={{ 
                mb: 4, 
                width: '100%', 
                maxWidth: '100%', 
                overflow: 'hidden',
                overflowX: 'hidden',
                boxSizing: 'border-box'
              }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    lineHeight: 1.6, 
                    fontSize: '1rem',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    wordWrap: 'break-word',
                    maxHeight: '4.8rem',
                    boxSizing: 'border-box'
                  }}
                >
                  {assignment.description}
                </Typography>
              </Box>
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
                <Box sx={{ mt: 2 }}>
                  {comments.map((comment, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        mb: index < comments.length - 1 ? 2.5 : 0,
                        border: 'none',
                        borderBottom: 'none',
                        '&::before': { display: 'none' },
                        '&::after': { display: 'none' }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, flexShrink: 0 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {comment.author?.name || 'Anonymous'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {comment.text?.trim().replace(/_/g, '') || ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.createdAt, 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
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
              borderRadius: 3,
              background: `linear-gradient(180deg, ${theme.palette.mode==='light' ? '#ffffff' : '#1f1f1f'} 0%, ${theme.palette.mode==='light' ? '#fafafa' : '#1b1b1b'} 100%)`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
                  Your work
                </Typography>
                {(() => {
                  const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;
                  const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt) : null;
                  const isLate = isSubmitted && due && submittedAt && submittedAt.getTime() > due.getTime();
                  const isOverdue = !isSubmitted && due && due.getTime() < new Date().getTime();
                  const label = isSubmitted ? (isLate ? 'Late' : 'Turned in') : (assignment.collectSubmissions ? (isOverdue ? 'Missing' : 'Assigned') : 'No submission required');
                  const color = isSubmitted ? (isLate ? 'error.main' : 'success.main') : (isOverdue ? 'error.main' : 'text.secondary');
                  return (
                    <Typography variant="body2" sx={{ fontWeight: 600, color, px: 1.25, py: 0.5, borderRadius: 1, backgroundColor: theme.palette.mode==='light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }}>
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
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2, width: '100%' }}>
                            <AttachFileIcon sx={{ color: 'text.secondary' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500, textDecoration: 'underline', color: 'text.primary', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', '&:hover': { color: 'primary.main' } }} onClick={() => handleDownloadAttachment(attachment)}>
                                {truncateMiddle(attachment.filename, 48)}
                              </Typography>
                            </Box>
                            <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownloadAttachment(attachment)} sx={{ borderColor: 'divider', flexShrink: 0 }} variant="outlined">View</Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <Button variant="outlined" fullWidth onClick={handleUnsubmit} disabled={unsubmitting} sx={{ borderColor: '#e0e0e0', color: 'text.primary' }}>{unsubmitting ? 'Unsubmitting...' : 'Unsubmit'}</Button>
                  </Box>
                ) : (
                  <Box>
                    <Button variant="outlined" startIcon={<AddIcon />} fullWidth sx={{
                      mb: 2,
                      borderColor: 'divider',
                      color: 'text.primary',
                      borderRadius: 2,
                      height: 44,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { boxShadow: '0 6px 20px rgba(25,118,210,0.18)' }
                    }} onClick={() => document.getElementById('file-input').click()}>
                      Add or create
                    </Button>
                    <input type="file" id="file-input" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                    {attachments.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'text.secondary' }}>Attachments</Typography>
                        {attachments.map((file, index) => (
                          <Chip key={index} label={file.name} onDelete={() => removeAttachment(index)} sx={{ mr: 1, mb: 1, borderRadius: 1.5, '& .MuiChip-label': { px: 1.25 } }} />
                        ))}
                      </Box>
                    )}
                    <Button variant="contained" fullWidth onClick={handleSubmitAssignment} disabled={submitting || attachments.length === 0 || isSubmitted} sx={{
                      mb: 1,
                      height: 44,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0 10px 20px rgba(25,118,210,0.25)'
                    }}>{submitting ? 'Submitting...' : (isSubmitted ? 'Turned in' : 'Turn in')}</Button>
                    {isOverdue && (<Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>Work cannot be turned in after the due date</Typography>)}
                  </Box>
                )
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>This assignment does not require submission.</Typography>
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
              borderRadius: 3,
              background: `linear-gradient(180deg, ${theme.palette.mode==='light' ? '#ffffff' : '#1f1f1f'} 0%, ${theme.palette.mode==='light' ? '#fafafa' : '#1b1b1b'} 100%)`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
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
                        <ListItem key={`on-${idx}`} sx={{ px: 0, alignItems: 'flex-start' }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#2e7d32', width: 28, height: 28 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={sub.student?.name || 'Student'}
                            secondary={
                              <Box component="span">
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`}
                                </Typography>
                                {Array.isArray(sub.attachments) && sub.attachments.length > 0 && (
                                  <Box component="span" sx={{ mt: 0.5, display: 'block' }}>
                                    {sub.attachments.map((attachment, aIdx) => (
                                      <Box key={aIdx} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                                        <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography
                                          component="span"
                                          variant="body2"
                                          sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                                          onClick={() => handleDownloadAttachment(attachment)}
                                        >
                                          {truncateMiddle(attachment.filename, 36)}
                                        </Typography>
                                        <Button size="small" variant="outlined" onClick={() => handleDownloadAttachment(attachment)} sx={{ borderColor: 'divider', minWidth: 64 }}>
                                          View
                                        </Button>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            }
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
                        <ListItem key={`late-${idx}`} sx={{ px: 0, alignItems: 'flex-start' }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#d32f2f', width: 28, height: 28 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={sub.student?.name || 'Student'}
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {`Submitted ${formatDate(sub.submittedAt, 'MMM d, yyyy h:mm a')}`}
                                </Typography>
                                {Array.isArray(sub.attachments) && sub.attachments.length > 0 && (
                                  <Box sx={{ mt: 0.5 }}>
                                    {sub.attachments.map((attachment, aIdx) => (
                                      <Box key={aIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                                        <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography
                                          variant="body2"
                                          sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                                          onClick={() => handleDownloadAttachment(attachment)}
                                        >
                                          {truncateMiddle(attachment.filename, 36)}
                                        </Typography>
                                        <Button size="small" variant="outlined" onClick={() => handleDownloadAttachment(attachment)} sx={{ borderColor: 'divider', minWidth: 64 }}>
                                          View
                                        </Button>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            }
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

      {/* Download Prompt Dialog for non-previewable files */}
      <Dialog open={downloadPrompt.open} onClose={() => setDownloadPrompt({ open: false, url: '', filename: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Couldn't preview file</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You may be offline or the file type isn't supported for preview. Try downloading instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadPrompt({ open: false, url: '', filename: '' })}>Cancel</Button>
          <Button variant="contained" onClick={() => { const a=document.createElement('a'); a.href=downloadPrompt.url; a.download=downloadPrompt.filename || 'download'; document.body.appendChild(a); a.click(); a.remove(); setDownloadPrompt({ open: false, url: '', filename: '' }); }}>Download</Button>
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
              allow="fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
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
