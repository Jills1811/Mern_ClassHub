import React, { useState } from 'react';
import {
  Button,
  Box,
  LinearProgress,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUpload = ({ onUpload, maxFiles = 5 }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      await onUpload(files);
      setFiles([]);
      setProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-input"
        max={maxFiles}
      />
      <label htmlFor="file-input">
        <Button
          component="span"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          sx={{ mb: 2 }}
        >
          Select Files
        </Button>
      </label>

      {files.length > 0 && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Selected files: {files.map(f => f.name).join(', ')}
          </Typography>
          <Button
            onClick={handleUpload}
            variant="contained"
            color="primary"
            disabled={uploading}
          >
            Upload
          </Button>
        </>
      )}

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;