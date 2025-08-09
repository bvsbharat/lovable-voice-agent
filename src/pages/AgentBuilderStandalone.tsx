import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AgentBuilder as AgentBuilderComponent } from "@/components/AgentBuilder";
import { generateAgentFromDescription } from "@/lib/openai";
import type { AgentConfig } from "@/types/agent";
import { Loader2 } from "lucide-react";

export const AgentBuilderStandalone = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [initialConfig, setInitialConfig] = useState<Partial<AgentConfig> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      generateInitialConfig(query);
    }
  }, [searchParams]);

  const generateInitialConfig = async (query: string) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log('Generating agent config from query:', query);
      const generatedAgent = await generateAgentFromDescription(query);
      console.log('Generated agent config:', generatedAgent);
      
      setInitialConfig({
        name: generatedAgent.name,
        description: generatedAgent.description,
        prompt: generatedAgent.prompt,
        industry: "General", // Default industry
        model: "gpt-4",
        voice: "rachel",
        fields: [],
        tools: []
      });
    } catch (error) {
      console.error('Failed to generate agent config:', error);
      setError('Failed to generate agent configuration. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handlePreview = (config: AgentConfig) => {
    // For preview, we can navigate to a preview page or handle it differently
    console.log('Preview config:', config);
    // You could save the config and navigate to preview
    // For now, let's just log it
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-voice-primary" />
          <p className="text-muted-foreground">Generating your agent configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AgentBuilderComponent 
      onBack={handleBack} 
      onPreview={handlePreview}
      initialConfig={initialConfig}
    />
  );
};