import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PreviewMode as PreviewModeComponent } from "@/components/PreviewMode";
import type { AgentConfig } from "@/types/agent";
import { AgentsAPI } from "@/lib/api";

interface PreviewModePageProps {
  config?: AgentConfig;
  onBack?: () => void;
}

export const PreviewModePage = ({
  config: propConfig,
  onBack: propOnBack,
}: PreviewModePageProps) => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AgentConfig | null>(propConfig || null);
  const [isLoading, setIsLoading] = useState(!propConfig && !!agentId);
  const [error, setError] = useState<string | null>(null);

  const handleBack = propOnBack || (() => navigate("/"));

  useEffect(() => {
    // If we have a config from props, use it
    if (propConfig) {
      setConfig(propConfig);
      setIsLoading(false);
      return;
    }

    // If we have an agentId from URL, load the agent
    if (agentId) {
      loadAgent(agentId);
    } else {
      setError("No agent ID provided");
      setIsLoading(false);
    }
  }, [agentId, propConfig]);

  const loadAgent = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading agent for preview:", id);

      const agentConfig = await AgentsAPI.get(id);
      console.log("Loaded agent config:", agentConfig);

      // Ensure the config has an ID field for the preview component
      const configWithId: AgentConfig = {
        ...agentConfig,
        id: agentConfig.id || agentConfig._id || id,
      };

      setConfig(configWithId);
    } catch (error) {
      console.error("Failed to load agent for preview:", error);
      setError(error instanceof Error ? error.message : "Failed to load agent");

      // Create a fallback config for demo purposes if API fails
      const fallbackConfig: AgentConfig = {
        id: id,
        name: "Demo Agent",
        industry: "General",
        description: "Demo agent for preview (API unavailable)",
        model: "gpt-3.5-turbo",
        voice: "rachel",
        prompt: "You are a helpful assistant.",
        fields: [
          {
            id: "1",
            type: "text",
            label: "Full Name",
            required: true,
            placeholder: "Enter your full name",
          },
          {
            id: "2",
            type: "email",
            label: "Email Address",
            required: true,
            placeholder: "Enter your email",
          },
        ],
      };
      setConfig(fallbackConfig);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto animate-spin rounded-full border-2 border-voice-primary border-t-transparent" />
          <p className="text-muted-foreground">
            Loading agent configuration...
          </p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error loading agent: {error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            No agent configuration available
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <PreviewModeComponent config={config} onBack={handleBack} />;
};
