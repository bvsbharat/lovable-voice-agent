import { PreviewMode as PreviewModeComponent } from "@/components/PreviewMode";

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

interface PreviewModePageProps {
  config: AgentConfig;
  onBack: () => void;
}

export const PreviewModePage = ({ config, onBack }: PreviewModePageProps) => {
  return (
    <PreviewModeComponent 
      config={config}
      onBack={onBack}
    />
  );
};