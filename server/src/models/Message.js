const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  emergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required']
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'audio', 'document', 'location']
    },
    url: String,
    metadata: Object
  }],
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: Date
}, {
  timestamps: true
});

// Add method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Static method to get all messages for an emergency
messageSchema.statics.getConversation = function(emergencyId, limit = 50, skip = 0) {
  return this.find({ emergency: emergencyId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('sender', 'name role')
    .populate('receiver', 'name role')
    .lean();
};

// Virtual to identify if message contains media
messageSchema.virtual('hasMedia').get(function() {
  return this.attachments && this.attachments.length > 0;
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 