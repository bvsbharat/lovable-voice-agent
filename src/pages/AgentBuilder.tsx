import { AgentBuilder as AgentBuilderComponent } from "@/components/AgentBuilder";
import type { AgentConfig } from "@/types/agent";

interface AgentBuilderPageProps {
  onBack: () => void;
  onPreview: (config: AgentConfig) => void;
}

export const AgentBuilderPage = ({
  onBack,
  onPreview,
}: AgentBuilderPageProps) => {
  return <AgentBuilderComponent onBack={onBack} onPreview={onPreview} />;
};
