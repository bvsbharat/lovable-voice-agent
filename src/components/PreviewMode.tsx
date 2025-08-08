import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  User,
  CheckCircle,
  Circle,
  Bot,
  AlertCircle,
} from "lucide-react";
import type { AgentConfig } from "@/types/agent";
import { AgentsAPI } from "@/lib/api";
import Vapi from "@vapi-ai/web";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface CollectedData {
  [fieldId: string]: string;
}

interface PreviewModeProps {
  config: AgentConfig;
  onBack: () => void;
}

export const PreviewMode = ({ config, onBack }: PreviewModeProps) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [conversationStep, setConversationStep] = useState<
    "intro" | "collecting" | "confirming" | "complete"
  >("intro");
  const [transcript, setTranscript] = useState<
    Array<{ speaker: "agent" | "user"; message: string }>
  >([]);
  const [vapiError, setVapiError] = useState<string | null>(null);
  const [hasVapiAgent, setHasVapiAgent] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const vapiRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const progress =
    (Object.keys(collectedData).length / config.fields.length) * 100;
  const completedFields = Object.keys(collectedData);

  // Debug logging for collected data
  useEffect(() => {
    console.log("[DEBUG] Collected data updated:", collectedData);
    console.log("[DEBUG] Progress:", progress, "%");
    console.log("[DEBUG] Completed fields:", completedFields);
  }, [collectedData, progress, completedFields]);

  // Simulate voice conversation
  const startCall = () => {
    setIsCallActive(true);
    setConversationStep("intro");
    addToTranscript(
      "agent",
      `Hello! I'm ${config.name}, your ${config.industry} assistant. I'll help you get started today. Let me collect some information from you.`
    );

    // Simulate starting data collection after intro
    setTimeout(() => {
      if (config.fields.length > 0) {
        setConversationStep("collecting");
        setCurrentField(config.fields[0].id);
        addToTranscript(
          "agent",
          `Let's start with your ${config.fields[0].label.toLowerCase()}. ${
            config.fields[0].placeholder || ""
          }`
        );
      }
    }, 2000);
  };

  // Initialize Vapi Web SDK
  useEffect(() => {
    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (publicKey && publicKey !== "your_vapi_public_key_here") {
      try {
        vapiRef.current = new Vapi(publicKey);

        // Set up event listeners
        vapiRef.current.on("call-start", () => {
          console.log("[VAPI] Call started");
          setIsCallActive(true);
          setIsConnecting(false);
          setVapiError(null);
          setCallDuration(0);
          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        });

        vapiRef.current.on("call-end", () => {
          console.log("[VAPI] Call ended");
          setIsCallActive(false);
          setIsConnecting(false);
          setVolumeLevel(0);
          // Clear call timer
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
        });

        vapiRef.current.on("speech-start", () => {
          console.log("[VAPI] User started speaking");
        });

        vapiRef.current.on("speech-end", () => {
          console.log("[VAPI] User stopped speaking");
        });

        vapiRef.current.on("volume-level", (volume: number) => {
          setVolumeLevel(volume);
        });

        vapiRef.current.on("message", (message: any) => {
          console.log("[VAPI] Message received:", message);

          // Handle different message types
          if (message.type === "transcript") {
            if (message.transcriptType === "final") {
              addToTranscript(
                message.role === "assistant" ? "agent" : "user",
                message.transcript
              );
            }
          }
          // Handle speech updates
          else if (message.type === "speech-update") {
            if (message.status === "started") {
              console.log("[VAPI] Agent started speaking");
            } else if (message.status === "stopped") {
              console.log("[VAPI] Agent stopped speaking");
            }
          }
          // Handle function calls (multiple possible formats)
          else if (
            message.type === "function-call" ||
            message.type === "function_call"
          ) {
            console.log("[VAPI] Function call received:", message);

            // Try different possible structures for function call data
            const functionCall =
              message.functionCall || message.function_call || message.call;
            const functionName = functionCall?.name || message.name;
            const functionArgs =
              functionCall?.parameters ||
              functionCall?.arguments ||
              message.parameters ||
              message.arguments;

            console.log("[VAPI] Function name:", functionName);
            console.log("[VAPI] Function args:", functionArgs);
            console.log("[VAPI] Expected field IDs:", config.fields.map(f => f.id));

            if (functionName === "collectFormData" && functionArgs) {
              console.log(
                "[VAPI] Processing form data collection:",
                functionArgs
              );

              // Update collected data from function call
              Object.entries(functionArgs).forEach(([fieldId, value]) => {
                if (value && typeof value === "string" && value.trim()) {
                  console.log(`[VAPI] Setting field ${fieldId} = ${value}`);
                  
                  // Check if this field ID exists in our config
                  const fieldExists = config.fields.some(f => f.id === fieldId);
                  if (!fieldExists) {
                    console.warn(`[VAPI] Field ID ${fieldId} not found in config. Available fields:`, config.fields.map(f => f.id));
                  }
                  
                  setCollectedData((prev) => {
                    const updated = { ...prev, [fieldId]: value as string };
                    console.log("[VAPI] Updated collected data:", updated);
                    return updated;
                  });

                  // Also add to transcript to show the collection
                  addToTranscript("agent", `✓ Collected ${fieldId}: ${value}`);
                }
              });

              // Update conversation progress
              setConversationStep("collecting");
            }
          }
          // Handle tool calls (alternative format)
          else if (
            message.type === "tool-calls" ||
            message.type === "tool_calls"
          ) {
            console.log("[VAPI] Tool calls received:", message);
            console.log("[VAPI] Expected field IDs:", config.fields.map(f => f.id));

            const toolCalls = message.toolCalls || message.tool_calls || [];
            toolCalls.forEach((toolCall: any) => {
              if (toolCall.function?.name === "collectFormData") {
                const args = JSON.parse(toolCall.function.arguments || "{}");
                console.log("[VAPI] Tool call args:", args);

                Object.entries(args).forEach(([fieldId, value]) => {
                  if (value && typeof value === "string" && value.trim()) {
                    console.log(
                      `[VAPI] Setting field from tool call ${fieldId} = ${value}`
                    );
                    
                    // Check if this field ID exists in our config
                    const fieldExists = config.fields.some(f => f.id === fieldId);
                    if (!fieldExists) {
                      console.warn(`[VAPI] Field ID ${fieldId} not found in config. Available fields:`, config.fields.map(f => f.id));
                    }
                    
                    setCollectedData((prev) => ({
                      ...prev,
                      [fieldId]: value as string,
                    }));
                    addToTranscript(
                      "agent",
                      `✓ Collected ${fieldId}: ${value}`
                    );
                  }
                });
              }
            });
          }
          // Log other message types for debugging
          else {
            console.log(
              "[VAPI] Unhandled message type:",
              message.type,
              message
            );
          }
        });

        // Add specific handler for function calls
        vapiRef.current.on("function-call", (functionCall: any) => {
          console.log("[VAPI] Function call event received:", functionCall);
          console.log("[VAPI] Expected field IDs:", config.fields.map(f => f.id));
          
          if (functionCall.name === "collectFormData" && functionCall.parameters) {
            console.log("[VAPI] Processing function call data collection:", functionCall.parameters);
            
            Object.entries(functionCall.parameters).forEach(([fieldId, value]) => {
              if (value && typeof value === "string" && value.trim()) {
                console.log(`[VAPI] Setting field from function call event ${fieldId} = ${value}`);
                
                // Check if this field ID exists in our config
                const fieldExists = config.fields.some(f => f.id === fieldId);
                if (!fieldExists) {
                  console.warn(`[VAPI] Field ID ${fieldId} not found in config. Available fields:`, config.fields.map(f => f.id));
                }
                
                setCollectedData((prev) => {
                  const updated = { ...prev, [fieldId]: value as string };
                  console.log("[VAPI] Updated collected data from function call event:", updated);
                  return updated;
                });
                
                addToTranscript("agent", `✓ Collected ${fieldId}: ${value}`);
              }
            });
            
            setConversationStep("collecting");
          }
        });

        // Add comprehensive event logging to catch all Vapi events
        const eventTypes = ['call-start', 'call-end', 'speech-start', 'speech-end', 'volume-level', 'transcript', 'tool-calls', 'assistant-request', 'hang'];
        eventTypes.forEach(eventType => {
          vapiRef.current?.on(eventType, (data: any) => {
            console.log(`[VAPI] Event ${eventType}:`, data);
            if (eventType === 'tool-calls' && data) {
              console.log("[VAPI] Tool calls detected in event:", data);
              // Handle tool calls from this event
              if (Array.isArray(data)) {
                data.forEach((toolCall: any) => {
                  if (toolCall.function?.name === "collectFormData") {
                    try {
                      const args = typeof toolCall.function.arguments === 'string' 
                        ? JSON.parse(toolCall.function.arguments) 
                        : toolCall.function.arguments;
                      console.log("[VAPI] Tool call args from event:", args);
                      
                      Object.entries(args).forEach(([fieldId, value]) => {
                        if (value && typeof value === "string" && value.trim()) {
                          console.log(`[VAPI] Setting field from tool call event ${fieldId} = ${value}`);
                          
                          setCollectedData((prev) => {
                            const updated = { ...prev, [fieldId]: value as string };
                            console.log("[VAPI] Updated collected data from tool call event:", updated);
                            return updated;
                          });
                          
                          addToTranscript("agent", `✓ Collected ${fieldId}: ${value}`);
                        }
                      });
                    } catch (error) {
                      console.error("[VAPI] Error parsing tool call arguments:", error);
                    }
                  }
                });
              }
            }
          });
        });

        vapiRef.current.on("error", (error: any) => {
          console.error("[VAPI] Error:", error);
          setVapiError(error.message || "Vapi call failed");
          setIsCallActive(false);
          setIsConnecting(false);
          // Clear call timer
          if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
          }
        });
      } catch (error) {
        console.error("[VAPI] Failed to initialize:", error);
        setVapiError("Failed to initialize Vapi Web SDK");
      }
    } else {
      console.warn("[VAPI] Public key not configured");
      setVapiError("Vapi public key not configured");
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      // Clear call timer on cleanup
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, []);

  // Create Vapi assistant configuration from agent config
  const createVapiAssistant = (agentConfig: AgentConfig) => {
    console.log("[DEBUG] Creating Vapi assistant with config:", agentConfig);
    console.log("[DEBUG] Agent tools:", agentConfig.tools);
    console.log("[DEBUG] Agent fields:", agentConfig.fields);
    
    // Map voice names to Vapi voice configurations
    const voiceMapping: Record<string, any> = {
      rachel: { provider: "azure", voiceId: "en-US-JennyNeural" },
      josh: { provider: "azure", voiceId: "en-US-GuyNeural" },
      aria: { provider: "11labs", voiceId: "pNInz6obpgDQGcFmaJgB" },
      sam: { provider: "playht", voiceId: "sam" },
    };

    // Map model names to Vapi model configurations
    const getModelConfig = (model: string) => {
      switch (model) {
        case "gpt-4":
          return { provider: "openai", model: "gpt-4" };
        case "gpt-3.5-turbo":
          return { provider: "openai", model: "gpt-3.5-turbo" };
        case "claude-3":
          return { provider: "anthropic", model: "claude-3-haiku-20240307" };
        default:
          return { provider: "openai", model: "gpt-3.5-turbo" };
      }
    };

    const modelConfig = getModelConfig(agentConfig.model);
    const systemMessage =
      agentConfig.prompt ||
      agentConfig.description ||
      `You are ${agentConfig.name}, a helpful assistant in the ${agentConfig.industry} industry. You help collect information from customers through natural conversation.`;

    const vapiAssistant: any = {
      name: agentConfig.name,
      model: {
        ...modelConfig,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
        ],
      },
      voice: voiceMapping[agentConfig.voice] || {
        provider: "azure",
        voiceId: "en-US-JennyNeural",
      },
      firstMessage: `Hello! I'm ${agentConfig.name}, your ${agentConfig.industry} assistant. How can I help you today?`,
    };

    // Add tools/functions for data collection if agent has tools configured
    if (agentConfig.tools && agentConfig.tools.length > 0) {
      const collectFormDataTool = agentConfig.tools.find(tool => tool.name === 'collectFormData');
      
      if (collectFormDataTool) {
        const fieldDescriptions = agentConfig.fields
          .map(
            (field) =>
              `- ${field.label} (${field.type}${
                field.required ? ", required" : ""
              })`
          )
          .join("\n");

        vapiAssistant.functions = [
          {
            name: collectFormDataTool.name,
            description: collectFormDataTool.description,
            parameters: collectFormDataTool.parameters,
          },
        ];

        console.log("[VAPI] Created functions from agent tools:", vapiAssistant.functions);

        // Enhance system message with field collection instructions
        if (agentConfig.fields && agentConfig.fields.length > 0) {
          vapiAssistant.model.messages[0].content += `\n\nYour primary task is to collect the following information:\n${fieldDescriptions}\n\nAsk for this information naturally in conversation. When you have collected a piece of information, use the collectFormData function to store it.`;
        }
      }
    } else if (agentConfig.fields && agentConfig.fields.length > 0) {
      // Fallback: Create functions from fields if no tools are configured (backward compatibility)
      const fieldDescriptions = agentConfig.fields
        .map(
          (field) =>
            `- ${field.label} (${field.type}${
              field.required ? ", required" : ""
            })`
        )
        .join("\n");

      // Create the function definition with proper Vapi format
      const functionProperties: Record<string, any> = {};
      agentConfig.fields.forEach((field) => {
        functionProperties[field.id] = {
          type: field.type === "number" ? "number" : "string",
          description: `The user's ${field.label.toLowerCase()}${
            field.placeholder ? ` (${field.placeholder})` : ""
          }`,
        };
      });

      vapiAssistant.functions = [
        {
          name: "collectFormData",
          description: `Call this function when you have collected form data from the user. The form requires the following fields:\n${fieldDescriptions}\n\nOnly call this function when you have obtained valid data for at least one field.`,
          parameters: {
            type: "object",
            properties: functionProperties,
            required: agentConfig.fields
              .filter((f) => f.required)
              .map((f) => f.id),
          },
        },
      ];

      console.log("[VAPI] Created functions (fallback):", vapiAssistant.functions);

      // Enhance system message with field collection instructions
      vapiAssistant.model.messages[0].content += `\n\nYour primary task is to collect the following information:\n${fieldDescriptions}\n\nAsk for this information naturally in conversation. When you have collected a piece of information, use the collectFormData function to store it.`;
    }

    return vapiAssistant;
  };

  // Start voice preview with direct Vapi SDK integration
  const startVoicePreview = async () => {
    try {
      setVapiError(null);
      setIsConnecting(true);

      if (!vapiRef.current) {
        setVapiError("Vapi SDK not initialized");
        setIsConnecting(false);
        return startCall();
      }

      console.log(
        "[VAPI] Starting direct call with agent config:",
        config.name
      );

      // Method 1: Try to start with assistant ID if available (from backend)
      if (config.id && config.id.startsWith("asst_")) {
        try {
          console.log(
            "[VAPI] Starting call with existing assistant ID:",
            config.id
          );

          const assistantOverrides = {
            recordingEnabled: true,
            variableValues: {
              userName: "Preview User",
              agentName: config.name,
              industry: config.industry,
            },
          };

          await vapiRef.current.start(config.id, assistantOverrides);
          setHasVapiAgent(true);
          return;
        } catch (error) {
          console.warn(
            "[VAPI] Failed to start with assistant ID, falling back to direct configuration:",
            error
          );
        }
      }

      // Method 2: Start with direct assistant configuration (recommended by SDK)
      try {
        console.log("[VAPI] Starting call with direct assistant configuration");
        const vapiAssistant = createVapiAssistant(config);
        console.log("[VAPI] Assistant configuration:", vapiAssistant);

        await vapiRef.current.start(vapiAssistant);
        setHasVapiAgent(true);
      } catch (error) {
        console.error(
          "[VAPI] Failed to start call with direct configuration:",
          error
        );
        setVapiError("Failed to start Vapi call: " + (error as Error).message);
        setIsConnecting(false);
        startCall(); // Fallback to simulation
      }
    } catch (error) {
      console.error("[ERROR] Preview setup failed:", error);
      setVapiError("Failed to setup preview: " + (error as Error).message);
      setIsConnecting(false);
      startCall(); // Fallback to simulation
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setIsCallActive(false);
    setIsConnecting(false);
    setConversationStep("intro");
    setCurrentField(null);
    setCollectedData({});
    setTranscript([]);
    setVapiError(null);
    setVolumeLevel(0);
    setCallDuration(0);
    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const toggleMute = () => {
    if (vapiRef.current && isCallActive) {
      const newMutedState = !isMuted;
      vapiRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
      console.log("[VAPI] Microphone", newMutedState ? "muted" : "unmuted");
    }
  };

  const sendMessage = (message: string) => {
    if (vapiRef.current && isCallActive) {
      vapiRef.current.send({
        type: "add-message",
        message: {
          role: "system",
          content: message,
        },
      });
      console.log("[VAPI] Sent message:", message);
    }
  };

  const sayMessage = (message: string, endCallAfter = false) => {
    if (vapiRef.current && isCallActive) {
      vapiRef.current.say(message, endCallAfter);
      console.log(
        "[VAPI] Agent speaking:",
        message,
        endCallAfter ? "(ending call after)" : ""
      );
    }
  };

  // Test function to manually collect data (for debugging)
  const testDataCollection = () => {
    if (config.fields.length > 0) {
      console.log("[DEBUG] Testing data collection with field IDs:", config.fields.map(f => f.id));
      
      const testData: CollectedData = {};
      config.fields.forEach((field, index) => {
        switch (field.type) {
          case "text":
            testData[field.id] = `Test ${field.label} ${index + 1}`;
            break;
          case "email":
            testData[field.id] = `test${index + 1}@example.com`;
            break;
          case "phone":
            testData[field.id] = `+1 (555) 123-${String(index + 1).padStart(
              4,
              "0"
            )}`;
            break;
          case "number":
            testData[field.id] = String((index + 1) * 1000);
            break;
          default:
            testData[field.id] = `Sample ${field.label}`;
        }
      });

      console.log("[TEST] Setting test data:", testData);
      setCollectedData(testData);
      setConversationStep("confirming");
      addToTranscript("agent", "✓ Test data collected successfully!");
    }
  };

  // Format call duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const addToTranscript = (speaker: "agent" | "user", message: string) => {
    setTranscript((prev) => [...prev, { speaker, message }]);
  };

  // Simulate data collection
  const simulateDataCollection = (fieldId: string, value: string) => {
    setCollectedData((prev) => ({ ...prev, [fieldId]: value }));
    addToTranscript("user", value);

    const currentIndex = config.fields.findIndex((f) => f.id === fieldId);
    const nextField = config.fields[currentIndex + 1];

    if (nextField) {
      setTimeout(() => {
        setCurrentField(nextField.id);
        addToTranscript(
          "agent",
          `Great! Now, what's your ${nextField.label.toLowerCase()}?`
        );
      }, 1000);
    } else {
      // All fields collected
      setTimeout(() => {
        setConversationStep("confirming");
        setCurrentField(null);
        addToTranscript(
          "agent",
          "Perfect! I have collected all the information. Let me confirm the details with you before we proceed."
        );
      }, 1000);
    }
  };

  const confirmAndSubmit = () => {
    setConversationStep("complete");
    addToTranscript(
      "agent",
      "Thank you! All information has been confirmed and submitted successfully. Is there anything else I can help you with today?"
    );
  };

  // Mock data for demonstration
  useEffect(() => {
    if (isCallActive && currentField) {
      const field = config.fields.find((f) => f.id === currentField);
      if (field) {
        // Simulate user responses after a delay
        const timer = setTimeout(() => {
          let mockValue = "";
          switch (field.type) {
            case "text":
              mockValue = "John Doe";
              break;
            case "email":
              mockValue = "john.doe@example.com";
              break;
            case "phone":
              mockValue = "+1 (555) 123-4567";
              break;
            case "address":
              mockValue = "123 Main St, New York, NY 10001";
              break;
            case "number":
              mockValue = "75000";
              break;
            case "date":
              mockValue = "1990-05-15";
              break;
            default:
              mockValue = "Sample response";
          }
          simulateDataCollection(currentField, mockValue);
        }, 3000 + Math.random() * 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [currentField, isCallActive]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Builder
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Preview Mode</h1>
                <p className="text-muted-foreground">
                  Test your {config.name} agent
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                {config.industry} • {config.fields.length} fields
              </Badge>
              {vapiError ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Simulation Mode
                </Badge>
              ) : (
                <Badge variant="default" className="text-xs bg-blue-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Vapi Direct SDK
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Voice Agent Interface */}
          <div className="space-y-6">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-voice-primary" />
                  <span>{config.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Error Message */}
                {vapiError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        Using Simulation Mode
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">{vapiError}</p>
                  </div>
                )}

                {/* Agent Avatar */}
                <div className="text-center">
                  <div className="relative">
                    <div
                      className={`w-32 h-32 mx-auto rounded-full gradient-primary flex items-center justify-center transition-all duration-300 ${
                        isCallActive ? "animate-pulse shadow-glow" : ""
                      } ${isConnecting ? "opacity-75 scale-95" : ""}`}
                    >
                      <User className="w-16 h-16 text-white" />
                    </div>
                    {/* Volume Level Indicator */}
                    {isCallActive && volumeLevel > 0 && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100"
                            style={{
                              width: `${Math.min(volumeLevel * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {isConnecting
                        ? "Connecting..."
                        : isCallActive
                        ? "Call in progress..."
                        : "Ready to start conversation"}
                    </p>
                    {isCallActive && (
                      <p className="text-xs font-mono text-voice-primary">
                        Duration: {formatDuration(callDuration)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Call Controls */}
                <div className="flex justify-center space-x-4">
                  {!isCallActive && !isConnecting ? (
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={startVoicePreview}
                      className="px-8"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      Start Call
                    </Button>
                  ) : isConnecting ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      disabled
                      className="px-8"
                    >
                      <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connecting...
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant={isMuted ? "warning" : "voice"}
                        size="lg"
                        onClick={toggleMute}
                        title={
                          isMuted ? "Unmute microphone" : "Mute microphone"
                        }
                      >
                        {isMuted ? (
                          <MicOff className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </Button>
                      <Button variant="destructive" size="lg" onClick={endCall}>
                        <PhoneOff className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Call Status */}
                {isCallActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                  >
                    <Badge
                      variant="secondary"
                      className="bg-voice-success/20 text-voice-success"
                    >
                      Connected • {config.voice}
                    </Badge>
                    {hasVapiAgent && (
                      <Badge
                        variant="default"
                        className="ml-2 text-xs bg-blue-600"
                      >
                        Vapi Direct Call
                      </Badge>
                    )}
                    {isMuted && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Microphone Muted
                      </Badge>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Conversation Transcript */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  <AnimatePresence>
                    {transcript.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          entry.speaker === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            entry.speaker === "agent"
                              ? "bg-voice-primary/10 text-voice-primary"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="text-sm">{entry.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {transcript.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Conversation will appear here...
                    </p>
                  )}
                </div>

                {/* Debug Panel */}
                {isCallActive && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <details className="mb-4">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        🔍 Debug Info (click to expand)
                      </summary>
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                        <p>
                          <strong>Collected Data:</strong>{" "}
                          {JSON.stringify(collectedData, null, 2)}
                        </p>
                        <p>
                          <strong>Progress:</strong> {Math.round(progress)}%
                        </p>
                        <p>
                          <strong>Has Vapi Agent:</strong>{" "}
                          {hasVapiAgent ? "Yes" : "No"}
                        </p>
                        <p>
                          <strong>Conversation Step:</strong> {conversationStep}
                        </p>
                        <p>
                          <strong>Expected Fields:</strong>{" "}
                          {config.fields.map((f) => f.id).join(", ")}
                        </p>
                      </div>
                    </details>
                  </div>
                )}

                {/* Quick Actions for Vapi calls */}
                {isCallActive && hasVapiAgent && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      Quick Actions:
                    </p>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sendMessage(
                              "Please summarize what we've discussed so far."
                            )
                          }
                        >
                          📝 Summarize
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sendMessage("Let's move to the next step.")
                          }
                        >
                          ➡️ Next Step
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sendMessage("Can you repeat the last question?")
                          }
                        >
                          🔄 Repeat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sendMessage(
                              "Please call the collectFormData function with any data you have collected so far."
                            )
                          }
                        >
                          🔄 Force Collect
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={testDataCollection}
                        >
                          🧪 Test Data
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Simulate a Vapi function call
                            if (config.fields.length > 0) {
                              const simulatedFunctionCall = {
                                name: "collectFormData",
                                parameters: {
                                  [config.fields[0].id]: `Simulated ${config.fields[0].label}`
                                }
                              };
                              console.log("[DEBUG] Simulating function call:", simulatedFunctionCall);
                              console.log("[DEBUG] Expected field IDs:", config.fields.map(f => f.id));
                              
                              // Process the simulated function call
                              Object.entries(simulatedFunctionCall.parameters).forEach(([fieldId, value]) => {
                                if (value && typeof value === "string" && value.trim()) {
                                  console.log(`[DEBUG] Setting field ${fieldId} = ${value}`);
                                  
                                  setCollectedData((prev) => {
                                    const updated = { ...prev, [fieldId]: value as string };
                                    console.log("[DEBUG] Updated collected data:", updated);
                                    return updated;
                                  });
                                  
                                  addToTranscript("agent", `✓ Simulated collection ${fieldId}: ${value}`);
                                }
                              });
                            }
                          }}
                        >
                          🔧 Simulate Call
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sayMessage("Let me think about that for a moment.")
                          }
                        >
                          💭 Say: Think
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sayMessage("Thank you for that information!")
                          }
                        >
                          👍 Say: Thanks
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sayMessage(
                              "Thank you for your time. Have a great day!",
                              true
                            )
                          }
                        >
                          👋 End Call
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Collection Interface */}
          <div className="space-y-6">
            {/* Progress */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Collection Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Fields Completed</span>
                    <span>
                      {completedFields.length} / {config.fields.length}
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <div className="text-center text-sm text-muted-foreground">
                    {progress === 100
                      ? "All data collected!"
                      : `${Math.round(progress)}% complete`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Fields */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Collected Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.fields.map((field) => {
                  const isCompleted = completedFields.includes(field.id);
                  const isCurrent = currentField === field.id;
                  const value = collectedData[field.id] || "";

                  return (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0.5 }}
                      animate={{
                        opacity: isCompleted ? 1 : isCurrent ? 0.8 : 0.5,
                        scale: isCurrent ? 1.02 : 1,
                      }}
                      className={`border rounded-lg p-4 ${
                        isCurrent
                          ? "border-voice-primary bg-voice-primary/5"
                          : isCompleted
                          ? "border-voice-success bg-voice-success/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">{field.label}</Label>
                        <div className="flex items-center space-x-2">
                          {field.required && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-voice-success" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <Input
                        type={
                          field.type === "email"
                            ? "email"
                            : field.type === "number"
                            ? "number"
                            : "text"
                        }
                        placeholder={field.placeholder}
                        value={value}
                        readOnly
                        className={`${
                          isCurrent
                            ? "ring-2 ring-voice-primary"
                            : isCompleted
                            ? "bg-voice-success/10"
                            : ""
                        }`}
                      />
                    </motion.div>
                  );
                })}

                {/* Confirmation */}
                {conversationStep === "confirming" && progress === 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4 pt-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      Please confirm all information is correct
                    </p>
                    <Button
                      variant="hero"
                      onClick={confirmAndSubmit}
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm & Submit
                    </Button>
                  </motion.div>
                )}

                {conversationStep === "complete" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4 pt-4"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-voice-success/20 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-voice-success" />
                    </div>
                    <p className="font-medium text-voice-success">
                      Data Collection Complete!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All information has been successfully collected and
                      submitted.
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
