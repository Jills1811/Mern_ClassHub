const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

// Generates a signed Cloudinary URL for downloading private/raw assets
router.get('/download', auth, async (req, res) => {
  try {
    const { publicId, resource_type = 'raw', format, mode = 'download' } = req.query;
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }

    const publicIdWithFormat = (format ? `${publicId}.${format}` : publicId);
    let url;
    if (mode === 'inline') {
      // Signed inline URL using standard delivery with signature
      url = cloudinary.url(publicIdWithFormat, {
        resource_type,
        sign_url: true,
        secure: true
      });
    } else {
      // Always use private_download_url for downloads (works for image/video/raw restricted assets)
      url = cloudinary.utils.private_download_url(publicId, format || undefined, {
        resource_type,
        attachment: true
      });
    }

    return res.json({ success: true, url });
  } catch (error) {
    console.error('Error generating Cloudinary download URL:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate download URL' });
  }
});

module.exports = router;


