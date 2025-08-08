import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Play, MoreVertical, Bot, Calendar, Users } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'draft' | 'paused';
  calls: number;
  created: string;
  description: string;
}

interface DashboardProps {
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onPreviewAgent: (agentId: string) => void;
}

const sampleAgents: Agent[] = [
  {
    id: '1',
    name: 'Loan Application Agent',
    industry: 'Finance',
    status: 'active',
    calls: 127,
    created: '2024-01-15',
    description: 'Collects comprehensive loan application data including income, employment, and credit history.'
  },
  {
    id: '2',
    name: 'Insurance Claim Assistant',
    industry: 'Insurance',
    status: 'active',
    calls: 89,
    created: '2024-01-10',
    description: 'Guides customers through insurance claim submission with automated documentation.'
  },
  {
    id: '3',
    name: 'Shipping Order Agent',
    industry: 'Logistics',
    status: 'draft',
    calls: 0,
    created: '2024-01-20',
    description: 'Streamlines package shipping process with address verification and service selection.'
  }
];

export const Dashboard = ({ onCreateAgent, onEditAgent, onPreviewAgent }: DashboardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-voice-success';
      case 'draft': return 'bg-voice-warning';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Voice Agent Dashboard</h1>
              <p className="text-muted-foreground">Manage your conversational AI agents</p>
            </div>
            <Button variant="hero" onClick={onCreateAgent}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Agent
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Bot className="w-8 h-8 text-voice-primary" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-voice-secondary" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">1,247</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-voice-success" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">324</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="gradient-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Settings className="w-8 h-8 text-voice-warning" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Agents Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Agents</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="gradient-card shadow-card hover:shadow-glow transition-smooth cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {agent.industry}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {agent.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                        <span className="text-sm capitalize">{agent.status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {agent.calls} calls
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="voice" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => onPreviewAgent(agent.id)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEditAgent(agent.id)}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};