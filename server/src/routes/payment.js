const express = require('express');
const { protect, admin, verified } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const Payment = require('../models/Payment');
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

const router = express.Router();

/**
 * @desc    Create a payment record
 * @route   POST /api/payments
 * @access  Private/Admin
 */
router.post(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const {
      emergency: emergencyId,
      patient: patientId,
      hospital: hospitalId,
      amount,
      method,
      paymentGateway,
      notes
    } = req.body;

    // Validate required fields
    if (!emergencyId || !patientId || !amount || !method) {
      res.status(400);
      throw new Error('Emergency, patient, amount, and method are required');
    }

    // Validate emergency
    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      res.status(404);
      throw new Error('Emergency not found');
    }

    // Validate patient
    const patient = await User.findById(patientId);
    if (!patient) {
      res.status(404);
      throw new Error('Patient not found');
    }

    // Validate hospital if provided
    if (hospitalId) {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        res.status(404);
        throw new Error('Hospital not found');
      }
    }

    // Create payment
    const payment = await Payment.create({
      emergency: emergencyId,
      patient: patientId,
      hospital: hospitalId,
      amount,
      method,
      status: 'pending',
      paymentGateway,
      notes
    });

    // Update emergency payment info
    emergency.payment = {
      amount,
      status: 'pending',
      method
    };
    await emergency.save();

    res.status(201).json({
      success: true,
      data: payment
    });
  })
);

/**
 * @desc    Get all payments
 * @route   GET /api/payments
 * @access  Private/Admin
 */
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // Build filter
    const filter = {};

    // Regular users can only see their own payments
    if (req.user.role === 'user') {
      filter.patient = req.user._id;
    }

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by payment method
    if (req.query.method) {
      filter.method = req.query.method;
    }

    // Filter by date range
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
    const payments = await Payment.find(filter)
      .populate('patient', 'name email phone')
      .populate('hospital', 'name')
      .populate('emergency', 'severity status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: payments
    });
  })
);

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('hospital', 'name address phone')
      .populate('emergency');

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Check authorization
    const isAdmin = req.user.role === 'admin';
    const isPatient = payment.patient._id.toString() === req.user._id.toString();
    const isHospitalAdmin = req.user.role === 'hospital_admin' && 
      payment.hospital && payment.hospital.administrators && 
      payment.hospital.administrators.some(admin => admin.toString() === req.user._id.toString());

    if (!isAdmin && !isPatient && !isHospitalAdmin) {
      res.status(403);
      throw new Error('Not authorized to access this payment');
    }

    res.json({
      success: true,
      data: payment
    });
  })
);

/**
 * @desc    Update payment status
 * @route   PUT /api/payments/:id/status
 * @access  Private/Admin
 */
router.put(
  '/:id/status',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { status, transactionId } = req.body;

    if (!status) {
      res.status(400);
      throw new Error('Status is required');
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'refunded', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Update payment
    payment.status = status;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    // If completed, generate receipt URL (this would be implemented with your payment provider)
    if (status === 'completed' && !payment.receiptUrl) {
      payment.receiptUrl = `https://example.com/receipts/${payment._id}`;
    }

    // Add current timestamp if we're updating to a final state
    if (['completed', 'refunded', 'failed', 'cancelled'].includes(status)) {
      payment.updatedAt = new Date();
    }

    await payment.save();

    // Update emergency payment status
    const emergency = await Emergency.findById(payment.emergency);
    if (emergency) {
      emergency.payment.status = status;
      emergency.payment.transactionId = transactionId || emergency.payment.transactionId;
      await emergency.save();
    }

    res.json({
      success: true,
      data: payment
    });
  })
);

/**
 * @desc    Process a refund
 * @route   POST /api/payments/:id/refund
 * @access  Private/Admin
 */
router.post(
  '/:id/refund',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // Validate payment is completed
    if (payment.status !== 'completed') {
      res.status(400);
      throw new Error('Only completed payments can be refunded');
    }

    // Validate amount
    if (!amount || amount <= 0 || amount > payment.amount) {
      res.status(400);
      throw new Error('Invalid refund amount');
    }

    // Process refund (this would be implemented with your payment provider)
    // For now, we'll just simulate a successful refund
    payment.refund = {
      amount,
      reason: reason || 'Customer request',
      status: 'completed',
      transactionId: `REF-${Date.now()}`,
      processedAt: new Date()
    };
    payment.status = amount === payment.amount ? 'refunded' : 'completed';

    await payment.save();

    res.json({
      success: true,
      data: payment
    });
  })
);

/**
 * @desc    Get payment summary statistics
 * @route   GET /api/payments/summary
 * @access  Private/Admin
 */
router.get(
  '/summary',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    // Default to last 30 days if no date range provided
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get payment summary
    const summary = await Payment.getPaymentSummary(startDate, endDate);

    // Get total amount
    const totalAmount = summary.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // Get counts by status
    const statusCounts = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeRange: {
          startDate,
          endDate
        },
        summary,
        totalAmount,
        statusCounts,
        totalTransactions: summary.reduce((acc, curr) => acc + curr.count, 0)
      }
    });
  })
);

module.exports = router; 