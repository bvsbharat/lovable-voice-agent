import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import Agent from './models/Agent.js';

dotenv.config();

// Connect to MongoDB
const dbConnected = await connectDB();

const app = express();
const port = process.env.PORT || 8081;

// Basic middlewares
app.use(cors({ 
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:8080', 
    'http://localhost:8082'
  ],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Initialize Vapi client
const VAPI_API_KEY = process.env.VAPI_API_KEY;
let vapi = null;

if (VAPI_API_KEY) {
  try {
    // Import VapiClient from the server SDK
    const { VapiClient } = await import('@vapi-ai/server-sdk');
    vapi = new VapiClient({ token: VAPI_API_KEY });
    console.log('[INFO] Vapi SDK initialized successfully with VapiClient');
  } catch (error) {
    console.error('[ERROR] Failed to initialize Vapi SDK:', error);
    console.warn('[WARN] Continuing without Vapi integration');
    vapi = null;
  }
} else {
  console.warn('[WARN] VAPI_API_KEY is not set. Vapi API calls will be skipped and operate in local mode.');
}

// Helper function to convert agent config to Vapi format
function convertToVapiAgent(agentData) {
  // Map our voice names to Vapi voice IDs (using different providers)
  const voiceMapping = {
    'rachel': { provider: 'azure', voiceId: 'en-US-JennyNeural' },
    'josh': { provider: 'azure', voiceId: 'en-US-GuyNeural' },
    'aria': { provider: '11labs', voiceId: 'pNInz6obpgDQGcFmaJgB' }, // Adam
    'sam': { provider: 'playht', voiceId: 'sam' }
  };

  // Map our model names to provider and model
  const getModelConfig = (model) => {
    switch (model) {
      case 'gpt-4':
        return { provider: 'openai', model: 'gpt-4' };
      case 'gpt-3.5-turbo':
        return { provider: 'openai', model: 'gpt-3.5-turbo' };
      case 'claude-3':
        return { provider: 'anthropic', model: 'claude-3-haiku-20240307' };
      default:
        return { provider: 'openai', model: 'gpt-3.5-turbo' };
    }
  };

  const modelConfig = getModelConfig(agentData.model);
  const systemMessage = agentData.prompt || agentData.description || `You are ${agentData.name}, a helpful assistant in the ${agentData.industry} industry. You help collect information from customers through natural conversation.`;
  
  const vapiAssistant = {
    name: agentData.name,
    model: {
      ...modelConfig,
      messages: [
        {
          role: 'system',
          content: systemMessage
        }
      ]
    },
    voice: voiceMapping[agentData.voice] || { provider: 'azure', voiceId: 'en-US-JennyNeural' },
    firstMessage: `Hello! I'm ${agentData.name}, your ${agentData.industry} assistant. I'll help you with collecting some information today. How can I get started?`,
  };

  // Add functions based on form fields if any
  if (agentData.fields && agentData.fields.length > 0) {
    const fieldDescriptions = agentData.fields
      .map(field => `- ${field.label} (${field.type}${field.required ? ', required' : ''})`)
      .join('\n');

    vapiAssistant.functions = [{
      name: 'collectFormData',
      description: `Collect the following form data from the user through conversation:\n${fieldDescriptions}`,
      parameters: {
        type: 'object',
        properties: agentData.fields.reduce((props, field) => {
          props[field.id] = {
            type: field.type === 'number' ? 'number' : 'string',
            description: `${field.label}${field.placeholder ? ` (${field.placeholder})` : ''}`,
          };
          return props;
        }, {}),
        required: agentData.fields.filter(f => f.required).map(f => f.id),
      },
    }];

    // Enhance system message with field collection instructions
    vapiAssistant.model.messages[0].content += `\n\nYour primary task is to collect the following information:\n${fieldDescriptions}\n\nAsk for this information naturally in conversation. When you have collected a piece of information, use the collectFormData function to store it.`;
  }

  return vapiAssistant;
}

// In-memory fallback store when MongoDB is not available
const localAgents = new Map();

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Create agent
app.post('/api/agents', async (req, res) => {
  try {
    const agentData = req.body;
    console.log('[DEBUG] Received agent data:', JSON.stringify(agentData, null, 2));
    console.log('[DEBUG] Tools in agent data:', agentData.tools);
    let vapiAgentId = null;
    
    // Try Vapi first if available
    if (vapi) {
      try {
        console.log('[INFO] Creating Vapi assistant:', agentData.name);
        const vapiAssistantConfig = convertToVapiAgent(agentData);
        console.log('[DEBUG] Vapi assistant config:', JSON.stringify(vapiAssistantConfig, null, 2));
        const vapiAssistant = await vapi.assistants.create(vapiAssistantConfig);
        vapiAgentId = vapiAssistant.id;
        console.log('[INFO] Vapi assistant created successfully with ID:', vapiAgentId);
        console.log('[DEBUG] Full Vapi assistant response:', JSON.stringify(vapiAssistant, null, 2));
      } catch (e) {
        console.error('[ERROR] Vapi agent creation failed:', e);
        console.log('[WARN] Continuing without Vapi - storing locally only');
        // Continue without Vapi - store locally only
      }
    } else {
      console.log('[INFO] Vapi not configured, creating local agent only');
    }
    
    if (dbConnected) {
      // Save to MongoDB
      const agent = new Agent({
        ...agentData,
        vapiAgentId,
      });
      const saved = await agent.save();
      const response = saved.toJSON();
      // Ensure id field is present for frontend compatibility
      response.id = response._id;
      console.log('[DEBUG] Saved agent to MongoDB:', JSON.stringify(response, null, 2));
      console.log('[INFO] Agent saved to MongoDB with ID:', response.id, 'and Vapi ID:', response.vapiAgentId);
      res.status(201).json(response);
    } else {
      // Fallback to in-memory
      const localId = `local_${Date.now()}`;
      const created = { 
        _id: localId,
        id: localId, 
        ...agentData, 
        vapiAgentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('[INFO] Agent saved to local memory with ID:', localId, 'and Vapi ID:', vapiAgentId);
      localAgents.set(localId, created);
      res.status(201).json(created);
    }
  } catch (err) {
    console.error('[ERROR] Agent creation failed:', err);
    res.status(500).json({ error: err?.message || 'Failed to create agent' });
  }
});

// List agents - combines local MongoDB agents with Vapi assistants
app.get('/api/agents', async (_req, res) => {
  try {
    console.log('[INFO] Listing agents - dbConnected:', dbConnected);
    let localAgentsList = [];
    let vapiAssistants = [];
    
    // Get local agents from MongoDB or memory
    if (dbConnected) {
      const agents = await Agent.find().sort({ createdAt: -1 });
      console.log('[INFO] Found', agents.length, 'agents in MongoDB');
      
      localAgentsList = agents.map(agent => {
        const agentObj = agent.toJSON();
        agentObj.id = agentObj._id;
        agentObj.source = 'local'; // Mark as local agent
        return agentObj;
      });
    } else {
      localAgentsList = Array.from(localAgents.values()).map(agent => ({
        ...agent,
        source: 'local'
      }));
      console.log('[INFO] Found', localAgentsList.length, 'agents in local memory');
    }
    
    // Get agents from Vapi if configured
    if (vapi) {
      try {
        const vapiResponse = await vapi.assistants.list();
        vapiAssistants = vapiResponse.map(assistant => {
          // Extract system prompt from model.messages where role is 'system'
          let systemPrompt = '';
          if (assistant.model?.messages && Array.isArray(assistant.model.messages)) {
            const systemMessage = assistant.model.messages.find(msg => msg.role === 'system');
            systemPrompt = systemMessage?.content || '';
          }
          
          // Map voice ID back to our voice names
          let voiceName = 'jennifer'; // default
          if (assistant.voice?.voiceId) {
            const voiceId = assistant.voice.voiceId;
            if (voiceId.includes('JennyNeural')) voiceName = 'rachel';
            else if (voiceId.includes('GuyNeural')) voiceName = 'josh';
            else if (voiceId === 'pNInz6obpgDQGcFmaJgB') voiceName = 'aria';
            else if (voiceId === 'sam') voiceName = 'sam';
          }
          
          return {
            id: assistant.id,
            vapiAgentId: assistant.id,
            name: assistant.name,
            description: assistant.model?.systemMessage || systemPrompt || '',
            model: assistant.model?.model || 'gpt-3.5-turbo',
            voice: voiceName,
            prompt: systemPrompt,
            firstMessage: assistant.firstMessage || '',
            createdAt: assistant.createdAt,
            updatedAt: assistant.updatedAt,
            published: true,
            source: 'vapi', // Mark as Vapi agent
            fields: [] // Vapi assistants don't have our custom fields structure
          };
        });
        console.log('[INFO] Retrieved', vapiAssistants.length, 'assistants from Vapi');
      } catch (e) {
        console.log('[WARN] Failed to list assistants from Vapi:', e.message);
        vapiAssistants = [];
      }
    } else {
      console.log('[INFO] Vapi not configured, only showing local agents');
    }
    
    // Combine local agents and Vapi assistants, avoiding duplicates
    const existingVapiIds = new Set(localAgentsList.map(agent => agent.vapiAgentId).filter(Boolean));
    const uniqueVapiAssistants = vapiAssistants.filter(assistant => !existingVapiIds.has(assistant.id));
    
    const combinedAgents = [...localAgentsList, ...uniqueVapiAssistants];
    
    console.log('[INFO] Returning', combinedAgents.length, 'total agents (' + localAgentsList.length + ' local, ' + uniqueVapiAssistants.length + ' Vapi-only)');
    res.json(combinedAgents);
  } catch (err) {
    console.error('[ERROR] Failed to list agents:', err);
    res.status(500).json({ error: err?.message || 'Failed to list agents' });
  }
});

// Get agent by id - checks local storage first, then Vapi
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    let agent = null;
    
    // First, try to find in local storage (MongoDB or memory)
    if (dbConnected) {
      try {
        agent = await Agent.findById(agentId);
        if (agent) {
          const response = agent.toJSON();
          response.id = response._id;
          response.source = 'local';
          console.log('[INFO] Found agent in MongoDB:', agentId);
          return res.json(response);
        }
      } catch (e) {
        // Invalid ObjectId, continue to check Vapi
        console.log('[DEBUG] Invalid MongoDB ObjectId, checking Vapi:', agentId);
      }
    } else {
      agent = localAgents.get(agentId);
      if (agent) {
        console.log('[INFO] Found agent in local memory:', agentId);
        return res.json({ ...agent, source: 'local' });
      }
    }
    
    // If not found locally, try to find in Vapi
    if (vapi) {
      try {
        const vapiAssistant = await vapi.assistants.get(agentId);
        if (vapiAssistant) {
          // Extract system prompt from model.messages where role is 'system'
          let systemPrompt = '';
          if (vapiAssistant.model?.messages && Array.isArray(vapiAssistant.model.messages)) {
            const systemMessage = vapiAssistant.model.messages.find(msg => msg.role === 'system');
            systemPrompt = systemMessage?.content || '';
          }
          
          // Map voice ID back to our voice names
          let voiceName = 'jennifer'; // default
          if (vapiAssistant.voice?.voiceId) {
            const voiceId = vapiAssistant.voice.voiceId;
            if (voiceId.includes('JennyNeural')) voiceName = 'rachel';
            else if (voiceId.includes('GuyNeural')) voiceName = 'josh';
            else if (voiceId === 'pNInz6obpgDQGcFmaJgB') voiceName = 'aria';
            else if (voiceId === 'sam') voiceName = 'sam';
          }
          
          const response = {
            id: vapiAssistant.id,
            vapiAgentId: vapiAssistant.id,
            name: vapiAssistant.name,
            description: vapiAssistant.model?.systemMessage || systemPrompt || '',
            model: vapiAssistant.model?.model || 'gpt-3.5-turbo',
            voice: voiceName,
            prompt: systemPrompt,
            firstMessage: vapiAssistant.firstMessage || '',
            createdAt: vapiAssistant.createdAt,
            updatedAt: vapiAssistant.updatedAt,
            published: true,
            source: 'vapi',
            fields: []
          };
          console.log('[INFO] Found agent in Vapi:', agentId, 'with system prompt length:', systemPrompt.length);
          return res.json(response);
        }
      } catch (e) {
        console.log('[DEBUG] Agent not found in Vapi:', agentId, e.message);
      }
    }
    
    // Not found anywhere
    console.log('[INFO] Agent not found:', agentId);
    res.status(404).json({ error: 'Agent not found' });
  } catch (err) {
    console.error('[ERROR] Failed to get agent:', err);
    res.status(404).json({ error: err?.message || 'Agent not found' });
  }
});

