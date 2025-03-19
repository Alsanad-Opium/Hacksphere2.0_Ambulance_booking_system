const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  emergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'refunded', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'insurance', 'hospital_covered', 'cash', 'wallet', 'free'],
    required: [true, 'Payment method is required']
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true // Allow null/undefined values
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'cash', 'insurance', 'hospital', 'other'],
    default: 'other'
  },
  cardInfo: {
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    coveragePercentage: Number,
    approvalCode: String,
    claimStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'partially_approved', 'rejected'],
      default: 'not_submitted'
    }
  },
  invoiceNumber: String,
  receiptUrl: String,
  notes: String,
  refund: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'completed', 'failed'],
    },
    transactionId: String,
    processedAt: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Virtual for payment ID
paymentSchema.virtual('paymentId').get(function() {
  return `PMT-${this._id.toString().substr(-8).toUpperCase()}`;
});

// Create invoice number
paymentSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  next();
});

// Static method to get payment summary by date range
paymentSchema.statics.getPaymentSummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: "$method",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    }
  ]);
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 