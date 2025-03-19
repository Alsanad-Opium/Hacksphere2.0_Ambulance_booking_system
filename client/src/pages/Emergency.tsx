import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { LocationOn, Emergency } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const EmergencyPage: React.FC = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user's location when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setError('Unable to get your location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleEmergencyRequest = async () => {
    if (!location) {
      setError('Please wait while we get your location...');
      return;
    }

    setLoading(true);
    try {
      // Here you would typically make an API call to your backend
      // to request an ambulance
      console.log('Emergency request sent with location:', location);
      
      // Navigate to tracking page after successful request
      navigate('/tracking');
    } catch (err) {
      setError('Failed to send emergency request. Please try again.');
      console.error('Emergency request error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Emergency Services
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" color="error">
            Need Emergency Medical Assistance?
          </Typography>
          
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<Emergency />}
            onClick={handleEmergencyRequest}
            disabled={loading || !location}
            sx={{ 
              py: 2, 
              px: 4, 
              fontSize: '1.2rem',
              borderRadius: '50px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'SOS - Request Ambulance'
            )}
          </Button>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Paper>

      {location && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Location
          </Typography>
          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={location}
              zoom={15}
            >
              <Marker
                position={location}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
              />
            </GoogleMap>
          </LoadScript>
        </Paper>
      )}
    </Box>
  );
};

export default EmergencyPage; 