// Helper function to check if ID is UUID format (VAPI agent)
function isUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Update agent
app.put('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    // Check if this is a VAPI agent (UUID format)
    if (isUUID(agentId)) {
      // This is a VAPI agent - update directly via VAPI API
      if (!vapi) {
        return res.status(500).json({ error: 'VAPI not configured' });
      }
      
      try {
        const vapiAssistantConfig = convertToVapiAgent(req.body);
        const updatedAssistant = await vapi.assistants.update(agentId, vapiAssistantConfig);
        
        // Extract system prompt from updated assistant
        let systemPrompt = '';
        if (updatedAssistant.model?.messages && Array.isArray(updatedAssistant.model.messages)) {
          const systemMessage = updatedAssistant.model.messages.find(msg => msg.role === 'system');
          systemPrompt = systemMessage?.content || '';
        }
        
        // Map voice ID back to our voice names
        let voiceName = 'jennifer'; // default
        if (updatedAssistant.voice?.voiceId) {
          const voiceId = updatedAssistant.voice.voiceId;
          if (voiceId.includes('JennyNeural')) voiceName = 'rachel';
          else if (voiceId.includes('GuyNeural')) voiceName = 'josh';
          else if (voiceId === 'pNInz6obpgDQGcFmaJgB') voiceName = 'aria';
          else if (voiceId === 'sam') voiceName = 'sam';
        }
        
        const response = {
          id: updatedAssistant.id,
          vapiAgentId: updatedAssistant.id,
          name: updatedAssistant.name,
          description: updatedAssistant.model?.systemMessage || systemPrompt || '',
          model: updatedAssistant.model?.model || 'gpt-3.5-turbo',
          voice: voiceName,
          prompt: systemPrompt,
          firstMessage: updatedAssistant.firstMessage || '',
          createdAt: updatedAssistant.createdAt,
          updatedAt: updatedAssistant.updatedAt,
          published: true,
          source: 'vapi',
          fields: req.body.fields || []
        };
        
        console.log('[INFO] VAPI agent updated successfully:', agentId);
        return res.json(response);
      } catch (e) {
        console.error('[ERROR] Failed to update VAPI agent:', e.message);
        return res.status(500).json({ error: 'Failed to update VAPI agent: ' + e.message });
      }
    }
    
    // Handle local agents (MongoDB or in-memory)
    if (dbConnected) {
      const agent = await Agent.findByIdAndUpdate(
        agentId, 
        req.body, 
        { new: true, runValidators: true }
      );
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      
      // Also update in Vapi if linked
      if (agent.vapiAgentId && vapi) {
        try {
          const vapiAssistantConfig = convertToVapiAgent(req.body);
          await vapi.assistants.update(agent.vapiAgentId, vapiAssistantConfig);
          console.log('[INFO] Vapi assistant updated successfully:', agent.vapiAgentId);
        } catch (e) {
          console.log('[WARN] Vapi assistant update failed:', e.message);
        }
      }
      
      const response = agent.toJSON();
      response.id = response._id;
      res.json(response);
    } else {
      const existing = localAgents.get(agentId);
      if (!existing) return res.status(404).json({ error: 'Agent not found' });
      
      const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
      localAgents.set(agentId, updated);
      res.json(updated);
    }
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to update agent' });
  }
});

