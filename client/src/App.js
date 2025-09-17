import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ClassroomDetail from './pages/Classroom/ClassroomDetail';
import CreateClassroom from './pages/Classroom/CreateClassroom';
import AssignmentDetail from './pages/Assignment/AssignmentDetail';
import CreateAssignment from './pages/Assignment/CreateAssignment';
import Assignments from './pages/Dashboard/Assignments';
import People from './pages/Dashboard/People';
import Settings from './pages/Dashboard/Settings';

function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, mode } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <AuthenticatedContent />
            <ToastContainer 
              position="top-right" 
              theme={mode === 'light' ? 'light' : 'dark'}
            />
          </div>
        </Router>
      </AuthProvider>
    </MuiThemeProvider>
  );
}

function AuthenticatedContent() {
  const { isAuthenticated } = useAuth();
  const { collapsed } = useSidebar();
  
  return (
    <Box sx={{ display: 'flex' }}>
      <Box 
        sx={{ 
          width: isAuthenticated ? (collapsed ? 64 : 280) : 0, 
          flexShrink: 0,
          transition: 'width 0.2s ease-in-out'
        }} 
      />
      <Box component="main" sx={{ flexGrow: 1, p: 0, mt: '64px' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/assignments" 
            element={
              <ProtectedRoute>
                <Assignments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/people" 
            element={
              <ProtectedRoute>
                <People />
              </ProtectedRoute>
            } 
          />
          {/* Calendar route removed */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-classroom" 
            element={
              <ProtectedRoute>
                <CreateClassroom />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/classroom/:id" 
            element={
              <ProtectedRoute>
                <ClassroomDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/assignment/:id" 
            element={
              <ProtectedRoute>
                <AssignmentDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/classroom/:id/create-assignment" 
            element={
              <ProtectedRoute>
                <CreateAssignment />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;