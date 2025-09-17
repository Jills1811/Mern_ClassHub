import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  Menu,
  MenuItem,
  Collapse,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  Settings as SettingsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import API from '../../utils/Api';

const drawerWidth = 280;
const collapsedDrawerWidth = 64;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [classesOpen, setClassesOpen] = useState(false);
  const [userClassrooms, setUserClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [currentClassroom, setCurrentClassroom] = useState(null);
  const { id } = useParams();

  const fetchCurrentClassroom = useCallback(async () => {
    if (!id) return;
    try {
      const response = await API.get(`/classrooms/${id}`);
      if (response.data.success) {
        setCurrentClassroom(response.data.classroom);
      }
    } catch (error) {
      console.error('Error fetching current classroom:', error);
    }
  }, [id]);

  // Fetch user's classrooms when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserClassrooms();
    }
  }, [isAuthenticated]);

  // Fetch current classroom when id changes
  useEffect(() => {
    if (id && isAuthenticated) {
      fetchCurrentClassroom();
    } else {
      setCurrentClassroom(null);
    }
  }, [id, isAuthenticated, fetchCurrentClassroom]);

  const fetchUserClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      const response = await API.get('/classrooms/my-classrooms');
      if (response.data.success) {
        setUserClassrooms(response.data.classrooms);
      }
    } catch (error) {
      console.error('Error fetching user classrooms:', error);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/login');
  };

  const handleClassesClick = () => {
    setClassesOpen(!classesOpen);
  };

  const handleClassroomClick = (classroomId) => {
    navigate(`/classroom/${classroomId}`);
  };

  // Breadcrumb component
  const HeaderBreadcrumbs = () => {
    if (currentClassroom) {
      return (
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ 
            color: 'white',
            '& .MuiBreadcrumbs-separator': { color: 'white' }
          }}
        >
          <Link
            component="button"
            variant="h6"
            onClick={() => navigate('/dashboard')}
            sx={{
              color: 'white',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Classroom
          </Link>
          <Link
            component="button"
            variant="h6"
            onClick={() => navigate(`/classroom/${currentClassroom._id}`)}
            sx={{
              color: 'white',
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            {currentClassroom.name}
          </Link>
        </Breadcrumbs>
      );
    }

    return (
      <Typography 
        variant="h6" 
        component="div" 
        sx={{ 
          flexGrow: 1,
          cursor: 'pointer',
          '&:hover': {
            textDecoration: 'underline'
          }
        }}
        onClick={() => navigate('/dashboard')}
      >
        Classroom
      </Typography>
    );
  };

  const navigationItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/dashboard' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={handleCollapseToggle}>
          <MenuIcon />
        </IconButton>
        {!collapsed && (
          <Typography variant="h6" component="div">
            Classroom
          </Typography>
        )}
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'initial',
                px: collapsed ? 2 : 3,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon 
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  mr: collapsed ? 0 : 2,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}

        {/* Classes Section - My Classes for teachers, Enrolled for students */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleClassesClick}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 2 : 3,
            }}
          >
            <ListItemIcon 
              sx={{
                minWidth: collapsed ? 0 : 40,
                mr: collapsed ? 0 : 2,
              }}
            >
              <SchoolIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary={user?.role === 'teacher' ? 'My Classes' : 'Enrolled'} />}
            {!collapsed && (classesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
          </ListItemButton>
        </ListItem>

        {/* User Classrooms Collapse */}
        {!collapsed && (
          <Collapse in={classesOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {loadingClassrooms ? (
                <ListItem sx={{ pl: 4 }}>
                  <ListItemText primary="Loading..." />
                </ListItem>
              ) : userClassrooms.length === 0 ? (
                <ListItem sx={{ pl: 4 }}>
                  <ListItemText primary={user?.role === 'teacher' ? 'No classes created yet' : 'No enrolled classes'} />
                </ListItem>
              ) : (
                userClassrooms.map((classroom) => (
                  <ListItem key={classroom._id} disablePadding>
                    <ListItemButton
                      onClick={() => handleClassroomClick(classroom._id)}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar 
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            fontSize: '0.75rem',
                            bgcolor: 'primary.main'
                          }}
                        >
                          {classroom.name.charAt(0)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={classroom.name}
                        secondary={classroom.subject}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </Collapse>
        )}



        <Divider sx={{ my: 2 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={toggleTheme}
            sx={{
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 2 : 3,
            }}
          >
            <ListItemIcon 
              sx={{
                minWidth: collapsed ? 0 : 40,
                mr: collapsed ? 0 : 2,
              }}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Theme" />}
            {!collapsed && (
              <Switch
                checked={mode === 'dark'}
                onChange={toggleTheme}
                edge="end"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const currentDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: isAuthenticated ? `calc(100% - ${currentDrawerWidth}px)` : '100%' },
          ml: { sm: isAuthenticated ? `${currentDrawerWidth}px` : 0 },
          boxShadow: 'none',
        }}
      >
      <Toolbar>
        <IconButton
            color="inherit"
            aria-label="open drawer"
          edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
        >
            <MenuIcon />
        </IconButton>
          <HeaderBreadcrumbs />
          {isAuthenticated && (
          <IconButton
            onClick={handleProfileMenuOpen}
              sx={{ ml: 2 }}
          >
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Logout
          </MenuItem>
        </Menu>

      {/* Sidebar - Only show when authenticated */}
      {isAuthenticated && (
        <Box
          component="nav"
          sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: currentDrawerWidth,
                transition: 'width 0.2s ease-in-out',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}
    </>
  );
};

export default Navbar;