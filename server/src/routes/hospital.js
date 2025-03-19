const express = require('express');
const { protect, admin, hospitalAdmin } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const { hospitalRules, validate } = require('../middlewares/validator');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { getNearbyHospitals } = require('../config/maps');

const router = express.Router();

/**
 * @desc    Create a new hospital
 * @route   POST /api/hospitals
 * @access  Private/Admin
 */
router.post(
  '/',
  protect,
  admin,
  hospitalRules,
  validate,
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone,
      address,
      location,
      administrators,
      specialties,
      operatingHours,
      paymentMethods
    } = req.body;

    // Check if hospital with this email already exists
    const hospitalExists = await Hospital.findOne({ email });
    if (hospitalExists) {
      res.status(400);
      throw new Error('Hospital with this email already exists');
    }

    // Create hospital
    const hospital = await Hospital.create({
      name,
      email,
      phone,
      address,
      location,
      administrators,
      specialties,
      operatingHours,
      paymentMethods,
      status: 'active'
    });

    // If administrators are specified, update their roles to hospital_admin
    if (administrators && administrators.length > 0) {
      await User.updateMany(
        { _id: { $in: administrators } },
        { role: 'hospital_admin' }
      );
    }

    res.status(201).json({
      success: true,
      data: hospital
    });
  })
);

/**
 * @desc    Get all hospitals
 * @route   GET /api/hospitals
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Build filter criteria
    const filter = {};

    // Filter by status if provided (default to active for public users)
    if (req.query.status) {
      // Only allow admins to see inactive/maintenance hospitals
      if (req.user && req.user.role === 'admin') {
        filter.status = req.query.status;
      } else {
        filter.status = 'active';
      }
    } else {
      filter.status = 'active';
    }

    // Filter by specialty if provided
    if (req.query.specialty) {
      filter.specialties = req.query.specialty;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query
    const hospitals = await Hospital.find(filter)
      .select('name email phone address location specialties operatingHours status emergencyCapacity rating')
      .sort({ 'rating.average': -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Hospital.countDocuments(filter);

    res.json({
      success: true,
      count: hospitals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: hospitals
    });
  })
);

/**
 * @desc    Get hospital by ID
 * @route   GET /api/hospitals/:id
 * @access  Public
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id)
      .populate('administrators', 'name email phone');

    if (!hospital) {
      res.status(404);
      throw new Error('Hospital not found');
    }

    // If not admin, only show active hospitals
    if ((!req.user || req.user.role !== 'admin') && hospital.status !== 'active') {
      res.status(404);
      throw new Error('Hospital not found');
    }

    res.json({
      success: true,
      data: hospital
    });
  })
);

/**
 * @desc    Update hospital
 * @route   PUT /api/hospitals/:id
 * @access  Private/Admin/HospitalAdmin
 */
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      res.status(404);
      throw new Error('Hospital not found');
    }

    // Check permission (admin or hospital admin)
    const isAdmin = req.user.role === 'admin';
    const isHospitalAdmin = req.user.role === 'hospital_admin' && 
      hospital.administrators.some(admin => admin.toString() === req.user._id.toString());

    if (!isAdmin && !isHospitalAdmin) {
      res.status(403);
      throw new Error('Not authorized to update hospital');
    }

    // If updating administrators, check if valid users
    if (req.body.administrators) {
      // Only admin can update administrators
      if (!isAdmin) {
        res.status(403);
        throw new Error('Only admin can update hospital administrators');
      }

      // Check if all administrators exist
      const adminExists = await User.find({
        _id: { $in: req.body.administrators }
      });

      if (adminExists.length !== req.body.administrators.length) {
        res.status(400);
        throw new Error('One or more administrators not found');
      }

      // Update old administrators' roles if removed
      const removedAdmins = hospital.administrators.filter(
        admin => !req.body.administrators.includes(admin.toString())
      );

      if (removedAdmins.length > 0) {
        // Check if they're admins for other hospitals before changing role
        for (const adminId of removedAdmins) {
          const otherHospitals = await Hospital.countDocuments({
            _id: { $ne: hospital._id },
            administrators: adminId
          });

          if (otherHospitals === 0) {
            await User.findByIdAndUpdate(adminId, { role: 'user' });
          }
        }
      }

      // Update new administrators' roles
      const newAdmins = req.body.administrators.filter(
        admin => !hospital.administrators.map(a => a.toString()).includes(admin)
      );

      if (newAdmins.length > 0) {
        await User.updateMany(
          { _id: { $in: newAdmins } },
          { role: 'hospital_admin' }
        );
      }
    }

    // Update hospital
    const updatedHospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('administrators', 'name email phone');

    res.json({
      success: true,
      data: updatedHospital
    });
  })
);

