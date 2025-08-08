import { AgentBuilder as AgentBuilderComponent } from "@/components/AgentBuilder";

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

interface AgentBuilderPageProps {
  onBack: () => void;
  onPreview: (config: AgentConfig) => void;
}

export const AgentBuilderPage = ({ onBack, onPreview }: AgentBuilderPageProps) => {
  return (
    <AgentBuilderComponent 
      onBack={onBack}
      onPreview={onPreview}
    />
  );
};