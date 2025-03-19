const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, 'Emergency severity is required'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: [
      'pending', // Waiting for ambulance assignment
      'assigned', // Ambulance assigned but not yet en route
      'en_route', // Ambulance on the way to patient
      'arrived_at_patient', // Ambulance reached patient location
      'transporting', // Patient picked up, en route to hospital
      'arrived_at_hospital', // Arrived at hospital
      'completed', // Service completed
      'cancelled' // Emergency cancelled
    ],
    default: 'pending'
  },
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance'
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  location: {
    pickup: {
      address: {
        type: String,
        required: [true, 'Pickup address is required']
      },
      coordinates: {
        lat: {
          type: Number,
          required: [true, 'Pickup latitude is required']
        },
        lng: {
          type: Number,
          required: [true, 'Pickup longitude is required']
        }
      }
    },
    destination: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  symptoms: [String],
  medicalNotes: String,
  emergencyType: {
    type: String,
    enum: [
      'accident', 'cardiac', 'respiratory', 'neurological', 
      'burn', 'pregnancy', 'trauma', 'other'
    ],
    default: 'other'
  },
  route: {
    distance: {
      text: String, // e.g., "3.2 km"
      value: Number // distance in meters
    },
    duration: {
      text: String, // e.g., "5 mins"
      value: Number // duration in seconds
    },
    polyline: String // encoded polyline for map rendering
  },
  timeline: [{
    status: {
      type: String,
      enum: [
        'emergency_requested',
        'ambulance_assigned',
        'ambulance_en_route',
        'ambulance_arrived_at_patient',
        'patient_picked_up',
        'en_route_to_hospital',
        'arrived_at_hospital',
        'patient_handed_over',
        'emergency_completed',
        'emergency_cancelled'
      ]
    },
    time: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  payment: {
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'free', 'insurance_submitted', 'hospital_covered'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'credit_card', 'insurance', 'hospital_covered', 'free']
    },
    transactionId: String
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  }
}, {
  timestamps: true
});

// Add method to update status with timeline entry
emergencySchema.methods.updateStatus = function(status, notes = '') {
  this.status = status;
  
  // Map the status to timeline status
  const statusMap = {
    'pending': 'emergency_requested',
    'assigned': 'ambulance_assigned',
    'en_route': 'ambulance_en_route',
    'arrived_at_patient': 'ambulance_arrived_at_patient',
    'transporting': 'patient_picked_up',
    'arrived_at_hospital': 'arrived_at_hospital',
    'completed': 'emergency_completed',
    'cancelled': 'emergency_cancelled'
  };
  
  // Add to timeline
  this.timeline.push({
    status: statusMap[status] || status,
    time: new Date(),
    notes
  });
  
  return this.save();
};

// Method to calculate estimated arrival time
emergencySchema.methods.calculateETA = function(currentLocation, destination, mapsClient) {
  // This would use the Google Maps API to calculate ETA
  // Implementation would depend on the specific maps service being used
  // This is a placeholder for the actual implementation
  return {
    duration: {
      text: "15 mins",
      value: 900 // 15 minutes in seconds
    }
  };
};

const Emergency = mongoose.model('Emergency', emergencySchema);

module.exports = Emergency; 