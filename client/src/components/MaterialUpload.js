import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon
} from '@mui/icons-material';
import API from '../utils/Api';

const MaterialUpload = ({ open, onClose, classroomId, onMaterialCreated }) => {
  const [mode, setMode] = useState('new'); // 'new' | 'old'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'file',
    topic: 'lectures', // <-- added this
    content: '',
    tags: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [linkData, setLinkData] = useState({
    url: '',
    title: '',
    description: ''
  });
  const [newTitles, setNewTitles] = useState([]); // options created via New
  const [selectedTitleId, setSelectedTitleId] = useState('');
  // driveData removed; Google Drive input not used in this simplified flow

  // Removed categories and materialTypes to simplify the UX per requirements

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleLinkDataChange = (e) => {
    const { name, value } = e.target;
    setLinkData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Drive data handler removed

  const topicToCategoryMap = {
    lectures: 'lecture_notes',
    labs: 'practice_assignments',
    resources: 'resources',
    announcements: 'announcements',
    other: 'other'
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'new') {
        // Send simple JSON for New mode
        const payload = {
          title: formData.title,
          description: '',
          type: 'description',
          category: 'other',
          content: ''
        };
        const response = await API.post(`/materials/${classroomId}`, payload);
        if (response.data.success) {
          onMaterialCreated(response.data.material);
          handleClose();
        } else {
          setError(response.data.message || 'Failed to create material');
        }
        return;
      }

      const formDataToSend = new FormData();
      // Common
      formDataToSend.append('title', formData.title);

      {
        // Old mode: ask for name(title), description, optional link, optional pdf
        if (!selectedTitleId) {
          setError('Please select a Title');
          setLoading(false);
          return;
        }
        const hasFile = !!file;
        const hasLink = !!linkData.url?.trim();

        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('category', 'other');
        formDataToSend.append('tags', `group:${selectedTitleId}`);

        if (hasFile) {
          formDataToSend.append('type', 'file');
          formDataToSend.append('file', file);
        } else if (hasLink) {
          formDataToSend.append('type', 'link');
          formDataToSend.append('content', JSON.stringify({
            url: linkData.url,
            title: formData.title,
            description: formData.description || ''
          }));
        } else {
          // Fallback to description-only if neither provided
          formDataToSend.append('type', 'description');
          formDataToSend.append('content', formData.description || '');
        }
      }

      const response = await API.post(`/materials/${classroomId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        onMaterialCreated(response.data.material);
        handleClose();
      } else {
        setError('Failed to create material');
      }
    } catch (error) {
      console.error('Error creating material:', error);
      setError(error.response?.data?.message || 'Failed to create material');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('new');
    setFormData({
      title: '',
      description: '',
      type: 'file',
      category: 'other',
      content: '',
      tags: ''
    });
    setFile(null);
    setLinkData({ url: '', title: '', description: '' });
    // no drive data to reset
    setError('');
    setSelectedTitleId('');
    onClose();
  };

  // Load available New titles when dialog opens or mode switches to Old
  React.useEffect(() => {
    const loadTitles = async () => {
      try {
        const res = await API.get(`/materials/classroom/${classroomId}`);
        if (res.data?.success) {
          const titles = (res.data.materials || []).filter((m) => {
            const isDesc = m.type === 'description';
            const noText = !m.content?.text || m.content.text.trim() === '';
            const noDesc = !m.description || m.description.trim() === '';
            return isDesc && noText && noDesc;
          });
          setNewTitles(titles);
          if (titles.length > 0) setSelectedTitleId((prev) => prev || titles[0]._id);
        }
      } catch (err) {
        // silently ignore
      }
    };
    if (open && mode === 'old') {
      loadTitles();
    }
  }, [open, mode, classroomId]);

  // Dynamic content fields removed; simplified per 'new'/'old' flow

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Add Material</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" gap={1} mb={2}>
            <Button
              variant={mode === 'new' ? 'contained' : 'outlined'}
              onClick={() => setMode('new')}
            >
              New
            </Button>
            <Button
              variant={mode === 'old' ? 'contained' : 'outlined'}
              onClick={() => setMode('old')}
            >
              Old
            </Button>
          </Box>

          {mode === 'old' && (
            <FormControl fullWidth margin="dense" sx={{ mt: 1 }}>
              <InputLabel id="select-title-label">Select Title</InputLabel>
              <Select
                labelId="select-title-label"
                label="Select Title"
                value={selectedTitleId}
                onChange={(e) => setSelectedTitleId(e.target.value)}
                required
              >
                {newTitles.map((t) => (
                  <MenuItem key={t._id} value={t._id}>{t.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            label={mode === 'old' ? 'Name' : 'Title'}
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          {mode === 'old' && (
            <>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={2}
              />

              {/* Optional Link */}
              <TextField
                fullWidth
                label="Link (optional)"
                name="url"
                value={linkData.url}
                onChange={handleLinkDataChange}
                margin="normal"
                placeholder="https://example.com"
              />

              {/* Optional PDF/File */}
              <Box mt={2}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-upload-old"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,.mp4,.mp3,.avi,.mov,.wmv,.jpg,.jpeg,.png,.gif"
                />
                <label htmlFor="file-upload-old">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                  >
                    {file ? file.name : 'Attach PDF / File (optional)'}
                  </Button>
                </label>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formData.title}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : 'Create Material'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MaterialUpload;