// Delete agent
app.delete('/api/agents/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    console.log('Attempting to delete agent:', agentId);
    
    if (dbConnected) {
      let agent;
      try {
        // Try to find by MongoDB ObjectId first
        agent = await Agent.findById(agentId);
      } catch (e) {
        // If not a valid ObjectId, try finding by any field that matches
        console.log('Invalid ObjectId, searching by other fields');
        agent = await Agent.findOne({
          $or: [
            { _id: agentId },
            { vapiAgentId: agentId }
          ]
        });
      }
      
      if (!agent) {
        console.log('Agent not found in database');
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      console.log('Found agent to delete:', agent._id);
      
      // Delete from Vapi if linked
      if (agent.vapiAgentId && vapi) {
        try {
          await vapi.assistants.delete(agent.vapiAgentId);
          console.log('[INFO] Vapi assistant deleted successfully:', agent.vapiAgentId);
        } catch (e) {
          console.log('[WARN] Vapi assistant deletion failed:', e.message);
        }
      }
      
      await Agent.findByIdAndDelete(agent._id);
      console.log('Agent deleted successfully');
    } else {
      if (!localAgents.has(agentId)) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      localAgents.delete(agentId);
    }
    res.status(204).send();
  } catch (err) {
    console.error('Delete agent error:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete agent' });
  }
});

