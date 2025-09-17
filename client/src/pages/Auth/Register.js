import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import API from '../../utils/Api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/register', formData);
      if (response.data.success) {
        // Show success message and redirect to login
        alert('Registration successful! Please login.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Register
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            name="name"
            label="Full Name"
            required
            fullWidth
            value={formData.name}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            name="email"
            type="email"
            label="Email Address"
            required
            fullWidth
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            name="password"
            type="password"
            label="Password"
            required
            fullWidth
            value={formData.password}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            select
            name="role"
            label="Role"
            required
            fullWidth
            value={formData.role}
            onChange={handleChange}
            margin="normal"
            SelectProps={{
              native: true
            }}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </TextField>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={() => navigate('/login')}
            sx={{ mt: 1 }}
          >
            Already have an account? Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
