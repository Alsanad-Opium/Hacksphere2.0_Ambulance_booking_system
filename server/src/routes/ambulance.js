const express = require('express');
const { protect, admin, driver, hospitalAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const { ambulanceRules, ambulanceLocationRules, validate } = require('../middlewares/validator');
const Ambulance = require('../models/Ambulance');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

const router = express.Router();

/**
 * @desc    Create a new ambulance
 * @route   POST /api/ambulances
 * @access  Private/Admin/HospitalAdmin
 */
router.post(
  '/',
  protect,
  asyncHandler(async (req, res, next) => {
    // Check if user is admin or hospital admin
    if (req.user.role !== 'admin' && req.user.role !== 'hospital_admin') {
      res.status(403);
      throw new Error('Not authorized to create ambulances');
    }
    next();
  }),
  ambulanceRules,
  validate,
  asyncHandler(async (req, res) => {
    const {
      registrationNumber,
      type,
      capacity,
      features,
      hospital: hospitalId,
      driver: driverId,
      currentLocation
    } = req.body;

    // Check if ambulance already exists
    const ambulanceExists = await Ambulance.findOne({ registrationNumber });
    if (ambulanceExists) {
      res.status(400);
      throw new Error('Ambulance with this registration number already exists');
    }

    // Check if hospital exists
    if (hospitalId) {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        res.status(400);
        throw new Error('Hospital not found');
      }
    }

    // Check if driver exists and is a driver
    if (driverId) {
      const driver = await User.findById(driverId);
      if (!driver) {
        res.status(400);
        throw new Error('Driver not found');
      }
      if (driver.role !== 'driver') {
        res.status(400);
        throw new Error('User is not a driver');
      }
    }

    // Create new ambulance
    const ambulance = await Ambulance.create({
      registrationNumber,
      type,
      capacity,
      features,
      hospital: hospitalId,
      driver: driverId,
      currentLocation,
      status: driverId ? 'available' : 'offline' // Set status based on driver assignment
    });

    // If ambulance is assigned to hospital, add to hospital's ambulances
    if (hospitalId) {
      await Hospital.findByIdAndUpdate(hospitalId, {
        $push: { ambulances: ambulance._id }
      });
    }

    res.status(201).json({
      success: true,
      data: ambulance
    });
  })
);

/**
 * @desc    Get all ambulances
 * @route   GET /api/ambulances
 * @access  Private/Admin/HospitalAdmin
 */
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // Filter criteria
    const filter = {};

    // Hospital admins can only see their hospital's ambulances
    if (req.user.role === 'hospital_admin') {
      // Find hospital where this user is an admin
      const hospital = await Hospital.findOne({ administrators: req.user._id });
      if (!hospital) {
        res.status(404);
        throw new Error('Hospital not found for this admin');
      }
      filter.hospital = hospital._id;
    }

    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by type if provided
    if (req.query.type) {
      filter.type = req.query.type;
    }

    // Execute query
    const ambulances = await Ambulance.find(filter)
      .populate('driver', 'name phone')
      .populate('hospital', 'name address')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: ambulances.length,
      data: ambulances
    });
  })
);

