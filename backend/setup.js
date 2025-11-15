const fs = require('fs');
const path = require('path');
app.use('/api/materials', require('./routes/materials'));


// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Database
MONGODB_URI=mongodb://127.0.0.1:27017/classroom-clone

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Configuration (Optional - for cloud file storage)
# Get these from https://cloudinary.com/console
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# Server Port
PORT=5000
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('Created .env file with default configuration');
  console.log('Note: Cloudinary is optional. Files will be stored locally if not configured.');
}

console.log('Setup complete!');