/**
 * @desc    Delete hospital
 * @route   DELETE /api/hospitals/:id
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      res.status(404);
      throw new Error('Hospital not found');
    }

    // Update administrators' roles if they are not admins for other hospitals
    for (const adminId of hospital.administrators) {
      const otherHospitals = await Hospital.countDocuments({
        _id: { $ne: hospital._id },
        administrators: adminId
      });

      if (otherHospitals === 0) {
        await User.findByIdAndUpdate(adminId, { role: 'user' });
      }
    }

    await hospital.deleteOne();

    res.json({
      success: true,
      message: 'Hospital removed successfully'
    });
  })
);

/**
 * @desc    Get nearby hospitals
 * @route   GET /api/hospitals/nearby
 * @access  Public
 */
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const { lat, lng, radius = 5000, limit = 5 } = req.query;

    if (!lat || !lng) {
      res.status(400);
      throw new Error('Latitude and longitude are required');
    }

    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };

    try {
      // First try to get hospitals from our database
      const dbHospitals = await Hospital.findNearest(
        coordinates, 
        parseInt(radius),
        parseInt(limit)
      );

      // If we have enough, return them
      if (dbHospitals.length >= parseInt(limit)) {
        return res.json({
          success: true,
          source: 'database',
          count: dbHospitals.length,
          data: dbHospitals
        });
      }

      // Otherwise, also fetch from Google Maps API
      const googleHospitals = await getNearbyHospitals(coordinates, parseInt(radius));
      
      // Filter out hospitals that are already in our database (to avoid duplicates)
      const dbHospitalNames = dbHospitals.map(h => h.name.toLowerCase());
      const filteredGoogleHospitals = googleHospitals
        .filter(h => !dbHospitalNames.includes(h.name.toLowerCase()))
        .map(h => ({
          source: 'google',
          name: h.name,
          address: {
            street: h.vicinity,
            city: '',
            state: '',
            zipCode: '',
            country: ''
          },
          location: {
            type: 'Point',
            coordinates: [h.geometry.location.lng, h.geometry.location.lat]
          },
          phone: h.formatted_phone_number || '',
          rating: {
            average: h.rating || 0,
            count: h.user_ratings_total || 0
          },
          googlePlaceId: h.place_id
        }));

      // Combine results
      const combinedResults = [
        ...dbHospitals,
        ...filteredGoogleHospitals.slice(0, parseInt(limit) - dbHospitals.length)
      ];

      res.json({
        success: true,
        source: 'combined',
        count: combinedResults.length,
        data: combinedResults
      });
    } catch (error) {
      console.error('Error fetching nearby hospitals:', error);
      
      // If Google Maps API fails, still return database results
      const dbHospitals = await Hospital.findNearest(
        coordinates, 
        parseInt(radius),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        source: 'database',
        count: dbHospitals.length,
        data: dbHospitals,
        error: error.message
      });
    }
  })
);

/**
 * @desc    Update hospital capacity
 * @route   PUT /api/hospitals/:id/capacity
 * @access  Private/Admin/HospitalAdmin
 */
router.put(
  '/:id/capacity',
  protect,
  asyncHandler(async (req, res) => {
    const { total, available } = req.body;
    
    if (total === undefined && available === undefined) {
      res.status(400);
      throw new Error('Total or available capacity must be provided');
    }
    
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      res.status(404);
      throw new Error('Hospital not found');
    }
    
    // Check permission
    const isAdmin = req.user.role === 'admin';
    const isHospitalAdmin = req.user.role === 'hospital_admin' && 
      hospital.administrators.some(admin => admin.toString() === req.user._id.toString());
    
    if (!isAdmin && !isHospitalAdmin) {
      res.status(403);
      throw new Error('Not authorized to update hospital capacity');
    }
    
    // Update capacity
    if (total !== undefined) {
      hospital.emergencyCapacity.total = total;
    }
    
    if (available !== undefined) {
      hospital.emergencyCapacity.available = available;
    }
    
    // Ensure available doesn't exceed total
    if (hospital.emergencyCapacity.available > hospital.emergencyCapacity.total) {
      hospital.emergencyCapacity.available = hospital.emergencyCapacity.total;
    }
    
    await hospital.save();
    
    res.json({
      success: true,
      data: hospital.emergencyCapacity
    });
  })
);

module.exports = router; 