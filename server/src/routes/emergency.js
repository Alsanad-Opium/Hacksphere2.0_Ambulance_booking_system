const express = require('express');
const { protect, admin, driver, verified } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const { emergencyRequestRules, validate } = require('../middlewares/validator');
const Emergency = require('../models/Emergency');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { calculateRoute } = require('../config/maps');
const { sendEmergencyConfirmation, notifyDriver } = require('../utils/twilioUtils');

const router = express.Router();

/**
 * @desc    Create emergency request
 * @route   POST /api/emergencies
 * @access  Private/Verified
 */
router.post(
  '/',
  protect,
  verified,
  emergencyRequestRules,
  validate,
  asyncHandler(async (req, res) => {
    const {
      severity,
      location,
      symptoms = [],
      medicalNotes = '',
      emergencyType = 'other'
    } = req.body;

    // Use patient from authenticated user if not specified
    const patientId = req.body.patient || req.user._id;

    // Check if patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    // Create emergency
    const emergency = await Emergency.create({
      patient: patientId,
      requestedBy: req.user._id,
      severity,
      location,
      symptoms,
      medicalNotes,
      emergencyType,
      timeline: [
        {
          status: 'emergency_requested',
          time: new Date(),
          notes: `Emergency requested by ${req.user.name}`
        }
      ]
    });

    // Emit emergency request event via socket
    if (req.io) {
      req.io.emit('new-emergency', {
        emergencyId: emergency._id,
        severity,
        location: location.pickup,
        emergencyType,
        patientName: patient.name
      });
    }

    res.status(201).json({
      success: true,
      data: emergency
    });
  })
);

/**
 * @desc    Get all emergencies
 * @route   GET /api/emergencies
 * @access  Private/Admin
 */
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // Build filter criteria
    const filter = {};

    // Regular users can only see their own emergencies
    if (req.user.role === 'user') {
      filter.$or = [
        { patient: req.user._id },
        { requestedBy: req.user._id }
      ];
    }

    // Drivers can only see emergencies assigned to them
    if (req.user.role === 'driver') {
      // Find ambulances assigned to this driver
      const ambulances = await Ambulance.find({ driver: req.user._id }).select('_id');
      const ambulanceIds = ambulances.map(a => a._id);
      
      filter.ambulance = { $in: ambulanceIds };
    }

    // Hospital admins can only see emergencies for their hospital
    if (req.user.role === 'hospital_admin') {
      const hospitals = await Hospital.find({ administrators: req.user._id }).select('_id');
      const hospitalIds = hospitals.map(h => h._id);
      
      filter.hospital = { $in: hospitalIds };
    }

    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query
    const emergencies = await Emergency.find(filter)
      .populate('patient', 'name phone healthInfo')
      .populate('requestedBy', 'name phone')
      .populate('ambulance', 'registrationNumber type driver')
      .populate('hospital', 'name address phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Emergency.countDocuments(filter);

    res.json({
      success: true,
      count: emergencies.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: emergencies
    });
  })
);

/**
 * @desc    Get emergency by ID
 * @route   GET /api/emergencies/:id
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const emergency = await Emergency.findById(req.params.id)
      .populate('patient', 'name phone healthInfo address emergencyContacts')
      .populate('requestedBy', 'name phone')
      .populate({
        path: 'ambulance',
        select: 'registrationNumber type currentLocation features',
        populate: {
          path: 'driver',
          select: 'name phone'
        }
      })
      .populate('hospital', 'name address phone emergencyCapacity');

    if (!emergency) {
      res.status(404);
      throw new Error('Emergency not found');
    }

    // Check access permissions
    const isAdmin = req.user.role === 'admin';
    const isPatient = emergency.patient._id.toString() === req.user._id.toString();
    const isRequester = emergency.requestedBy._id.toString() === req.user._id.toString();
    const isDriver = emergency.ambulance && emergency.ambulance.driver && 
                  emergency.ambulance.driver._id.toString() === req.user._id.toString();
    const isHospitalAdmin = emergency.hospital && req.user.role === 'hospital_admin' && 
                  (await Hospital.findOne({ _id: emergency.hospital._id, administrators: req.user._id }));

    if (!isAdmin && !isPatient && !isRequester && !isDriver && !isHospitalAdmin) {
      res.status(403);
      throw new Error('Not authorized to access this emergency');
    }

    res.json({
      success: true,
      data: emergency
    });
  })
);

/**
 * @desc    Assign ambulance to emergency
 * @route   PUT /api/emergencies/:id/assign
 * @access  Private/Admin
 */