// Publish agent
app.post('/api/agents/:id/publish', async (req, res) => {
  try {
    if (dbConnected) {
      const agent = await Agent.findByIdAndUpdate(
        req.params.id,
        { 
          published: true, 
          publishedAt: new Date() 
        },
        { new: true }
      );
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      const response = agent.toJSON();
      response.id = response._id;
      res.json(response);
    } else {
      const agent = localAgents.get(req.params.id);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      
      const updated = { 
        ...agent, 
        published: true, 
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localAgents.set(req.params.id, updated);
      res.json(updated);
    }
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Failed to publish agent' });
  }
});

// Start a preview call using an agent/assistant id
app.post('/api/agents/:id/preview-call', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get agent from database to find Vapi ID
    let agent;
    if (dbConnected) {
      agent = await Agent.findById(id);
    } else {
      agent = localAgents.get(id);
    }
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Return both local and Vapi IDs for client to use
    const response = {
      ok: true, 
      localId: id,
      hasVapiAgent: !!agent.vapiAgentId
    };
    
    // Only include agentId if we have a real Vapi agent
    if (agent.vapiAgentId) {
      response.agentId = agent.vapiAgentId;
      console.log('[INFO] Preview call setup - using Vapi agent:', agent.vapiAgentId);
    } else {
      console.log('[INFO] Preview call setup - no Vapi agent, using simulation mode');
    }
    
    res.json(response);
  } catch (err) {
    console.error('[ERROR] Preview call setup failed:', err);
    res.status(500).json({ error: err?.message || 'Failed to start preview' });
  }
});

