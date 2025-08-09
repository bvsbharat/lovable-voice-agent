import { useState } from "react";
import { DashboardPage as Dashboard } from "./Dashboard";
import { AgentBuilderPage } from "./AgentBuilder";
import { PreviewModePage } from "./PreviewMode";
import type { AgentConfig } from "@/types/agent";

type DashboardState = "dashboard" | "builder" | "preview";

const DashboardPage = () => {
  const [currentView, setCurrentView] = useState<DashboardState>("dashboard");
  const [previewConfig, setPreviewConfig] = useState<AgentConfig | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  const handleCreateAgent = () => {
    setEditingAgentId(null);
    setCurrentView("builder");
  };

  const handleEditAgent = (agentId: string) => {
    console.log("Editing agent:", agentId);
    setEditingAgentId(agentId);
    setCurrentView("builder");
  };

  const handlePreviewAgent = (agentId: string) => {
    // Navigate to the preview route with the agent ID
    console.log("Navigating to preview for agent:", agentId);
    window.location.href = `/preview/${agentId}`;
  };

  const handlePreviewFromBuilder = (config: AgentConfig) => {
    // Ensure the config has an ID for preview functionality
    const configWithId: AgentConfig = {
      ...config,
      id: config.id || `builder_preview_${Date.now()}`,
    };
    setPreviewConfig(configWithId);
    setPreviewError(null);
    setCurrentView("preview");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
  };

  const handleBackToBuilder = () => {
    setCurrentView("builder");
  };

  switch (currentView) {
    case "dashboard":
      return (
        <Dashboard
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
          onPreviewAgent={handlePreviewAgent}
        />
      );

    case "builder":
      return (
        <AgentBuilderPage
          agentId={editingAgentId || undefined}
          onBack={handleBackToDashboard}
          onPreview={handlePreviewFromBuilder}
        />
      );

    case "preview":
      if (isLoadingPreview) {
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

      if (previewError) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-destructive">
                Error loading agent: {previewError}
              </p>
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      }

      return previewConfig ? (
        <PreviewModePage config={previewConfig} onBack={handleBackToBuilder} />
      ) : (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              No agent configuration available
            </p>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );

    default:
      return (
        <Dashboard
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
          onPreviewAgent={handlePreviewAgent}
        />
      );
  }
};

export default DashboardPage;