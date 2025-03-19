const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Ambulance type is required'],
    enum: ['basic', 'advanced', 'critical', 'patient-transport', 'neonatal'],
    default: 'basic'
  },
  capacity: {
    type: Number,
    default: 2
  },
  features: [{
    type: String,
    enum: [
      'oxygen', 'ventilator', 'defibrillator', 'ecg', 'wheelchair',
      'stretcher', 'blood_pressure_monitor', 'glucose_monitor'
    ]
  }],
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'maintenance', 'offline'],
    default: 'offline'
  },
  currentLocation: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  lastMaintenanceDate: {
    type: Date
  },
  maintenanceSchedule: {
    type: Date
  },
  // For tracking trips and mileage
  mileage: {
    type: Number,
    default: 0
  },
  activeEmergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency',
    default: null
  },
  // Device token for sending notifications to the ambulance's tablet/device
  deviceToken: String
}, {
  timestamps: true
});

// Index location for geospatial queries
ambulanceSchema.index({ "currentLocation": "2dsphere" });

// Method to update ambulance location
ambulanceSchema.methods.updateLocation = function(lat, lng) {
  this.currentLocation = {
    lat,
    lng,
    updatedAt: new Date()
  };
  return this.save();
};

// Method to find nearest available ambulances
ambulanceSchema.statics.findNearestAvailable = function(coordinates, maxDistance = 10000, limit = 5, type = null) {
  const query = {
    status: 'available',
    'currentLocation.lat': { $exists: true },
    'currentLocation.lng': { $exists: true }
  };
  
  // Add type filter if specified
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .select('registrationNumber type features currentLocation hospital driver')
    .populate('driver', 'name phone')
    .populate('hospital', 'name address')
    .sort({
      'currentLocation.updatedAt': -1 // Most recently updated locations first
    })
    .limit(limit)
    .lean();
};

const Ambulance = mongoose.model('Ambulance', ambulanceSchema);

module.exports = Ambulance; 