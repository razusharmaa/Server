import mongoose from 'mongoose';

// Counter schema and model
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});


export const Counter = mongoose.model('Counter', CounterSchema);