router.put(
  '/:id/assign',
  protect,
  asyncHandler(async (req, res) => {
    const { ambulanceId, hospitalId } = req.body;

    if (!ambulanceId) {
      res.status(400);
      throw new Error('Ambulance ID is required');
    }

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      res.status(404);
      throw new Error('Emergency not found');
    }

    // Check if user has permission (admin or hospital admin of the assigned hospital)
    const isAdmin = req.user.role === 'admin';
    const isHospitalAdmin = req.user.role === 'hospital_admin' && hospitalId && 
                  (await Hospital.findOne({ _id: hospitalId, administrators: req.user._id }));

    if (!isAdmin && !isHospitalAdmin) {
      res.status(403);
      throw new Error('Not authorized to assign ambulance');
    }

    // Check if ambulance exists and is available
    const ambulance = await Ambulance.findById(ambulanceId).populate('driver', 'name phone');
    if (!ambulance) {
      res.status(404);
      throw new Error('Ambulance not found');
    }

    if (ambulance.status !== 'available') {
      res.status(400);
      throw new Error('Ambulance is not available');
    }

    if (!ambulance.driver) {
      res.status(400);
      throw new Error('Ambulance has no assigned driver');
    }

    // Check if hospital exists
    let hospital = null;
    if (hospitalId) {
      hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        res.status(404);
        throw new Error('Hospital not found');
      }

      // Check hospital capacity
      if (hospital.emergencyCapacity.available <= 0) {
        res.status(400);
        throw new Error('Hospital has no available emergency capacity');
      }
    }

    // Calculate route
    let route = {};
    try {
      const routeResult = await calculateRoute(
        ambulance.currentLocation,
        emergency.location.pickup.coordinates
      );
      route = {
        distance: routeResult.distance,
        duration: routeResult.duration,
        polyline: routeResult.polyline
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      // Continue even if route calculation fails
    }

    // Update emergency
    emergency.ambulance = ambulance._id;
    emergency.status = 'assigned';
    if (hospitalId) {
      emergency.hospital = hospitalId;
    }
    if (Object.keys(route).length > 0) {
      emergency.route = route;
    }

    // Add timeline entry
    emergency.timeline.push({
      status: 'ambulance_assigned',
      time: new Date(),
      notes: `Ambulance ${ambulance.registrationNumber} assigned by ${req.user.name}`
    });

    await emergency.save();

    // Update ambulance status
    ambulance.status = 'busy';
    ambulance.activeEmergency = emergency._id;
    await ambulance.save();

    // If hospital is specified, decrease available capacity
    if (hospital) {
      hospital.emergencyCapacity.available = Math.max(0, hospital.emergencyCapacity.available - 1);
      await hospital.save();
    }

    // Notify patient via SMS
    const patient = await User.findById(emergency.patient);
    if (patient) {
      sendEmergencyConfirmation(patient.phone, {
        registrationNumber: ambulance.registrationNumber,
        eta: route.duration ? route.duration.text : '15-20 minutes'
      }).catch(err => console.error('SMS notification error:', err));
    }

    // Notify driver via SMS
    if (ambulance.driver) {
      notifyDriver(ambulance.driver.phone, {
        severity: emergency.severity,
        address: emergency.location.pickup.address
      }).catch(err => console.error('Driver SMS notification error:', err));
    }

    // Emit assignment event via socket
    if (req.io) {
      req.io.emit('ambulance-assigned', {
        emergencyId: emergency._id,
        ambulanceId: ambulance._id,
        hospitalId: hospital ? hospital._id : null
      });
    }

    res.json({
      success: true,
      data: {
        emergency: {
          _id: emergency._id,
          status: emergency.status,
          route: emergency.route
        },
        ambulance: {
          _id: ambulance._id,
          registrationNumber: ambulance.registrationNumber,
          driver: ambulance.driver ? {
            name: ambulance.driver.name,
            phone: ambulance.driver.phone
          } : null
        },
        hospital: hospital ? {
          _id: hospital._id,
          name: hospital.name,
          address: hospital.address
        } : null
      }
    });
  })
);

/**
 * @desc    Update emergency status
 * @route   PUT /api/emergencies/:id/status
 * @access  Private/Driver
 */
