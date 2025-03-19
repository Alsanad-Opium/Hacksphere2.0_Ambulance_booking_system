const { Client } = require('@googlemaps/google-maps-services-js');

// Initialize Google Maps client
const mapsClient = new Client({});

/**
 * Calculate optimized route between two points considering traffic
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Object} Route information including distance, duration, and path
 */
const calculateRoute = async (origin, destination) => {
  try {
    const response = await mapsClient.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Route calculation failed: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance,
      duration: leg.duration,
      duration_in_traffic: leg.duration_in_traffic,
      steps: leg.steps,
      polyline: route.overview_polyline,
      start_location: leg.start_location,
      end_location: leg.end_location
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    throw error;
  }
};

/**
 * Get nearby hospitals based on location
 * @param {Object} location - Location coordinates {lat, lng}
 * @param {number} radius - Search radius in meters
 * @returns {Array} Array of nearby hospitals
 */
const getNearbyHospitals = async (location, radius = 5000) => {
  try {
    const response = await mapsClient.placesNearby({
      params: {
        location: `${location.lat},${location.lng}`,
        radius,
        type: 'hospital',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Nearby search failed: ${response.data.status}`);
    }

    return response.data.results;
  } catch (error) {
    console.error('Error finding nearby hospitals:', error);
    throw error;
  }
};

module.exports = {
  calculateRoute,
  getNearbyHospitals
}; 