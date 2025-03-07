
import mongoose from 'mongoose';

const cartItemSchema = mongoose.Schema({
  productId: {
    type: Number,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true
});

export const CartItem = mongoose.model('CartItem', cartItemSchema);


