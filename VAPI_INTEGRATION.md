# Vapi Integration Guide

This document explains how the voice agent integrates with [Vapi](https://vapi.ai) for real-time voice conversations using the direct SDK approach.

## Overview

The Preview Mode component uses the [Vapi Web SDK](https://github.com/VapiAI/client-sdk-web) for direct integration without requiring backend assistant management. The system automatically converts agent configurations to Vapi assistant objects and initiates voice calls directly.

## Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_VAPI_PUBLIC_KEY=pk_your_public_key_here
```

### 2. Get Vapi API Keys

1. Sign up at [Vapi.ai](https://vapi.ai)
2. Get your **Public Key** from the Vapi dashboard (starts with `pk_`)
3. Add it to your `.env` file

**Note**: With direct SDK integration, you only need the public key. No server-side API key or backend assistant management is required.

## Features

### Real-time Voice Interaction

- **Voice-to-Voice**: Users speak directly to the AI agent
- **Live Transcription**: Real-time speech-to-text display
- **Natural Conversation**: AI responds with voice synthesis
- **Function Calls**: Agent can collect form data through conversation

### Enhanced Controls

- **Mute/Unmute**: Toggle microphone during calls
- **Volume Levels**: Visual feedback of assistant speech volume
- **Call Duration**: Real-time call timer
- **Quick Actions**: Send system messages during calls

### Automatic Fallback

- **Simulation Mode**: Falls back to text simulation if Vapi is unavailable
- **Error Handling**: Graceful handling of connection issues
- **Status Indicators**: Clear feedback on connection state

## Usage

### 1. Creating Agents

When you create an agent in the Agent Builder:
- The system automatically creates a corresponding Vapi assistant
- Maps your agent configuration to Vapi's format
- Includes custom functions for data collection

### 2. Preview Mode

Preview Mode now supports both in-app and direct URL access:
- **In-app**: Click "Preview" from the Dashboard to test an existing agent
- **Direct URL**: Access `/preview/{agentId}` directly to test any agent
- **From Builder**: Preview agents before saving using the builder's preview feature

In Preview Mode, the system:
1. Loads the agent configuration from the API
2. Checks if Vapi is configured and available
3. Attempts to start a real voice call if possible
4. Falls back to simulation mode if needed
5. Provides clear status indicators and error handling

### 3. Voice Features

During a live Vapi call:
- **Start Call**: Click "Start Call" to begin voice interaction
- **Mute/Unmute**: Toggle your microphone as needed
- **Quick Actions**: Send system messages to guide the conversation
- **End Call**: Stop the voice session

## Technical Implementation

### Direct Vapi Web SDK Integration

The component uses the official [@vapi-ai/web](https://github.com/VapiAI/client-sdk-web) SDK with direct assistant configuration:

```typescript
import Vapi from '@vapi-ai/web';

// Initialize with public key
const vapi = new Vapi('pk_your_public_key_here');

// Method 1: Start with assistant configuration object (recommended)
const assistantConfig = {
  name: "My Assistant",
  model: {
    provider: "openai",
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
    ],
  },
  voice: {
    provider: "azure",
    voiceId: "en-US-JennyNeural",
  },
  firstMessage: "Hello! How can I help you today?",
  functions: [
    {
      name: "collectFormData",
      description: "Collect form data from user",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "User's name" },
          email: { type: "string", description: "User's email" }
        }
      }
    }
  ]
};

await vapi.start(assistantConfig);

// Method 2: Start with existing assistant ID (if available)
await vapi.start('assistant_id', {
  recordingEnabled: true,
  variableValues: {
    userName: "Preview User",
    agentName: config.name,
    industry: config.industry
  }
});
```

### Event Handlers

The integration handles all major Vapi events:

- `call-start`: Call initiated successfully
- `call-end`: Call terminated
- `speech-start/end`: User speech detection
- `volume-level`: Assistant voice volume
- `message`: Transcripts and function calls
- `error`: Connection and call errors

### Advanced Features

The integration supports all Vapi Web SDK features:

```typescript
// Send system messages during calls
vapi.send({
  type: 'add-message',
  message: {
    role: 'system',
    content: 'The user has pressed the button, say peanuts',
  },
});

// Make the assistant speak directly
vapi.say("Our time's up, goodbye!", true); // true = end call after speaking

// Control microphone
vapi.setMuted(true);  // Mute user microphone
vapi.setMuted(false); // Unmute user microphone
console.log(vapi.isMuted()); // Check mute status

// Stop the call
vapi.stop();
```

### Dynamic Assistant Configuration

The system automatically converts your agent configuration to Vapi format:

```typescript
const createVapiAssistant = (agentConfig) => {
  return {
    name: agentConfig.name,
    model: {
      provider: "openai",
      model: agentConfig.model,
      messages: [
        {
          role: "system",
          content: agentConfig.prompt || agentConfig.description,
        },
      ],
    },
    voice: mapVoiceToVapi(agentConfig.voice),
    firstMessage: `Hello! I'm ${agentConfig.name}...`,
    functions: generateFunctionsFromFields(agentConfig.fields),
  };
};
```

## Troubleshooting

### Common Issues

1. **"Vapi public key not configured"**
   - Check your `.env` file has `VITE_VAPI_PUBLIC_KEY`
   - Ensure the key starts with `pk_`

2. **"Using Simulation Mode"**
   - Check server logs for Vapi connection issues
   - Verify server has `VAPI_API_KEY` set
   - Ensure network connectivity to Vapi

3. **"Failed to start Vapi call"**
   - Check browser permissions for microphone
   - Verify agent has a valid Vapi assistant ID
   - Check browser console for detailed errors

### Debug Mode

Enable detailed logging by checking browser console for `[VAPI]` messages.

## Production Deployment

For production:
1. Use production Vapi API keys
2. Configure CORS properly
3. Set up webhook endpoints for Vapi events
4. Monitor call logs and analytics

## References

- [Vapi Web SDK Documentation](https://github.com/VapiAI/client-sdk-web)
- [Vapi API Documentation](https://docs.vapi.ai)
- [Vapi Dashboard](https://dashboard.vapi.ai)
