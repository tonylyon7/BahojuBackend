import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema({
  clients: {
    type: Number,
    required: true,
    default: 300,
    min: 0
  },
  projects: {
    type: Number,
    required: true,
    default: 500,
    min: 0
  },
  supportHours: {
    type: Number,
    required: true,
    default: 1250,
    min: 0
  },
  employees: {
    type: Number,
    required: true,
    default: 14,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Only allow one stats document - _id is automatically unique

export default mongoose.model('Stats', statsSchema);
