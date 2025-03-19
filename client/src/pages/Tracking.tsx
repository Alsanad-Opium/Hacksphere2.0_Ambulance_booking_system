import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, LinearProgress, Grid } from '@mui/material';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { LocalHospital, DirectionsCar, AccessTime } from '@mui/icons-material';

const containerStyle = {
  width: '100%',
  height: '400px'
};

// Mock data - replace with real data from backend
const mockAmbulanceLocation = {
  lat: 1.3521, // Example coordinates
  lng: 103.8198
};

const mockHospitalLocation = {
  lat: 1.3521,
  lng: 103.8198
};

const TrackingPage: React.FC = () => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string>('Calculating...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Mock progress update
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prevProgress + 10;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate directions between ambulance and hospital
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: mockAmbulanceLocation,
        destination: mockHospitalLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
          // Calculate ETA
          const duration = result.routes[0].legs[0].duration?.text || 'Unknown';
          setEta(duration);
        }
      }
    );
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Track Ambulance
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Live Location
            </Typography>
            <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mockAmbulanceLocation}
                zoom={15}
              >
                <Marker
                  position={mockAmbulanceLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  }}
                />
                <Marker
                  position={mockHospitalLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                  }}
                />
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: '#1976d2',
                        strokeWeight: 5,
                      },
                    }}
                  />
                )}
              </GoogleMap>
            </LoadScript>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progress to Hospital
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {progress}%
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DirectionsCar sx={{ mr: 1 }} />
              <Typography>
                Ambulance Status: <strong>En Route</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccessTime sx={{ mr: 1 }} />
              <Typography>
                Estimated Time of Arrival: <strong>{eta}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalHospital sx={{ mr: 1 }} />
              <Typography>
                Destination: <strong>City Hospital</strong>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TrackingPage; 