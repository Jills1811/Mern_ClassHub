import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CardActions,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Divider,
  List,
  Avatar
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  CloudQueue as GoogleDriveIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  MenuBook as MaterialsIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { format, isValid } from 'date-fns';
import API from '../utils/Api';
import MaterialUpload from './MaterialUpload';

// Safe date formatting function
const formatDate = (date, formatStr) => {
  if (!date) return 'No date';
  const dateObj = new Date(date);
  return isValid(dateObj) ? format(dateObj, formatStr) : 'Invalid date';
};

const ClassworkDisplay = ({ classroomId, userRole, onContentUpdated }) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [itemType, setItemType] = useState(''); // 'assignment' or 'material'

  // Dynamic topics based on available content
  const getAvailableTopics = () => {
    const topics = [{ value: 'all', label: 'All topics' }];
    
    // Always include assignments if there are any
    if (assignments.length > 0) {
      topics.push({ value: 'assignments', label: 'Assignments' });
    }
    
    // Add topics for materials that have been created (title materials)
    const titleMaterials = materials.filter(m => {
      const noDesc = !m.description || m.description.trim() === '';
      const noText = !m.content || !m.content.text || m.content.text.trim() === '';
      return m.type === 'description' && noDesc && noText;
    });
    
    titleMaterials.forEach(title => {
      topics.push({ 
        value: `material-${title._id}`, 
        label: title.title 
      });
    });
    
    return topics;
  };

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await API.get(`/assignments/classroom/${classroomId}`);
      if (response.data.success) {
        setAssignments(response.data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  }, [classroomId]);

  const fetchMaterials = useCallback(async () => {
    try {
      const response = await API.get(`/materials/classroom/${classroomId}`);
      if (response.data.success) {
        setMaterials(response.data.materials || []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  }, [classroomId]);

  const fetchAllContent = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAssignments(), fetchMaterials()]);
    } catch (error) {
      setError('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }, [fetchAssignments, fetchMaterials]);

  useEffect(() => {
    fetchAllContent();
  }, [fetchAllContent]);

  const handleMaterialCreated = (newMaterial) => {
    setMaterials(prev => [newMaterial, ...prev]);
    setUploadDialogOpen(false);
    if (onContentUpdated) {
      onContentUpdated();
    }
  };

  const handleItemDeleted = async () => {
    try {
      if (itemType === 'assignment') {
        await API.delete(`/assignments/${selectedItem._id}`);
        setAssignments(prev => prev.filter(a => a._id !== selectedItem._id));
      } else {
        await API.delete(`/materials/${selectedItem._id}`);
        setMaterials(prev => prev.filter(m => m._id !== selectedItem._id));
      }
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      if (onContentUpdated) {
        onContentUpdated();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleVisibility = async (item, type) => {
    try {
      if (type === 'material') {
        await API.put(`/materials/${item._id}`, {
          isPublished: !item.isPublished
        });
        setMaterials(prev => prev.map(m => 
          m._id === item._id 
            ? { ...m, isPublished: !m.isPublished }
            : m
        ));
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  };

  const getItemIcon = (item, type) => {
    if (type === 'assignment') {
      return <AssignmentIcon />;
    }
    
    switch (item.type) {
      case 'file':
        return <CloudUploadIcon />;
      case 'link':
        return <LinkIcon />;
      case 'google_drive':
        return <GoogleDriveIcon />;
      case 'description':
        return <DescriptionIcon />;
      default:
        return <MaterialsIcon />;
    }
  };

  const getItemColor = (item, type) => {
    if (type === 'assignment') {
      return 'secondary.main';
    }
    
    switch (item.category) {
      case 'lecture_notes':
        return 'primary.main';
      case 'practice_assignments':
        return 'secondary.main';
      case 'resources':
        return 'success.main';
      case 'announcements':
        return 'warning.main';
      default:
        return 'grey.500';
    }
  };

  const handleDownload = async (material) => {
    if (material.type !== 'file' || !material.content.file) return;
    const rawUrl = material.content.file.url || '';
    const base = API.defaults.baseURL || '';
    const origin = (() => { try { return new URL(base).origin; } catch { return ''; } })();
    const toAbsolute = (p) => (p.startsWith('http') ? p : `${origin}${p.startsWith('/') ? '' : '/'}${p}`);
    const normalize = (p) => p
      .replace(/\/api\/api\//g, '/api/')
      .replace(/\/uploads\/uploads\//g, '/uploads/');

    const path1 = normalize(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
    const fileOnly = path1.split('/').pop();
    const candidates = [
      toAbsolute(path1)
    ];
    if (path1.startsWith('/uploads/')) {
      candidates.push(toAbsolute(`/api${path1}`));
    }
    if (path1.startsWith('/api/uploads/')) {
      candidates.push(toAbsolute(path1.replace(/^\/api/, '')));
    }
    // Fallbacks if file remained in temp folder
    if (fileOnly) {
      candidates.push(toAbsolute(`/api/uploads/temp/${fileOnly}`));
      candidates.push(toAbsolute(`/uploads/temp/${fileOnly}`));
    }

    const tryDownload = async (url) => {
      const res = await API.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = material.content.file.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    };

    try {
      for (const url of candidates) {
        try {
          await tryDownload(url);
          return;
        } catch {
          // try next
        }
      }
    } catch {
      // No-op
    }
  };

  const handleOpenLink = (material) => {
    let url = '';
    if (material.type === 'link' && material.content.link) {
      url = material.content.link.url;
    } else if (material.type === 'google_drive' && material.content.googleDrive) {
      url = material.content.googleDrive.url;
    }
    
    if (url) {
      const base = API.defaults.baseURL || '';
      const origin = (() => { try { return new URL(base).origin; } catch { return ''; } })();
      const cleanedPath = (() => {
        if (url.startsWith('/api/') && base.endsWith('/api')) return url.replace(/^\/api\//, '/');
        return url.startsWith('/') ? url : `/${url}`;
      })();
      const absolute = url.startsWith('http') ? url : `${origin}${cleanedPath}`;
      window.open(absolute, '_blank');
    }
  };

  // Group content by topics
  const groupedContent = {
    assignments: []
  };

  // Add assignments to appropriate topic
  assignments.forEach(assignment => {
    groupedContent.assignments.push({ ...assignment, itemType: 'assignment' });
  });

  // Group materials by parent Title (created via New)
  const isTitleMaterial = (m) => {
    const noDesc = !m.description || m.description.trim() === '';
    const noText = !m.content || !m.content.text || m.content.text.trim() === '';
    return m.type === 'description' && noDesc && noText;
  };

  const titleMaterials = materials.filter(isTitleMaterial);
  const childMaterialsByTitleId = Object.fromEntries(
    titleMaterials.map((t) => [
      t._id,
      materials.filter((m) => Array.isArray(m.tags) && m.tags.includes(`group:${t._id}`))
    ])
  );

  // Add each title material as its own topic
  titleMaterials.forEach((title) => {
    const topicKey = `material-${title._id}`;
    groupedContent[topicKey] = [{ ...title, itemType: 'material', __isTitleOnly: true }];
  });

  // Filter content based on selected topic
  const filteredContent = filterTopic === 'all' 
    ? groupedContent 
    : { [filterTopic]: groupedContent[filterTopic] || [] };

  const renderContentItem = (item, index) => {
    const isAssignment = item.itemType === 'assignment';
    const isMaterial = item.itemType === 'material';
    // const rawBase = (API?.defaults?.baseURL || 'http://localhost:5000/api');
    // const apiBase = rawBase.replace(/\/?api\/?$/, '');
    
    return (
      <React.Fragment key={`${item.itemType}-${item._id}`}>
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            cursor: isAssignment ? 'pointer' : 'default',
            '&:hover': isAssignment ? { 
              boxShadow: 2,
              transform: 'translateY(-1px)',
              transition: 'all 0.2s ease-in-out'
            } : {}
          }}
          onClick={isAssignment ? () => navigate(`/assignment/${item._id}`) : undefined}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Avatar sx={{ bgcolor: getItemColor(item, item.itemType), mt: 0.5 }}>
              {getItemIcon(item, item.itemType)}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {item.title}
                </Typography>
                
                {userRole === 'teacher' && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent parent click
                      setAnchorEl(e.currentTarget);
                      setSelectedItem(item);
                      setItemType(item.itemType);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </Box>
              {!item.__isTitleOnly && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
              )}

              {isAssignment && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.dueDate ? `Due: ${formatDate(item.dueDate, 'MMM dd, yyyy')}` : 'No due date'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Points: {item.points}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatDate(item.createdAt, 'MMM dd, yyyy')}
                  </Typography>
                  
                </Box>
              )}

              {isMaterial && !item.__isTitleOnly && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                  <Chip
                    label={item.type.replace('_', ' ')}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(item.createdAt, 'MMM dd, yyyy')}
                  </Typography>
                  {!item.isPublished && (
                    <Chip
                      label="Draft"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}

              {/* Assignment attachments preview */}
              

              {/* Children under Title */}
              {item.__isTitleOnly && (
                <Box sx={{ mt: 1 }}>
                  {(childMaterialsByTitleId[item._id] || []).map((child) => (
                    <Paper key={child._id} sx={{ p: 1.5, mb: 1, bgcolor: 'background.default' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: getItemColor(child, 'material'), width: 28, height: 28 }}>
                            {getItemIcon(child, 'material')}
                          </Avatar>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {child.title}
                          </Typography>
                        </Box>
                        <Box>
                          {child.type === 'file' && (
                            <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(child)}>
                              Download
                            </Button>
                          )}
                          {(child.type === 'link' || child.type === 'google_drive') && (
                            <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => handleOpenLink(child)}>
                              Open
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}

              {item.tags && item.tags.length > 0 && !item.__isTitleOnly && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {item.tags.map((tag, tagIndex) => (
                    <Chip
                      key={tagIndex}
                      label={tag}
                      size="small"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Action buttons for materials */}
          {isMaterial && !item.__isTitleOnly && (
            <CardActions sx={{ pt: 0 }}>
              {item.type === 'file' && (
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(item)}
                >
                  Download
                </Button>
              )}
              
              {(item.type === 'link' || item.type === 'google_drive') && (
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => handleOpenLink(item)}
                >
                  Open
                </Button>
              )}
            </CardActions>
          )}
        </Paper>
        {index < (filteredContent[Object.keys(filteredContent)[0]]?.length - 1) && <Divider />}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with filters and add buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Classwork
        </Typography>
        
        {userRole === 'teacher' && (
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<AssignmentIcon />}
              onClick={() => window.location.href = `/classroom/${classroomId}/create-assignment`}
            >
              Create Assignment
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Add Material
            </Button>
          </Box>
        )}
      </Box>

      {/* Topic Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Topic filter</InputLabel>
            <Select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              label="Topic filter"
            >
              {getAvailableTopics().map((topic) => (
                <MenuItem key={topic.value} value={topic.value}>
                  {topic.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Content grouped by topics */}
      {Object.keys(filteredContent).map(topic => {
        const content = filteredContent[topic];
        if (!content || content.length === 0) return null;

        // Get topic label dynamically
        const getTopicLabel = (topicKey) => {
          if (topicKey === 'assignments') return 'Assignments';
          if (topicKey.startsWith('material-')) {
            const materialId = topicKey.replace('material-', '');
            const titleMaterial = titleMaterials.find(t => t._id === materialId);
            return titleMaterial ? titleMaterial.title : 'Material';
          }
          return topicKey;
        };

        return (
          <Box key={topic} mb={4}>
            <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
              {getTopicLabel(topic)}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {content.map((item, index) => renderContentItem(item, index))}
            </List>
          </Box>
        );
      })}

      {/* Empty state */}
      {Object.values(filteredContent).every(content => !content || content.length === 0) && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No classwork yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {userRole === 'teacher' 
              ? 'Start by adding materials and assignments to share with your students'
              : 'Your teacher will post classwork here soon'
            }
          </Typography>
          {userRole === 'teacher' && (
            <Box display="flex" gap={2} justifyContent="center">
              <Button
                variant="outlined"
                startIcon={<AssignmentIcon />}
                onClick={() => window.location.href = `/classroom/${classroomId}/create-assignment`}
              >
                Create Assignment
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Add Material
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Material Upload Dialog */}
      <MaterialUpload
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        classroomId={classroomId}
        onMaterialCreated={handleMaterialCreated}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {itemType === 'material' && (
          <MenuItem onClick={() => {
            setAnchorEl(null);
            handleToggleVisibility(selectedItem, 'material');
          }}>
            {selectedItem?.isPublished ? (
              <>
                <VisibilityOffIcon sx={{ mr: 1 }} />
                Hide from Students
              </>
            ) : (
              <>
                <VisibilityIcon sx={{ mr: 1 }} />
                Show to Students
              </>
            )}
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setDeleteDialogOpen(true);
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete {itemType === 'assignment' ? 'Assignment' : 'Material'}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedItem?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleItemDeleted} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassworkDisplay;
