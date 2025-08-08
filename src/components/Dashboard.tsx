import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Play,
  MoreVertical,
  Bot,
  Calendar,
  Users,
  Trash2,
} from "lucide-react";

import type { AgentConfig } from "@/types/agent";
import { AgentsAPI } from "@/lib/api";

interface DashboardProps {
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
  onPreviewAgent: (agentId: string) => void;
}

type AgentListItem = AgentConfig & {
  _id?: string;
  status?: "active" | "draft" | "paused";
  calls?: number;
};

export const Dashboard = ({
  onCreateAgent,
  onEditAgent,
  onPreviewAgent,
}: DashboardProps) => {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await AgentsAPI.list();
        if (!mounted) return;
        const normalized: AgentListItem[] = list.map((a) => ({
          ...a,
          status: a.published ? ("active" as const) : ("draft" as const),
          calls: 0,
        }));
        setAgents(normalized);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-voice-success";
      case "draft":
        return "bg-voice-warning";
      case "paused":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    console.log("Attempting to delete agent with ID:", agentId);

    if (
      !window.confirm(
        "Are you sure you want to delete this agent? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(agentId);
    try {
      await AgentsAPI.delete(agentId);
      setAgents((prev) => prev.filter((a) => (a._id || a.id) !== agentId));
      console.log("Agent deleted successfully");
    } catch (error) {
      console.error("Failed to delete agent:", error);
      alert("Failed to delete agent. Please try again.");
    } finally {
      setDeleting(null);
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
              <p className="text-muted-foreground">
                Manage your conversational AI agents
              </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Agents
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Calls
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      This Month
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Agents
                    </p>
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
            {loading && (
              <div className="text-muted-foreground">Loading agents...</div>
            )}
            {!loading && agents.length === 0 && (
              <div className="text-muted-foreground">
                No agents yet. Create one to get started.
              </div>
            )}
            {agents.map((agent, index) => (
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{agent.industry}</Badge>
                          {agent.source === "vapi" ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 text-white"
                            >
                              Vapi
                            </Badge>
                          ) : (
                            <Badge variant="outline">Local</Badge>
                          )}
                        </div>
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
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(
                            agent.status
                          )}`}
                        />
                        <span className="text-sm capitalize">
                          {agent.status}
                        </span>
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
                        onClick={() => onPreviewAgent(agent._id || agent.id)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      {!agent.published ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={async () => {
                            const agentId = agent._id || agent.id!;
                            const updated = await AgentsAPI.publish(agentId);
                            setAgents((prev) =>
                              prev.map((a) =>
                                (a._id || a.id) === agentId
                                  ? { ...a, published: true, status: "active" }
                                  : a
                              )
                            );
                          }}
                        >
                          Publish
                        </Button>
                      ) : (
                        <Badge variant="secondary">Published</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditAgent(agent._id || agent.id)}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDeleteAgent(agent._id || agent.id!)
                        }
                        disabled={deleting === (agent._id || agent.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === (agent._id || agent.id) ? (
                          <div className="w-3 h-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
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