// Calls listing passthrough (Docs: https://docs.vapi.ai/api-reference/calls/list)
app.get('/api/calls', async (req, res) => {
  try {
    const params = req.query;
    let calls = [];
    
    if (vapi) {
      try {
        calls = await vapi.calls.list(params);
        console.log('[INFO] Retrieved', calls.length, 'calls from Vapi');
      } catch (e) {
        console.log('[WARN] Failed to list calls from Vapi:', e.message);
        calls = [];
      }
    } else {
      console.log('[INFO] Vapi not configured, returning empty calls list');
    }
    
    res.json(calls);
  } catch (err) {
    console.error('[ERROR] Failed to list calls:', err);
    res.status(500).json({ error: err?.message || 'Failed to list calls' });
  }
});

// List Vapi assistants for comparison (Docs: https://docs.vapi.ai/api-reference/assistants/list)
app.get('/api/vapi/assistants', async (req, res) => {
  try {
    let assistants = [];
    
    if (vapi) {
      try {
        assistants = await vapi.assistants.list();
        console.log('[INFO] Retrieved', assistants.length, 'assistants from Vapi');
      } catch (e) {
        console.log('[WARN] Failed to list assistants from Vapi:', e.message);
        assistants = [];
      }
    } else {
      console.log('[INFO] Vapi not configured, returning empty assistants list');
    }
    
    res.json(assistants);
  } catch (err) {
    console.error('[ERROR] Failed to list assistants:', err);
    res.status(500).json({ error: err?.message || 'Failed to list assistants' });
  }
});

// Webhook endpoint for Vapi events (configure URL in Vapi dashboard)
app.post('/api/webhooks/vapi', (req, res) => {
  // TODO: verify signature if provided by Vapi
  console.log('Received Vapi webhook:', req.body?.type || 'event');
  res.status(200).json({ received: true });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});


