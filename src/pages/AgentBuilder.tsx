import { AgentBuilder as AgentBuilderComponent } from "@/components/AgentBuilder";
import type { AgentConfig } from "@/types/agent";

interface AgentBuilderPageProps {
  agentId?: string;
  onBack: () => void;
  onPreview: (config: AgentConfig) => void;
}

export const AgentBuilderPage = ({
  agentId,
  onBack,
  onPreview,
}: AgentBuilderPageProps) => {
  console.log('AgentBuilderPage received agentId:', agentId);
  console.log('AgentBuilderPage props:', { agentId, onBack: !!onBack, onPreview: !!onPreview });
  
  return <AgentBuilderComponent agentId={agentId} onBack={onBack} onPreview={onPreview} />;
};
