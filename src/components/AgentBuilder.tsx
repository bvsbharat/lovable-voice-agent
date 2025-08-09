import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Save,
  Play,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Hash,
  Loader2,
} from "lucide-react";
import type { AgentConfig, FormField, AgentFunction } from "@/types/agent";
import { AgentsAPI } from "@/lib/api";

interface AgentBuilderProps {
  agentId?: string;
  onBack: () => void;
  onPreview: (config: AgentConfig) => void;
  initialConfig?: Partial<AgentConfig>;
}

const fieldTypes = [
  { type: "text", label: "Text Input", icon: FileText, color: "bg-blue-500" },
  { type: "email", label: "Email", icon: Mail, color: "bg-green-500" },
  { type: "phone", label: "Phone Number", icon: Phone, color: "bg-purple-500" },
  { type: "address", label: "Address", icon: MapPin, color: "bg-red-500" },
  { type: "date", label: "Date", icon: Calendar, color: "bg-orange-500" },
  { type: "number", label: "Number", icon: Hash, color: "bg-indigo-500" },
  {
    type: "textarea",
    label: "Long Text",
    icon: FileText,
    color: "bg-pink-500",
  },
];

export const AgentBuilder = ({ agentId, onBack, onPreview, initialConfig }: AgentBuilderProps) => {
  const { theme } = useTheme();
  const [config, setConfig] = useState<AgentConfig>({
    name: "",
    industry: "",
    description: "",
    model: "gpt-4",
    voice: "rachel",
    prompt: "",
    fields: [],
    tools: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedField, setSelectedField] = useState<FormField | null>(null);

  // Handle initial config from props (for prefill functionality)
  useEffect(() => {
    if (initialConfig && !agentId) {
      console.log('Setting initial config from props:', initialConfig);
      setConfig(prev => ({
        ...prev,
        ...initialConfig
      }));
    }
  }, [initialConfig, agentId]);

  // Load existing agent data when agentId is provided
  useEffect(() => {
    console.log('AgentBuilder useEffect triggered with agentId:', agentId);
    const loadAgentData = async () => {
      if (!agentId) {
        console.log('No agentId provided, skipping data load');
        return;
      }
      
      console.log('Starting to load agent data for ID:', agentId);
      setLoading(true);
      setLoadError(null);
      
      try {
        const agentData = await AgentsAPI.get(agentId);
        console.log('Agent data received from API:', agentData);
        console.log('Agent config structure:', {
          id: agentData.id,
          name: agentData.name,
          industry: agentData.industry,
          description: agentData.description,
          model: agentData.model,
          voice: agentData.voice,
          fields: agentData.fields,
          prompt: agentData.prompt
        });
        
        setConfig(agentData);
        console.log('Agent data successfully loaded and state updated');
      } catch (error) {
        console.error('Failed to load agent data:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response
        });
        setLoadError(error instanceof Error ? error.message : 'Failed to load agent data');
      } finally {
        setLoading(false);
      }
    };
    
    loadAgentData();
  }, [agentId]);

  // Generate collectFormData tool based on provided fields
  const generateCollectFormDataTool = (fields: FormField[]): AgentFunction => {
    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];

    fields.forEach((field) => {
      properties[field.id] = {
        type: field.type === 'number' ? 'number' : 'string',
        description: `The ${field.label.toLowerCase()} value collected from the user`,
      };
      if (field.required) {
        required.push(field.id);
      }
    });

    return {
      id: 'collectFormData',
      name: 'collectFormData',
      description: 'Collect form data from the user during conversation',
      parameters: {
        type: 'object',
        properties,
        required,
      },
    };
  };

  // Update tools whenever fields change
  const updateTools = () => {
    if (config.fields.length > 0) {
      const collectFormDataTool = generateCollectFormDataTool(config.fields);
      setConfig((prev) => ({
        ...prev,
        tools: [collectFormDataTool],
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        tools: [],
      }));
    }
  };

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as FormField["type"],
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
      placeholder: `Enter ${type}...`,
    };
    setConfig((prev) => {
      const updatedConfig = {
        ...prev,
        fields: [...prev.fields, newField],
      };
      // Generate tools for the updated config
       const collectFormDataTool = generateCollectFormDataTool(updatedConfig.fields);
      return {
        ...updatedConfig,
        tools: updatedConfig.fields.length > 0 ? [collectFormDataTool] : [],
      };
    });
  };

  const removeField = (fieldId: string) => {
    setConfig((prev) => {
      const updatedFields = prev.fields.filter((field) => field.id !== fieldId);
      return {
        ...prev,
        fields: updatedFields,
        tools: updatedFields.length > 0 ? [generateCollectFormDataTool(updatedFields)] : [],
      };
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setConfig((prev) => {
      const updatedFields = prev.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      );
      return {
        ...prev,
        fields: updatedFields,
        tools: updatedFields.length > 0 ? [generateCollectFormDataTool(updatedFields)] : [],
      };
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const fields = Array.from(config.fields);
    const [reorderedItem] = fields.splice(result.source.index, 1);
    fields.splice(result.destination.index, 0, reorderedItem);

    setConfig((prev) => ({ ...prev, fields }));
  };

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find((ft) => ft.type === type);
    return fieldType ? fieldType.icon : FileText;
  };

  const generatePrompt = () => {
    const fieldDescriptions = config.fields
      .map(
        (field) =>
          `- ${field.label} (${field.type}${
            field.required ? ", required" : ""
          })`
      )
      .join("\n");

    const prompt = `You are a professional ${config.industry} assistant specialized in data collection. Your task is to collect the following information from customers through natural conversation:

${fieldDescriptions}

Guidelines:
- Be friendly, professional, and conversational
- Ask for information in a logical order
- Validate responses appropriately
- Use the collectFormData function to store each piece of information as you collect it
- You can call collectFormData multiple times during the conversation to store different fields
- Confirm all collected data before ending the conversation
- Handle objections or questions professionally

IMPORTANT: Use the collectFormData function to store information as you collect it. The function accepts field IDs and their corresponding values. Call this function each time you successfully collect a piece of information from the user.`;

    setConfig((prev) => ({ ...prev, prompt }));
  };

  const saveAgent = async () => {
    setSaving(true);
    try {
      const payload: AgentConfig = { ...config };
      console.log("[DEBUG] Saving agent with payload:", payload);
      console.log("[DEBUG] Tools in payload:", payload.tools);
      
      let saved: AgentConfig;
      if (agentId && config.id) {
        // Update existing agent
        saved = await AgentsAPI.update(agentId, payload);
        console.log("[DEBUG] Updated agent response:", saved);
      } else {
        // Create new agent
        saved = await AgentsAPI.create(payload);
        console.log("[DEBUG] Created agent response:", saved);
      }
      
      setConfig((prev) => ({
        ...prev,
        id: saved.id,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }));
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while fetching agent data
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-voice-primary" />
          <p className="text-muted-foreground">Loading agent configuration...</p>
        </div>
      </div>
    );
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error loading agent: {loadError}</p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {agentId ? 'Edit Agent' : 'Agent Builder'}
                </h1>
                <p className="text-muted-foreground">
                  {agentId ? 'Update your conversational AI agent' : 'Design your conversational AI agent'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={generatePrompt} 
                disabled={loading}
                className={theme === 'dark' ? 'border-white hover:border-white/80' : ''}
              >
                <Settings className="w-4 h-4 mr-2" />
                Generate Prompt
              </Button>
              <Button variant="voice" onClick={saveAgent} disabled={saving || loading}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {agentId ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {agentId ? 'Update' : 'Save'}
                  </>
                )}
              </Button>
              <Button variant="hero" onClick={() => onPreview(config)} disabled={loading}>
                <Play className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter agent name..."
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={config.industry}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, industry: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what this agent does..."
                    rows={3}
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, model: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                      <SelectItem value="claude-3">Claude 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="voice">Voice</Label>
                  <Select
                    value={config.voice}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, voice: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rachel">Rachel</SelectItem>
                      <SelectItem value="josh">Josh</SelectItem>
                      <SelectItem value="aria">Aria</SelectItem>
                      <SelectItem value="sam">Sam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Field Types */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Field Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {fieldTypes.map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <Button
                        key={fieldType.type}
                        variant="outline"
                        size="sm"
                        onClick={() => addField(fieldType.type)}
                        className={`justify-start h-auto p-3 ${
                          theme === 'dark' ? 'border-white hover:border-white/80' : ''
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${fieldType.color} mr-2`}
                        />
                        <Icon className="w-4 h-4 mr-2" />
                        <span className="text-xs">{fieldType.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* System Prompt */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>System Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={config.prompt}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  placeholder="Define how your agent should behave and interact with users..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Form Fields ({config.fields.length})
                  <Badge variant="secondary">
                    {config.fields.filter((f) => f.required).length} required
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="fields">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3 min-h-[200px]"
                      >
                        {config.fields.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>
                              Add fields from the left panel to start building
                              your form
                            </p>
                          </div>
                        ) : (
                          config.fields.map((field, index) => {
                            const Icon = getFieldIcon(field.type);
                            return (
                              <Draggable
                                key={field.id}
                                draggableId={field.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`border border-border rounded-lg p-4 bg-card ${
                                      snapshot.isDragging ? "shadow-glow" : ""
                                    } ${
                                      selectedField?.id === field.id
                                        ? "ring-2 ring-voice-primary"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <Icon className="w-4 h-4 text-voice-primary" />
                                        <div>
                                          <p className="font-medium">
                                            {field.label}
                                          </p>
                                          <p className="text-sm text-muted-foreground capitalize">
                                            {field.type} •{" "}
                                            {field.required
                                              ? "Required"
                                              : "Optional"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            setSelectedField(field)
                                          }
                                        >
                                          <Settings className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeField(field.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Field Configuration Modal would go here */}
    </div>
  );
};