router.put(
  '/:id/status',
  protect,
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    if (!status) {
      res.status(400);
      throw new Error('Status is required');
    }

    const validStatuses = [
      'pending', 'assigned', 'en_route', 'arrived_at_patient', 
      'transporting', 'arrived_at_hospital', 'completed', 'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }

    const emergency = await Emergency.findById(req.params.id)
      .populate('ambulance')
      .populate('hospital')
      .populate('patient');
    
    if (!emergency) {
      res.status(404);
      throw new Error('Emergency not found');
    }

    // Check authorization based on the requested status change
    const isAdmin = req.user.role === 'admin';
    const isPatient = emergency.patient._id.toString() === req.user._id.toString();
    const isRequester = emergency.requestedBy.toString() === req.user._id.toString();
    
    let isDriver = false;
    if (emergency.ambulance) {
      const ambulance = await Ambulance.findById(emergency.ambulance._id);
      isDriver = ambulance && ambulance.driver && 
                ambulance.driver.toString() === req.user._id.toString();
    }

    // Different status changes have different authorization requirements
    if (status === 'cancelled') {
      // Only admin, patient, or requester can cancel
      if (!isAdmin && !isPatient && !isRequester) {
        res.status(403);
        throw new Error('Not authorized to cancel this emergency');
      }

      // Cannot cancel if already completed
      if (emergency.status === 'completed') {
        res.status(400);
        throw new Error('Cannot cancel a completed emergency');
      }
    } else if (['en_route', 'arrived_at_patient', 'transporting', 'arrived_at_hospital', 'completed'].includes(status)) {
      // These statuses can only be set by admin or the assigned driver
      if (!isAdmin && !isDriver) {
        res.status(403);
        throw new Error('Not authorized to update this emergency status');
      }
    }

    // Status-specific validation
    if (status === 'en_route' && emergency.status !== 'assigned') {
      res.status(400);
      throw new Error('Emergency must be assigned before going en route');
    }

    if (status === 'arrived_at_patient' && !['assigned', 'en_route'].includes(emergency.status)) {
      res.status(400);
      throw new Error('Ambulance must be en route before arriving at patient');
    }

    if (status === 'transporting' && !['arrived_at_patient'].includes(emergency.status)) {
      res.status(400);
      throw new Error('Ambulance must arrive at patient before transporting');
    }

    if (status === 'arrived_at_hospital' && !['transporting'].includes(emergency.status)) {
      res.status(400);
      throw new Error('Patient must be in transport before arriving at hospital');
    }

    if (status === 'completed' && !['arrived_at_hospital'].includes(emergency.status)) {
      res.status(400);
      throw new Error('Emergency must arrive at hospital before completion');
    }

    // Update emergency status
    await emergency.updateStatus(status, notes);

    // Additional actions based on status
    if (status === 'completed' || status === 'cancelled') {
      // Free up the ambulance
      if (emergency.ambulance) {
        const ambulance = await Ambulance.findById(emergency.ambulance);
        if (ambulance) {
          ambulance.status = 'available';
          ambulance.activeEmergency = null;
          await ambulance.save();
        }
      }

      // If completed, restore hospital capacity
      if (status === 'completed' && emergency.hospital) {
        const hospital = await Hospital.findById(emergency.hospital);
        if (hospital) {
          hospital.emergencyCapacity.available = Math.min(
            hospital.emergencyCapacity.total,
            hospital.emergencyCapacity.available + 1
          );
          await hospital.save();
        }
      }
    }

    // Emit status update event via socket
    if (req.io) {
      req.io.emit('emergency-status-updated', {
        emergencyId: emergency._id,
        status,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        status: emergency.status,
        timeline: emergency.timeline
      }
    });
  })
);

/**
 * @desc    Add feedback to emergency
 * @route   POST /api/emergencies/:id/feedback
 * @access  Private
 */
router.post(
  '/:id/feedback',
  protect,
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating is required and must be between 1 and 5');
    }

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      res.status(404);
      throw new Error('Emergency not found');
    }

    // Only patient or requester can add feedback
    if (
      emergency.patient.toString() !== req.user._id.toString() &&
      emergency.requestedBy.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to add feedback to this emergency');
    }

    // Cannot add feedback to pending or cancelled emergencies
    if (emergency.status !== 'completed') {
      res.status(400);
      throw new Error('Can only add feedback to completed emergencies');
    }

    // Add feedback
    emergency.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await emergency.save();

    // Update ambulance and hospital ratings if present
    if (emergency.ambulance) {
      // Logic to update ambulance ratings could be added here
    }

    if (emergency.hospital) {
      const hospital = await Hospital.findById(emergency.hospital);
      if (hospital) {
        // Update hospital rating
        const newAvg = (hospital.rating.average * hospital.rating.count + rating) / (hospital.rating.count + 1);
        hospital.rating.average = newAvg;
        hospital.rating.count += 1;
        await hospital.save();
      }
    }

    res.json({
      success: true,
      data: emergency.feedback
    });
  })
);

module.exports = router; 