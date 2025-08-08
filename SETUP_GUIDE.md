# Vapi Voice Agent Setup Guide

This guide will help you set up the Vapi integration for real voice agent functionality.

## Prerequisites

1. A Vapi account (sign up at [vapi.ai](https://vapi.ai))
2. OpenAI API key (for the AI model)
3. Node.js and npm installed

## Step 1: Get Your Vapi API Keys

1. Go to your [Vapi Dashboard](https://dashboard.vapi.ai)
2. Navigate to **API Keys** section
3. Copy your:
   - **Public Key** (starts with `pk_`)
   - **Private Key** (starts with `sk_`)

## Step 2: Set Up Environment Variables

### Frontend Environment (.env in root directory)

Create a `.env` file in the root directory:

```env
VITE_VAPI_PUBLIC_KEY=pk_your_public_key_here
VITE_API_BASE=http://localhost:8081
```

### Backend Environment (server/.env)

Create a `.env` file in the `server/` directory:

```env
VAPI_API_KEY=sk_your_private_key_here
MONGODB_URI=mongodb://localhost:27017/voice-agents
PORT=8081
CORS_ORIGIN=http://localhost:5173
```

## Step 3: Install Dependencies

The Vapi Server SDK is already installed. If you need to reinstall:

```bash
cd server
npm install @vapi-ai/server-sdk
```

## Step 4: Start the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```

## Step 5: Test the Integration

1. Open your browser to `http://localhost:5173`
2. Create a new agent using the Agent Builder
3. Click "Save" to create the agent (this will create both local and Vapi agents)
4. Click "Preview" to test the voice functionality
5. Click "Start Call" to begin a real voice conversation

## Troubleshooting

### Common Issues

1. **"Vapi public key not configured"**
   - Check that your `.env` file exists in the root directory
   - Verify the public key starts with `pk_`
   - Restart the development server after adding environment variables

2. **"Vapi agent creation failed"**
   - Check that your `.env` file exists in the `server/` directory
   - Verify the private key starts with `sk_`
   - Check the server console for detailed error messages
   - Restart the backend server

3. **"Failed to start Vapi call"**
   - Ensure microphone permissions are granted in your browser
   - Check browser console for detailed error messages
   - Verify the agent was created successfully (check for "Vapi Ready" badge)

### Status Indicators

- **🟢 Vapi Ready**: Everything is configured correctly
- **🟡 Local Agent**: Agent created locally but not in Vapi (missing API keys)
- **🔴 Simulation Mode**: Fallback mode when Vapi is not available

### Browser Requirements

- Chrome, Firefox, Safari, or Edge (latest versions)
- Microphone access required for voice functionality
- HTTPS required in production (development works with HTTP on localhost)

## Features

Once properly configured, you'll have:

1. **Real-time voice conversations** with your custom agents
2. **Automatic agent creation** in Vapi when saving agents
3. **Live transcription** of conversations
4. **Graceful fallback** to simulation mode if Vapi is unavailable

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the server logs for backend issues
3. Verify your API keys are correct and have proper permissions
4. Refer to the [Vapi Documentation](https://docs.vapi.ai) for API details

## Security Notes

- Never commit `.env` files to version control
- Keep your private API keys secure
- Use environment variables in production deployments
- The public key is safe to use in frontend applications
