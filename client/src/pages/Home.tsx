import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Emergency, LocalHospital, Speed, Security } from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: 'Fast Response',
      description: 'Quick access to emergency medical services with real-time tracking.'
    },
    {
      icon: <LocalHospital sx={{ fontSize: 40 }} />,
      title: 'Hospital Integration',
      description: 'Seamless connection with nearby hospitals and medical facilities.'
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Reliable',
      description: 'Your safety and privacy are our top priorities.'
    }
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Hero Section */}
      <Paper
        elevation={3}
        sx={{
          p: 6,
          mb: 6,
          background: 'linear-gradient(45deg, #e53935 30%, #ff1744 90%)',
          color: 'white',
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h3" component="h1" gutterBottom>
              Emergency Medical Services at Your Fingertips
            </Typography>
            <Typography variant="h6" sx={{ mb: 4 }}>
              Quick access to ambulances and medical assistance when you need it most.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Emergency />}
              onClick={() => navigate('/emergency')}
              sx={{
                backgroundColor: 'white',
                color: '#e53935',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              Request Ambulance
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            {/* Add hero image here */}
          </Grid>
        </Grid>
      </Paper>

      {/* Features Section */}
      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
        Why Choose Us?
      </Typography>
      <Grid container spacing={4}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <Box sx={{ color: '#e53935', mb: 2 }}>
                {feature.icon}
              </Box>
              <Typography variant="h6" component="h3" gutterBottom>
                {feature.title}
              </Typography>
              <Typography color="text.secondary">
                {feature.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Call to Action */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 6,
          textAlign: 'center',
          background: '#f5f5f5',
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          Ready to Get Started?
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Create an account to access all features and save your information for faster emergency response.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/profile')}
        >
          Sign Up Now
        </Button>
      </Paper>
    </Box>
  );
};

export default HomePage; 