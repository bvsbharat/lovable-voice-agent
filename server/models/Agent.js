import mongoose from 'mongoose';

const FormFieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['text', 'email', 'phone', 'address', 'date', 'number', 'textarea', 'select']
  },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  options: [{ type: String }]
}, { _id: false });

const AgentFunctionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  parameters: {
    type: {
      type: String,
      required: true,
      default: 'object'
    },
    properties: { type: mongoose.Schema.Types.Mixed, required: true },
    required: [{ type: String }]
  }
}, { _id: false });

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: { type: String, required: true },
  description: { type: String, required: true },
  model: { type: String, required: true, default: 'gpt-4' },
  voice: { type: String, required: true, default: 'rachel' },
  prompt: { type: String, required: true },
  fields: [FormFieldSchema],
  tools: [AgentFunctionSchema],
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  vapiAgentId: { type: String }, // Store Vapi's agent ID if created via API
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Add indexes for common queries
AgentSchema.index({ published: 1 });
AgentSchema.index({ industry: 1 });
AgentSchema.index({ vapiAgentId: 1 });

export default mongoose.model('Agent', AgentSchema);
