import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import {
  Plus,
  Settings,
  Play,
  MoreVertical,
  Bot,
  Calendar,
  Users,
  Trash2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Copy,
  RefreshCw,
  CheckSquare,
  Square,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle,
  Clock,
  Folder,
  BarChart3,
  Wallet,
  Activity,
  Phone,
  Mic,
  MessageSquare,
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
  source?: "local" | "vapi";
  vapiAgentId?: string;
  syncStatus?: "synced" | "pending" | "error" | "none";
  lastSyncAt?: string;
};

type FilterOptions = {
  source: "all" | "local" | "vapi";
  status: "all" | "active" | "draft" | "paused";
  industry: string;
  model: string;
};

type SortOption = {
  field: "name" | "createdAt" | "calls" | "status";
  direction: "asc" | "desc";
};

export const Dashboard = ({
  onCreateAgent,
  onEditAgent,
  onPreviewAgent,
}: DashboardProps) => {
  const { theme, setTheme } = useTheme();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    source: "all",
    status: "all",
    industry: "all",
    model: "all",
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    field: "createdAt",
    direction: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filter options
  const uniqueIndustries = useMemo(() => {
    const industries = agents.map(agent => agent.industry).filter(Boolean);
    return [...new Set(industries)];
  }, [agents]);

  const uniqueModels = useMemo(() => {
    const models = agents.map(agent => agent.model).filter(Boolean);
    return [...new Set(models)];
  }, [agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = agent.name?.toLowerCase().includes(query);
        const matchesDescription = agent.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Source filter
      if (filters.source !== "all" && agent.source !== filters.source) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && agent.status !== filters.status) {
        return false;
      }

      // Industry filter
      if (filters.industry !== "all" && agent.industry !== filters.industry) {
        return false;
      }

      // Model filter
      if (filters.model !== "all" && agent.model !== filters.model) {
        return false;
      }

      return true;
    });

    // Sort agents
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOption.field) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "createdAt":
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case "calls":
          aValue = a.calls || 0;
          bValue = b.calls || 0;
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default:
          return 0;
      }

      if (sortOption.direction === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [agents, searchQuery, filters, sortOption]);

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


  const handleDeleteAgent = async (agentId: string) => {
    console.log("Attempting to delete agent with ID:", agentId);

    if (
      !window.confirm(
        "Are you sure you want to delete this agent? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingId(agentId);
    try {
      await AgentsAPI.delete(agentId);
      setAgents((prev) => prev.filter((a) => (a._id || a.id) !== agentId));
      toast.success("Agent deleted successfully");
    } catch (error) {
      console.error("Failed to delete agent:", error);
      toast.error("Failed to delete agent. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAgents.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedAgents.size} agent(s)?`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const deletePromises = Array.from(selectedAgents).map(agentId => 
        AgentsAPI.delete(agentId)
      );
      await Promise.all(deletePromises);
      
      setAgents(prev => prev.filter(agent => 
        !selectedAgents.has(agent.id || agent._id || "")
      ));
      setSelectedAgents(new Set());
      toast.success(`${selectedAgents.size} agent(s) deleted successfully`);
    } catch (error) {
      console.error("Failed to delete agents:", error);
      toast.error("Failed to delete some agents. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedAgents.size === 0) return;

    setBulkLoading(true);
    try {
      const publishPromises = Array.from(selectedAgents).map(agentId => 
        AgentsAPI.publish(agentId, publish)
      );
      await Promise.all(publishPromises);
      
      setAgents(prev => prev.map(agent => {
        if (selectedAgents.has(agent.id || agent._id || "")) {
          return { ...agent, published: publish };
        }
        return agent;
      }));
      setSelectedAgents(new Set());
      toast.success(`${selectedAgents.size} agent(s) ${publish ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error("Failed to publish agents:", error);
      toast.error("Failed to publish some agents. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSyncAgent = async (agentId: string) => {
    setSyncingId(agentId);
    try {
      await AgentsAPI.sync(agentId);
      
      setAgents(prev => prev.map(agent => {
        if ((agent.id || agent._id) === agentId) {
          return { 
            ...agent, 
            syncStatus: "synced", 
            lastSyncAt: new Date().toISOString() 
          };
        }
        return agent;
      }));
      toast.success("Agent synced successfully");
    } catch (error) {
      console.error("Failed to sync agent:", error);
      toast.error("Failed to sync agent. Please try again.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDuplicateAgent = async (agent: AgentListItem) => {
    const agentId = agent.id || agent._id;
    if (!agentId) return;

    setDuplicatingId(agentId);
    try {
      const duplicatedAgent = {
        ...agent,
        name: `${agent.name} (Copy)`,
        id: undefined,
        _id: undefined,
        published: false,
        createdAt: new Date().toISOString(),
      };
      
      const newAgent = await AgentsAPI.create(duplicatedAgent);
      setAgents(prev => [newAgent, ...prev]);
      toast.success("Agent duplicated successfully");
    } catch (error) {
      console.error("Failed to duplicate agent:", error);
      toast.error("Failed to duplicate agent. Please try again.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleSelectAgent = (agentId: string, selected: boolean) => {
    setSelectedAgents(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(agentId);
      } else {
        newSet.delete(agentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = filteredAndSortedAgents
        .map(agent => agent.id || agent._id)
        .filter(Boolean) as string[];
      setSelectedAgents(new Set(allIds));
    } else {
      setSelectedAgents(new Set());
    }
  };

  const getSyncStatusIcon = (syncStatus?: string) => {
    switch (syncStatus) {
      case "synced":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAgentCardGradient = (index: number) => {
    const gradients = [
      "gradient-green",
      "gradient-orange", 
      "gradient-purple",
      "gradient-blue",
      "gradient-pink",
      "gradient-teal"
    ];
    return gradients[index % gradients.length];
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Voice Agent Dashboard</h1>
              <p className="text-muted-foreground">
                Manage and monitor your AI voice agents
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className={`rounded-xl border-2 transition-all duration-300 h-10 w-10 hover:shadow-lg ${
                  theme === 'dark' ? 'border-white hover:border-white/80' : 'border-border hover:border-border/80'
                }`}
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button 
                onClick={onCreateAgent}
                className="bg-black hover:bg-gray-800 text-white border-0 rounded-xl px-6 py-2.5 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Agent
              </Button>
            </div>
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
            <Card className="gradient-green shadow-card border-0 text-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Folder className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/90">
                        Total Agents
                      </p>
                      <p className="text-2xl font-bold text-white">{agents.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">+12%</p>
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
            <Card className="gradient-orange shadow-card border-0 text-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/90">
                        Total Calls
                      </p>
                      <p className="text-2xl font-bold text-white">1,247</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">+8%</p>
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
            <Card className="gradient-blue shadow-card border-0 text-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/90">
                        This Month
                      </p>
                      <p className="text-2xl font-bold text-white">324</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">+15%</p>
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
            <Card className="gradient-purple shadow-card border-0 text-white rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/90">
                        Active Agents
                      </p>
                      <p className="text-2xl font-bold text-white">{agents.filter(a => a.published).length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">+5%</p>
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
            <div className="flex items-center gap-2">
              {selectedAgents.size > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedAgents.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublish(true)}
                    disabled={bulkLoading}
                    className={theme === 'dark' ? 'border-white hover:border-white/80' : ''}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkPublish(false)}
                    disabled={bulkLoading}
                    className={theme === 'dark' ? 'border-white hover:border-white/80' : ''}
                  >
                    Unpublish
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 ${
                  theme === 'dark' ? 'border-white hover:border-white/80' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={`gap-2 ${
                    theme === 'dark' ? 'border-white hover:border-white/80' : ''
                  }`}>
                    {sortOption.direction === "asc" ? (
                      <SortAsc className="h-4 w-4" />
                    ) : (
                      <SortDesc className="h-4 w-4" />
                    )}
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "name", direction: "asc" })}
                  >
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "name", direction: "desc" })}
                  >
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "createdAt", direction: "desc" })}
                  >
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "createdAt", direction: "asc" })}
                  >
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "calls", direction: "desc" })}
                  >
                    Most Calls
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortOption({ field: "status", direction: "asc" })}
                  >
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg"
              >
                <div>
                  <label className="text-sm font-medium mb-2 block">Source</label>
                  <Select
                    value={filters.source}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, source: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="vapi">VAPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Industry</label>
                  <Select
                    value={filters.industry}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {uniqueIndustries.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select
                    value={filters.model}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      {uniqueModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </div>

          {/* Select All Checkbox */}
          {filteredAndSortedAgents.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedAgents.size === filteredAndSortedAgents.length && filteredAndSortedAgents.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredAndSortedAgents.length} agents)
              </span>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading && (
              <div className="text-muted-foreground">Loading agents...</div>
            )}
            {!loading && filteredAndSortedAgents.length === 0 && (
              <div className="text-muted-foreground">
                {agents.length === 0 ? "No agents yet. Create one to get started." : "No agents match your filters."}
              </div>
            )}
            {filteredAndSortedAgents.map((agent, index) => {
               const agentId = agent.id || agent._id || "";
               const isSelected = selectedAgents.has(agentId);
               
               return (
                 <motion.div
                   key={agentId}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.5, delay: index * 0.1 }}
                 >
                   <Card className={`${getAgentCardGradient(index)} shadow-card hover:shadow-glow transition-smooth cursor-pointer border-0 text-white rounded-2xl ${isSelected ? 'ring-2 ring-white/50' : ''}`}>
                     <CardHeader className="pb-4">
                       <div className="flex items-start justify-between">
                         <div className="flex items-start gap-3">
                           <Checkbox
                             checked={isSelected}
                             onCheckedChange={(checked) => handleSelectAgent(agentId, checked as boolean)}
                             onClick={(e) => e.stopPropagation()}
                             className="border-white/30 data-[state=checked]:bg-white/20 data-[state=checked]:border-white"
                           />
                           <div className="flex items-center gap-3">
                             <div className="p-3 bg-white/20 rounded-xl">
                               <Mic className="w-6 h-6 text-white" />
                             </div>
                             <div>
                               <CardTitle className={`text-lg ${theme === 'dark' ? 'text-gray-900' : 'text-white'}`}>{agent.name}</CardTitle>
                               <div className="flex items-center gap-2 mt-1">
                                 <Badge variant="secondary" className={`${theme === 'dark' ? 'bg-white/20 text-gray-900 border-gray-700' : 'bg-white/20 text-white border-white/30'}`}>{agent.industry}</Badge>
                                 {agent.source === "vapi" ? (
                                   <Badge
                                     variant="default"
                                     className={`${theme === 'dark' ? 'bg-white/20 text-gray-900 border-gray-700' : 'bg-white/20 text-white border-white/30'}`}
                                   >
                                     <div className="flex items-center gap-1">
                                       {getSyncStatusIcon(agent.syncStatus)}
                                       Vapi
                                     </div>
                                   </Badge>
                                 ) : (
                                   <Badge variant="outline" className={`${theme === 'dark' ? 'bg-white/10 text-gray-800 border-gray-700' : 'bg-white/10 text-white/80 border-white/30'}`}>Local</Badge>
                                 )}
                               </div>
                             </div>
                           </div>
                         </div>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="text-white hover:bg-white/20 rounded-lg">
                               <MoreVertical className="w-4 h-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent className="rounded-xl">
                             <DropdownMenuItem onClick={() => onEditAgent(agentId)}>
                               <Settings className="w-4 h-4 mr-2" />
                               Edit
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleDuplicateAgent(agent)}>
                               <Copy className="w-4 h-4 mr-2" />
                               Duplicate
                             </DropdownMenuItem>
                             {agent.source === "vapi" && (
                                <DropdownMenuItem onClick={() => handleSyncAgent(agentId)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Sync with VAPI
                                </DropdownMenuItem>
                              )}
                             <DropdownMenuSeparator />
                             <DropdownMenuItem 
                               onClick={() => handleDeleteAgent(agentId)}
                               className="text-red-600"
                             >
                               <Trash2 className="w-4 h-4 mr-2" />
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </CardHeader>
                     <CardContent>
                       {agent.prompt ? (
                          <div className="bg-black/10 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`} />
                              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-800' : 'text-white/80'}`}>System Prompt</p>
                            </div>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-900' : 'text-white/90'} leading-relaxed overflow-hidden`} style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.4em',
                              maxHeight: '4.2em'
                            }}>
                              {agent.prompt}
                            </p>
                          </div>
                        ) : (
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-800' : 'text-white/80'} mb-4 leading-relaxed`}>
                            {agent.description}
                          </p>
                        )}

                       <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1">
                             <Phone className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`} />
                             <span className={`text-sm ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`}>
                               {agent.status || "Active"}
                             </span>
                           </div>
                           <div className="flex items-center gap-1">
                             <Activity className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`} />
                             <span className={`text-sm ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`}>
                               {agent.calls || 0} calls
                             </span>
                           </div>
                         </div>
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                           agent.published
                             ? theme === 'dark' ? 'bg-white/20 text-gray-900' : 'bg-white/20 text-white'
                             : theme === 'dark' ? 'bg-white/10 text-gray-700' : 'bg-white/10 text-white/70'
                         }`}>
                           {agent.published ? '● Published' : '○ Draft'}
                         </span>
                       </div>

                       {/* Model and Voice Info */}
                       <div className="flex items-center gap-3 mb-4">
                         {agent.model && (
                           <span className={`text-xs px-2 py-1 rounded-md font-mono bg-white/10 ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`}>
                             {agent.model}
                           </span>
                         )}
                         {agent.voice && (
                           <span className={`text-xs px-2 py-1 rounded-md bg-white/10 ${theme === 'dark' ? 'text-gray-700' : 'text-white/70'}`}>
                             Voice: {agent.voice}
                           </span>
                         )}
                       </div>

                       {/* Sync Status for VAPI agents */}
                       {agent.source === "vapi" && agent.lastSyncAt && (
                         <div className={`flex items-center gap-1 mb-4 text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-white/60'}`}>
                           <Clock className="w-3 h-3" />
                           <span>Last sync: {new Date(agent.lastSyncAt).toLocaleDateString()}</span>
                         </div>
                       )}

                       <div className="flex items-center gap-2">
                         <Button
                           variant="default"
                           size="sm"
                           onClick={() => onPreviewAgent(agentId)}
                           className="flex-1 bg-black hover:bg-gray-800 text-white border-0"
                         >
                           <Play className="w-3 h-3 mr-1" />
                           Preview
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => onEditAgent(agentId)}
                           className="bg-black hover:bg-gray-800 text-white border-black"
                         >
                           <Settings className="w-3 h-3" />
                         </Button>
                         {duplicatingId === agentId && (
                           <div className="w-8 h-8 flex items-center justify-center">
                             <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 </motion.div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
};
