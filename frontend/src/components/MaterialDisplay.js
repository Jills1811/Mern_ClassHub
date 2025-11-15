import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Grid,
  Paper,
  Divider
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
  Add as AddIcon
} from '@mui/icons-material';
import { format, isValid } from 'date-fns';

// Safe date formatting function
const formatDate = (date, formatStr) => {
  if (!date) return 'No date';
  const dateObj = new Date(date);
  return isValid(dateObj) ? format(dateObj, formatStr) : 'Invalid date';
};
import API from '../utils/Api';
import MaterialUpload from './MaterialUpload';
import { toast } from 'react-toastify';

const MaterialDisplay = ({ classroomId, userRole, onMaterialDeleted }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lecture_notes', label: 'Lecture Notes' },
    { value: 'practice_assignments', label: 'Practice Assignments' },
    { value: 'resources', label: 'Resources' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'other', label: 'Other' }
  ];

  const types = [
    { value: 'all', label: 'All Types' },
    { value: 'file', label: 'Files' },
    { value: 'link', label: 'Links' },
    { value: 'google_drive', label: 'Google Drive' },
    { value: 'description', label: 'Descriptions' }
  ];

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await API.get(`/materials/classroom/${classroomId}?${params}`);
      if (response.data.success) {
        setMaterials(response.data.materials);
      } else {
        setError('Failed to fetch materials');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  }, [classroomId, filterCategory, filterType]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleMaterialCreated = (newMaterial) => {
    setMaterials(prev => [newMaterial, ...prev]);
    setUploadDialogOpen(false);
  };

  const handleMaterialDeleted = async () => {
    try {
      await API.delete(`/materials/${selectedMaterial._id}`);
      setMaterials(prev => prev.filter(m => m._id !== selectedMaterial._id));
      setDeleteDialogOpen(false);
      setSelectedMaterial(null);
      if (onMaterialDeleted) {
        onMaterialDeleted();
      }
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  const handleToggleVisibility = async (material) => {
    try {
      await API.put(`/materials/${material._id}`, {
        isPublished: !material.isPublished
      });
      setMaterials(prev => prev.map(m => 
        m._id === material._id 
          ? { ...m, isPublished: !m.isPublished }
          : m
      ));
    } catch (error) {
      console.error('Error updating material visibility:', error);
    }
  };

  const getMaterialIcon = (type) => {
    switch (type) {
      case 'file':
        return <CloudUploadIcon />;
      case 'link':
        return <LinkIcon />;
      case 'google_drive':
        return <GoogleDriveIcon />;
      case 'description':
        return <DescriptionIcon />;
      default:
        return <DescriptionIcon />;
    }
  };


  const handleDownload = async (material) => {
    if (material.type !== 'file' || !material.content.file) {
      toast.error('File not available');
      return;
    }

    const file = material.content.file;
    const rawUrl = file.url || '';
    const filename = file.filename || 'download';

    try {
      const rawBase = (API?.defaults?.baseURL || 'http://localhost:5000/api');
      const apiBase = rawBase.replace(/\/?api\/?$/, '');
      let fileUrl = rawUrl.startsWith('http') ? rawUrl : `${apiBase}${rawUrl}`;

      // Check if it's a Cloudinary URL
      const isCloudinary = /cloudinary\.com/.test(fileUrl);
      
      // Use publicId if available (preferred method)
      if (file.publicId) {
        // First, try using the direct secure_url if available (most reliable)
        if (file.url && file.url.startsWith('http') && /cloudinary\.com/.test(file.url)) {
          // Check if it's a secure_url that we can use directly
          const secureUrlMatch = file.url.match(/https:\/\/res\.cloudinary\.com\/[^\/]+\/(raw|image|video)\/upload\/v\d+\/(.+)/);
          if (secureUrlMatch) {
            // Use the direct secure URL - it should work for downloads
            fileUrl = file.url;
            console.log('Using direct Cloudinary secure_url:', fileUrl);
          } else {
            // Try to get signed URL from backend
            try {
              let format = file.format || (filename || '').split('.').pop();
              let resourceType = file.resourceType || 'raw';
              
              // Clean publicId - remove any extension
              let publicId = file.publicId.replace(/\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|webp)$/i, '');
              
              // Try without format first (Cloudinary auto-detects for raw files)
              let signedResp = await API.get(`/files/download`, {
                params: { publicId, resource_type: resourceType, mode: 'download' }
              });
              
              // If that fails, try with format
              if (!signedResp?.data?.success && format) {
                signedResp = await API.get(`/files/download`, {
                  params: { publicId, resource_type: resourceType, format, mode: 'download' }
                });
              }
              
              if (signedResp?.data?.success && signedResp.data.url) {
                fileUrl = signedResp.data.url;
              } else {
                // Fallback to direct URL
                fileUrl = file.url;
                console.warn('Signed URL failed, using direct URL as fallback');
              }
            } catch (e) {
              console.warn('Backend signing failed, using direct URL:', e);
              fileUrl = file.url;
            }
          }
        } else {
          // No direct URL, try backend signing
          try {
            let format = file.format || (filename || '').split('.').pop();
            let resourceType = file.resourceType || 'raw';
            
            // Clean publicId - remove any extension
            let publicId = file.publicId.replace(/\.(pdf|zip|docx?|xlsx?|pptx?|png|jpe?g|gif|webp)$/i, '');
            
            // Try without format first
            let signedResp = await API.get(`/files/download`, {
              params: { publicId, resource_type: resourceType, mode: 'download' }
            });
            
            // If that fails, try with format
            if (!signedResp?.data?.success && format) {
              signedResp = await API.get(`/files/download`, {
                params: { publicId, resource_type: resourceType, format, mode: 'download' }
              });
            }
            
            if (signedResp?.data?.success && signedResp.data.url) {
              fileUrl = signedResp.data.url;
            } else {
              const errorMsg = signedResp?.data?.message || signedResp?.data?.error?.message || 'Failed to get signed URL';
              console.error('Cloudinary download failed:', { 
                publicId, 
                originalPublicId: file.publicId,
                format, 
                resourceType, 
                error: errorMsg
              });
              throw new Error(errorMsg);
            }
          } catch (e) {
            console.error('Cloudinary URL signing failed:', e);
            toast.error(e.message || 'Failed to download file. Please try again.');
            return;
          }
        }
      } else if (isCloudinary) {
        // Fallback: try to extract from URL if publicId not available
        try {
          // Prefer the secure_url already stored on the file
          if (file.url && file.url.startsWith('http')) {
            fileUrl = file.url;
          }

          let format = file.format || (filename || '').split('.').pop();
          let resourceType = file.resourceType || (file.fileType && file.fileType.startsWith('image') ? 'image' : (file.fileType && file.fileType.startsWith('video') ? 'video' : 'raw'));

          // Extract from URL when structured fields are missing
          const typeMatch = fileUrl.match(/\/(raw|image|video)\/upload\//);
          resourceType = typeMatch ? typeMatch[1] : resourceType || 'raw';
          const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.(\w+)$/);
          let publicId = match && match[1] ? match[1] : undefined;
          format = match && match[2] ? match[2] : format;

          if (publicId) {
            // Ensure we do NOT include extension in publicId
            publicId = publicId.replace(/\.(pdf|zip|docx?|png|jpe?g|gif|webp)$/i, '');
            
            // Get signed URL from backend
            const signedResp = await API.get(`/files/download`, {
              params: { publicId, resource_type: resourceType, format, mode: 'download' }
            });
            
            if (signedResp?.data?.success && signedResp.data.url) {
              fileUrl = signedResp.data.url;
            } else {
              throw new Error(signedResp?.data?.message || 'Failed to get signed URL');
            }
          }
        } catch (e) {
          console.warn('Cloudinary URL extraction/signing failed:', e);
          // Fall through to try direct URL
        }
      }

      // For Cloudinary or cross-origin URLs, use anchor download
      const isCrossOrigin = !fileUrl.startsWith(apiBase);
      if (isCloudinary || isCrossOrigin) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For same-origin files, try blob download
      try {
        const response = await fetch(fileUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.warn('Blob download failed, falling back to direct URL:', error);
        // Fallback: navigate to direct URL
        window.open(fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file. Please try again.');
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
      window.open(url, '_blank');
    }
  };

  const renderMaterialContent = (material) => {
    switch (material.type) {
      case 'file':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              File: {material.content.file?.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Size: {(material.content.file?.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
        );

      case 'link':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Link: {material.content.link?.url}
            </Typography>
            {material.content.link?.title && (
              <Typography variant="body2" gutterBottom>
                {material.content.link.title}
              </Typography>
            )}
          </Box>
        );

      case 'google_drive':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Google Drive: {material.content.googleDrive?.url}
            </Typography>
            {material.content.googleDrive?.title && (
              <Typography variant="body2" gutterBottom>
                {material.content.googleDrive.title}
              </Typography>
            )}
          </Box>
        );

      case 'description':
        return (
          <Typography variant="body2" color="text.secondary">
            {material.content.text}
          </Typography>
        );

      default:
        return null;
    }
  };

  const groupedMaterials = materials.reduce((acc, material) => {
    const category = material.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with filters and add button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Materials ({materials.length})
        </Typography>
        
        {userRole === 'teacher' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Add Material
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              label="Category"
            >
              {categories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Type"
            >
              {types.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
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

      {/* Materials grouped by category */}
      {Object.keys(groupedMaterials).length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No materials found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userRole === 'teacher' 
              ? 'Start by adding materials to share with your students'
              : 'No materials have been shared yet'
            }
          </Typography>
        </Paper>
      ) : (
        <Box>
          {Object.entries(groupedMaterials).map(([category, categoryMaterials]) => (
            <Box key={category} mb={4}>
              <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                {categories.find(c => c.value === category)?.label || category.replace('_', ' ')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {categoryMaterials.map((material) => (
                  <Grid item xs={12} md={6} lg={4} key={material._id}>
                    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getMaterialIcon(material.type)}
                            <Typography variant="h6" component="h3" noWrap>
                              {material.title}
                            </Typography>
                          </Box>
                          
                          {userRole === 'teacher' && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setAnchorEl(e.currentTarget);
                                setSelectedMaterial(material);
                              }}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          )}
                        </Box>

                        {material.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {material.description}
                          </Typography>
                        )}

                        {renderMaterialContent(material)}

                        <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                          <Chip
                            label={material.type.replace('_', ' ')}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={formatDate(material.createdAt, 'MMM dd, yyyy')}
                            size="small"
                            variant="outlined"
                          />
                          {!material.isPublished && (
                            <Chip
                              label="Draft"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {material.tags && material.tags.length > 0 && (
                          <Box mt={1}>
                            {material.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </CardContent>

                      <CardActions>
                        {material.type === 'file' && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(material)}
                          >
                            Download
                          </Button>
                        )}
                        
                        {(material.type === 'link' || material.type === 'google_drive') && (
                          <Button
                            size="small"
                            startIcon={<OpenInNewIcon />}
                            onClick={() => handleOpenLink(material)}
                          >
                            Open
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
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
        <MenuItem onClick={() => {
          setAnchorEl(null);
          handleToggleVisibility(selectedMaterial);
        }}>
          {selectedMaterial?.isPublished ? (
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
        <DialogTitle>Delete Material</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedMaterial?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMaterialDeleted} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialDisplay;
