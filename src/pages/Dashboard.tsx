import { Dashboard as DashboardComponent } from "@/components/Dashboard";

interface DashboardPageProps {
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onPreviewAgent: (agentId: string) => void;
}

export const DashboardPage = ({ onCreateAgent, onEditAgent, onPreviewAgent }: DashboardPageProps) => {
  return (
    <DashboardComponent 
      onCreateAgent={onCreateAgent}
      onEditAgent={onEditAgent}
      onPreviewAgent={onPreviewAgent}
    />
  );
};