/**
 * @desc    Get ambulance by ID
 * @route   GET /api/ambulances/:id
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const ambulance = await Ambulance.findById(req.params.id)
      .populate('driver', 'name phone')
      .populate('hospital', 'name address')
      .populate('activeEmergency');

    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }

    // Hospital admins can only see their hospital's ambulances
    if (
      req.user.role === 'hospital_admin' &&
      (!ambulance.hospital || ambulance.hospital._id.toString() !== req.user.hospital)
    ) {
      res.status(403);
      throw new Error('Not authorized to view this ambulance');
    }

    res.json({
      success: true,
      data: ambulance
    });
  })
);

/**
 * @desc    Update ambulance
 * @route   PUT /api/ambulances/:id
 * @access  Private/Admin/HospitalAdmin
 */
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res, next) => {
    // Check if user is admin or hospital admin
    if (req.user.role !== 'admin' && req.user.role !== 'hospital_admin') {
      res.status(403);
      throw new Error('Not authorized to update ambulances');
    }
    next();
  }),
  asyncHandler(async (req, res) => {
    const ambulance = await Ambulance.findById(req.params.id);

    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }

    // Hospital admins can only update their hospital's ambulances
    if (
      req.user.role === 'hospital_admin' &&
      (!ambulance.hospital || ambulance.hospital.toString() !== req.user.hospital)
    ) {
      res.status(403);
      throw new Error('Not authorized to update this ambulance');
    }

    // Check if new driver exists and is a driver
    if (req.body.driver) {
      const driver = await User.findById(req.body.driver);
      if (!driver) {
        res.status(400);
        throw new Error('Driver not found');
      }
      if (driver.role !== 'driver') {
        res.status(400);
        throw new Error('User is not a driver');
      }
    }

    // Check if new hospital exists
    if (req.body.hospital) {
      const hospital = await Hospital.findById(req.body.hospital);
      if (!hospital) {
        res.status(400);
        throw new Error('Hospital not found');
      }
      
      // If changing hospital, update both old and new hospital's ambulance lists
      if (ambulance.hospital && ambulance.hospital.toString() !== req.body.hospital) {
        // Remove from old hospital
        await Hospital.findByIdAndUpdate(ambulance.hospital, {
          $pull: { ambulances: ambulance._id }
        });
        
        // Add to new hospital
        await Hospital.findByIdAndUpdate(req.body.hospital, {
          $push: { ambulances: ambulance._id }
        });
      } else if (!ambulance.hospital) {
        // Add to new hospital if no previous hospital
        await Hospital.findByIdAndUpdate(req.body.hospital, {
          $push: { ambulances: ambulance._id }
        });
      }
    }

    // Update ambulance
    const updatedAmbulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    )
      .populate('driver', 'name phone')
      .populate('hospital', 'name address');

    res.json({
      success: true,
      data: updatedAmbulance
    });
  })
);

/**
 * @desc    Delete ambulance
 * @route   DELETE /api/ambulances/:id
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const ambulance = await Ambulance.findById(req.params.id);

    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }

    // If ambulance is assigned to hospital, remove from hospital's ambulances
    if (ambulance.hospital) {
      await Hospital.findByIdAndUpdate(ambulance.hospital, {
        $pull: { ambulances: ambulance._id }
      });
    }

    await ambulance.deleteOne();

    res.json({
      success: true,
      message: 'Ambulance removed successfully'
    });
  })
);

/**
 * @desc    Update ambulance location
 * @route   PUT /api/ambulances/:id/location
 * @access  Private/Driver
 */
router.put(
  '/:id/location',
  protect,
  driver,
  ambulanceLocationRules,
  validate,
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    const ambulance = await Ambulance.findById(req.params.id);
    
    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }
    
    // Only the assigned driver can update location
    if (ambulance.driver.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this ambulance location');
    }
    
    // Update location
    ambulance.currentLocation = {
      lat,
      lng,
      updatedAt: new Date()
    };
    
    await ambulance.save();
    
    // Emit location update event via socket
    if (req.io) {
      req.io.emit('ambulance-location-updated', {
        ambulanceId: ambulance._id,
        location: ambulance.currentLocation
      });
    }
    
    res.json({
      success: true,
      data: {
        location: ambulance.currentLocation
      }
    });
  })
);

/**
 * @desc    Get nearest available ambulances
 * @route   GET /api/ambulances/nearest
 * @access  Private
 */
router.get(
  '/nearest',
  protect,
  asyncHandler(async (req, res) => {
    const { lat, lng, maxDistance = 10000, limit = 5, type } = req.query;
    
    if (!lat || !lng) {
      res.status(400);
      throw new Error('Latitude and longitude are required');
    }
    
    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
    
    // Use the static method to find nearest ambulances
    const ambulances = await Ambulance.findNearestAvailable(
      coordinates,
      parseInt(maxDistance),
      parseInt(limit),
      type
    );
    
    res.json({
      success: true,
      count: ambulances.length,
      data: ambulances
    });
  })
);

/**
 * @desc    Change ambulance status
 * @route   PUT /api/ambulances/:id/status
 * @access  Private/Driver
 */
router.put(
  '/:id/status',
  protect,
  driver,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    if (!status || !['available', 'busy', 'maintenance', 'offline'].includes(status)) {
      res.status(400);
      throw new Error('Valid status is required');
    }
    
    const ambulance = await Ambulance.findById(req.params.id);
    
    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }
    
    // Only the assigned driver can update status
    if (ambulance.driver.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this ambulance status');
    }
    
    // Update status
    ambulance.status = status;
    await ambulance.save();
    
    res.json({
      success: true,
      data: {
        status: ambulance.status
      }
    });
  })
);

module.exports = router; 