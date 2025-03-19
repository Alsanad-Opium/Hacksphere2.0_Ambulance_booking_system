const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  administrators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ambulances: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ambulance'
  }],
  emergencyCapacity: {
    total: {
      type: Number,
      default: 10
    },
    available: {
      type: Number,
      default: 10
    }
  },
  specialties: [{
    type: String,
    enum: [
      'trauma', 'cardiac', 'stroke', 'burns', 'pediatric', 
      'psychiatric', 'obstetric', 'oncology', 'neonatal'
    ]
  }],
  operatingHours: {
    is24Hours: {
      type: Boolean,
      default: true
    },
    weekdays: {
      open: String,
      close: String
    },
    weekend: {
      open: String,
      close: String
    }
  },
  paymentMethods: [{
    type: String,
    enum: ['insurance', 'cash', 'credit_card', 'government_coverage', 'free']
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_maintenance'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Add geospatial index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

// Static method to find nearest hospitals
hospitalSchema.statics.findNearest = function(coordinates, maxDistance = 10000, limit = 5) {
  return this.find({
    status: 'active',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        $maxDistance: maxDistance
      }
    }
  })
  .limit(limit)
  .select('name address location phone emergencyCapacity specialties')
  .lean();
};

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital; 