import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface AgentGenerationResult {
  name: string;
  description: string;
  prompt: string;
}

export const generateAgentFromDescription = async (userInput: string): Promise<AgentGenerationResult> => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that helps create voice agent configurations. Based on the user's description, generate a suitable name, description, and system prompt for a voice agent. Return the response in JSON format with exactly these fields: "name", "description", "prompt". The name should be concise (2-4 words), the description should be 1-2 sentences explaining what the agent does, and the prompt should be a detailed system instruction for the voice agent (2-3 sentences).`
        },
        {
          role: "user",
          content: `Create a voice agent for: ${userInput}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const agentData = JSON.parse(response);
    
    return {
      name: agentData.name || 'Custom Agent',
      description: agentData.description || 'A helpful voice assistant',
      prompt: agentData.prompt || 'You are a helpful voice assistant. Respond in a friendly and professional manner.'
    };
  } catch (error) {
    console.error('Error generating agent:', error);
    // Fallback response
    return {
      name: 'Custom Agent',
      description: 'A helpful voice assistant based on your requirements',
      prompt: `You are a helpful voice assistant for ${userInput}. Respond in a friendly and professional manner, focusing on helping users with their needs.`
    };
  }
};