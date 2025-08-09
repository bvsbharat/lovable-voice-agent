import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Bot,
  User,
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowLeft,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AgentConfig } from "@/types/agent";
import Vapi from "@vapi-ai/web";

type ViewMode = "mobile" | "desktop";
type VoiceMode = "idle" | "listening" | "speaking";

interface PreviewModeProps {
  config: AgentConfig;
  onBack?: () => void;
}

interface TranscriptEntry {
  speaker: "user" | "agent";
  message: string;
  timestamp: Date;
}

const PreviewMode: React.FC<PreviewModeProps> = ({ config, onBack }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // View and voice mode state
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Data collection state
  const [collectedData, setCollectedData] = useState<Record<string, string>>(
    {}
  );
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [conversationStep, setConversationStep] = useState<string>("greeting");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Vapi integration
  const [vapiError, setVapiError] = useState<string | null>(null);
  const [hasVapiAgent, setHasVapiAgent] = useState(false);
  const [vapi, setVapi] = useState<Vapi | null>(null);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Vapi
  useEffect(() => {
    const apiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (apiKey) {
      const vapiInstance = new Vapi(apiKey);
      setVapi(vapiInstance);
      setHasVapiAgent(true);

      // Set up event listeners
      vapiInstance.on("speech-start", () => setVoiceMode("listening"));
      vapiInstance.on("speech-end", () => setVoiceMode("idle"));
      vapiInstance.on("call-start", () => {
        setIsCallActive(true);
        setIsConnecting(false);
      });
      vapiInstance.on("call-end", () => {
        setIsCallActive(false);
        setIsConnecting(false);
        setVoiceMode("idle");
      });
      vapiInstance.on("message", (message: any) => {
        if (message.type === "transcript" && message.transcript) {
          addToTranscript(
            message.transcript.user ? "user" : "agent",
            message.transcript.text
          );
        }
        if (message.type === "function-call" && message.functionCall) {
          handleFunctionCall(message.functionCall);
        }
      });
      vapiInstance.on("error", (error: any) => {
        console.error("Vapi error:", error);
        setVapiError(error.message || "Connection failed");
        setIsConnecting(false);
      });
    } else {
      setHasVapiAgent(false);
    }
  }, []);

  // Call timer
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive]);

  // Calculate progress
  const completedFields = config.fields.filter(
    (field) => collectedData[field.id] && collectedData[field.id].trim() !== ""
  );
  const progress =
    config.fields.length > 0
      ? (completedFields.length / config.fields.length) * 100
      : 0;

  // Helper functions
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const addToTranscript = (speaker: "user" | "agent", message: string) => {
    setTranscript((prev) => [
      ...prev,
      { speaker, message, timestamp: new Date() },
    ]);
  };

  const handleFunctionCall = (functionCall: any) => {
    if (functionCall.name === "collectFormData" && functionCall.parameters) {
      Object.entries(functionCall.parameters).forEach(([fieldId, value]) => {
        if (value && typeof value === "string" && value.trim()) {
          setCollectedData((prev) => ({ ...prev, [fieldId]: value as string }));
          setCurrentField(fieldId);
        }
      });
    }
  };

  // Voice avatar click handler
  const handleVoiceAvatarClick = async () => {
    if (isCallActive) {
      await endCall();
    } else {
      await startVoicePreview();
    }
  };

  // Call management
  const startVoicePreview = async () => {
    try {
      setIsConnecting(true);
      setVapiError(null);

      if (hasVapiAgent && vapi) {
        await vapi.start({
          name: config.name,
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  config.prompt ||
                  `You are ${config.name}, a helpful assistant.`,
              },
            ],
          },
          voice: {
            provider: "azure",
            voiceId: "en-US-JennyNeural",
          },
        });
        setVoiceMode("listening");
      } else {
        // Simulation mode
        setTimeout(() => {
          setIsCallActive(true);
          setIsConnecting(false);
          setVoiceMode("listening");
          addToTranscript(
            "agent",
            `Hello! I'm ${config.name}. How can I help you today?`
          );
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setVapiError("Failed to start call. Using simulation mode.");
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    try {
      if (hasVapiAgent && vapi) {
        vapi.stop();
      }
      setIsCallActive(false);
      setIsConnecting(false);
      setVoiceMode("idle");
      setTranscript([]);
      setCollectedData({});
      setCurrentField(null);
      setConversationStep("greeting");
    } catch (error) {
      console.error("Failed to end call:", error);
    }
  };

  const toggleMute = async () => {
    if (hasVapiAgent && vapi) {
      vapi.setMuted(!isMuted);
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const sendMessage = (message: string) => {
    if (hasVapiAgent && vapi) {
      vapi.send({
        type: "add-message",
        message: {
          role: "user",
          content: message,
        },
      });
    } else {
      addToTranscript("user", message);
    }
  };

  const sayMessage = (message: string, endCallAfter = false) => {
    if (hasVapiAgent && vapi) {
      vapi.say(message);
    } else {
      addToTranscript("agent", message);
      if (endCallAfter) {
        setTimeout(() => endCall(), 2000);
      }
    }
  };

  // Mobile view component
  const renderMobileView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Mobile Voice Avatar - Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="relative mb-8">
          <div
            className={`w-64 h-64 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 via-pink-200 to-purple-200 flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
              isCallActive
                ? "animate-pulse shadow-2xl scale-105"
                : "hover:scale-105"
            } ${isConnecting ? "opacity-75" : ""}`}
            onClick={handleVoiceAvatarClick}
          >
            {/* Video Background */}
            <video
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              src="https://cdn.dribbble.com/userupload/15697531/file/original-0242acdc69146d4472fc5e69b48616dc.mp4"
              autoPlay
              loop
              muted
              playsInline
            />

            {/* Bot Icon - Circular Button with Transparent Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Bot className="w-8 h-8 text-white/70" />
              </div>
            </div>

            {/* Volume indicator */}
            {isCallActive && volumeLevel > 0 && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="w-32 h-3 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100"
                    style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">
            {isConnecting
              ? "Connecting..."
              : isCallActive
              ? "Listening..."
              : "Hi Ray, I'm GW-AI Claim Agent ! Your personal assistant."}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            How can I help you today?
          </h1>
        </div>

        {/* Progress indicator for mobile */}
        {isCallActive && (
          <div className="mt-8 w-full max-w-sm">
            <div className="bg-white rounded-lg p-10 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Claim Progress
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full h-2" />
            </div>
          </div>
        )}

        {/* Call controls for mobile */}
        {isCallActive && (
          <div className="mt-6">
            <div className="flex justify-center space-x-6">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                onClick={toggleMute}
                className="rounded-full w-16 h-16 "
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button - Mobile App Style */}
      {!isCallActive && !isConnecting && (
        <div className="px-6 pb-8">
          <Button
            onClick={handleVoiceAvatarClick}
            className="bg-yellow-500 hover:bg-yellow-600 text-white w-full py-7 rounded-2xl text-xl shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            Press to start
          </Button>
        </div>
      )}
    </div>
  );

  // Desktop view component (mobile-first design)
  const renderDesktopView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      {/* Desktop Voice Avatar - Centered Content */}
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
        <div className="relative mb-12">
          <div
            className={`w-64 h-64 rounded-full bg-gradient-to-br from-orange-200 via-pink-200 to-purple-200 flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isCallActive
                ? "animate-pulse shadow-2xl scale-105"
                : "hover:scale-105"
            } ${isConnecting ? "opacity-75" : ""}`}
            onClick={handleVoiceAvatarClick}
          >
            {/* Video Background */}
            <video
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              src="https://cdn.dribbble.com/userupload/15697531/file/original-0242acdc69146d4472fc5e69b48616dc.mp4"
              autoPlay
              loop
              muted
              playsInline
            />

            {/* Bot Icon - Circular Button with Transparent Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Bot className="w-10 h-10 text-white/70" />
              </div>
            </div>

            {/* Volume indicator */}
            {isCallActive && volumeLevel > 0 && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="w-32 h-3 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100"
                    style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">
            {isConnecting
              ? "Connecting..."
              : isCallActive
              ? "Listening..."
              : "Hi Ray, I'm your AI Claim Agent! Your personal assistant."}
          </p>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            How can I help you today?
          </h1>

          {!isCallActive && !isConnecting && (
            <div className="pt-6">
              <Button
                onClick={handleVoiceAvatarClick}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                Press to start
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator for desktop */}
      {isCallActive && (
        <div className="mt-8">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Claim Progress
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      )}

      {/* Call controls for desktop */}
      {isCallActive && (
        <div className="mt-6">
          <div className="flex justify-center space-x-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleMute}
              className="rounded-full w-14 h-14"
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full w-14 h-14"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Error Message for desktop */}
      {vapiError && (
        <div className="mt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm font-medium">Using Simulation Mode</p>
            </div>
            <p className="text-xs text-yellow-700 mt-1">{vapiError}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* View Mode Toggle */}
      <div className="fixed top-4 left-4 z-50 flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack || (() => navigate("/"))}
          className="bg-white/20 backdrop-blur-sm border border-white/30 text-gray-600 hover:text-gray-800 hover:bg-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2 text-gray-500" />
        </Button>
      </div>

      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("mobile")}
          className={`bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 ${
            viewMode === "mobile"
              ? "text-gray-800 bg-white/40"
              : "text-gray-600"
          }`}
        >
          <Smartphone className="w-4 h-4 mr-2 text-gray-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("desktop")}
          className={`bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 ${
            viewMode === "desktop"
              ? "text-gray-800 bg-white/40"
              : "text-gray-600"
          }`}
        >
          <Monitor className="w-4 h-4 mr-2 text-gray-500" />
        </Button>
      </div>

      {/* Render based on view mode */}
      {viewMode === "mobile" ? renderMobileView() : renderDesktopView()}
    </div>
  );
};

export default PreviewMode;
export { PreviewMode };
