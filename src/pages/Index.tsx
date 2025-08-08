import { useState } from "react";
import { LandingHero } from "@/components/LandingHero";
import { DashboardPage } from "./Dashboard";
import { AgentBuilderPage } from "./AgentBuilder";
import { PreviewModePage } from "./PreviewMode";

type AppState = 'landing' | 'dashboard' | 'builder' | 'preview';

interface AgentConfig {
  name: string;
  industry: string;
  description: string;
  model: string;
  voice: string;
  prompt: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
  }>;
}

const Index = () => {
  const [currentView, setCurrentView] = useState<AppState>('landing');
  const [previewConfig, setPreviewConfig] = useState<AgentConfig | null>(null);

  const handleExplore = () => {
    setCurrentView('dashboard');
  };

  const handleCreateAgent = () => {
    setCurrentView('builder');
  };

  const handleEditAgent = (agentId: string) => {
    // In a real app, this would load the agent config from API
    console.log('Editing agent:', agentId);
    setCurrentView('builder');
  };

  const handlePreviewAgent = (agentId: string) => {
    // In a real app, this would load the agent config from API
    console.log('Previewing agent:', agentId);
    // Mock config for demo
    const mockConfig: AgentConfig = {
      name: 'Demo Agent',
      industry: 'Finance',
      description: 'Demo agent for preview',
      model: 'gpt-4',
      voice: 'rachel',
      prompt: 'Demo prompt',
      fields: [
        { id: '1', type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your full name' },
        { id: '2', type: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
      ]
    };
    setPreviewConfig(mockConfig);
    setCurrentView('preview');
  };

  const handlePreviewFromBuilder = (config: AgentConfig) => {
    setPreviewConfig(config);
    setCurrentView('preview');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleBackToBuilder = () => {
    setCurrentView('builder');
  };

  switch (currentView) {
    case 'landing':
      return <LandingHero onExplore={handleExplore} />;
    
    case 'dashboard':
      return (
        <DashboardPage 
          onCreateAgent={handleCreateAgent}
          onEditAgent={handleEditAgent}
          onPreviewAgent={handlePreviewAgent}
        />
      );
    
    case 'builder':
      return (
        <AgentBuilderPage 
          onBack={handleBackToDashboard}
          onPreview={handlePreviewFromBuilder}
        />
      );
    
    case 'preview':
      return previewConfig ? (
        <PreviewModePage 
          config={previewConfig}
          onBack={handleBackToBuilder}
        />
      ) : (
        <div>Loading...</div>
      );
    
    default:
      return <LandingHero onExplore={handleExplore} />;
  }
};

export default Index;
