import { useState, useEffect } from "react";
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
  Bot
} from "lucide-react";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface AgentConfig {
  name: string;
  industry: string;
  description: string;
  model: string;
  voice: string;
  prompt: string;
  fields: FormField[];
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
  const [conversationStep, setConversationStep] = useState<'intro' | 'collecting' | 'confirming' | 'complete'>('intro');
  const [transcript, setTranscript] = useState<Array<{speaker: 'agent' | 'user', message: string}>>([]);

  const progress = (Object.keys(collectedData).length / config.fields.length) * 100;
  const completedFields = Object.keys(collectedData);

  // Simulate voice conversation
  const startCall = () => {
    setIsCallActive(true);
    setConversationStep('intro');
    addToTranscript('agent', `Hello! I'm ${config.name}, your ${config.industry} assistant. I'll help you get started today. Let me collect some information from you.`);
    
    // Simulate starting data collection after intro
    setTimeout(() => {
      if (config.fields.length > 0) {
        setConversationStep('collecting');
        setCurrentField(config.fields[0].id);
        addToTranscript('agent', `Let's start with your ${config.fields[0].label.toLowerCase()}. ${config.fields[0].placeholder || ''}`);
      }
    }, 2000);
  };

  const endCall = () => {
    setIsCallActive(false);
    setConversationStep('intro');
    setCurrentField(null);
    setCollectedData({});
    setTranscript([]);
  };

  const addToTranscript = (speaker: 'agent' | 'user', message: string) => {
    setTranscript(prev => [...prev, { speaker, message }]);
  };

  // Simulate data collection
  const simulateDataCollection = (fieldId: string, value: string) => {
    setCollectedData(prev => ({ ...prev, [fieldId]: value }));
    addToTranscript('user', value);
    
    const currentIndex = config.fields.findIndex(f => f.id === fieldId);
    const nextField = config.fields[currentIndex + 1];
    
    if (nextField) {
      setTimeout(() => {
        setCurrentField(nextField.id);
        addToTranscript('agent', `Great! Now, what's your ${nextField.label.toLowerCase()}?`);
      }, 1000);
    } else {
      // All fields collected
      setTimeout(() => {
        setConversationStep('confirming');
        setCurrentField(null);
        addToTranscript('agent', 'Perfect! I have collected all the information. Let me confirm the details with you before we proceed.');
      }, 1000);
    }
  };

  const confirmAndSubmit = () => {
    setConversationStep('complete');
    addToTranscript('agent', 'Thank you! All information has been confirmed and submitted successfully. Is there anything else I can help you with today?');
  };

  // Mock data for demonstration
  useEffect(() => {
    if (isCallActive && currentField) {
      const field = config.fields.find(f => f.id === currentField);
      if (field) {
        // Simulate user responses after a delay
        const timer = setTimeout(() => {
          let mockValue = '';
          switch (field.type) {
            case 'text':
              mockValue = 'John Doe';
              break;
            case 'email':
              mockValue = 'john.doe@example.com';
              break;
            case 'phone':
              mockValue = '+1 (555) 123-4567';
              break;
            case 'address':
              mockValue = '123 Main St, New York, NY 10001';
              break;
            case 'number':
              mockValue = '75000';
              break;
            case 'date':
              mockValue = '1990-05-15';
              break;
            default:
              mockValue = 'Sample response';
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
                <p className="text-muted-foreground">Test your {config.name} agent</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {config.industry} • {config.fields.length} fields
            </Badge>
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
                {/* Agent Avatar */}
                <div className="text-center">
                  <div className={`w-32 h-32 mx-auto rounded-full gradient-primary flex items-center justify-center ${isCallActive ? 'animate-pulse shadow-glow' : ''}`}>
                    <User className="w-16 h-16 text-white" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {isCallActive ? 'Call in progress...' : 'Ready to start conversation'}
                  </p>
                </div>

                {/* Call Controls */}
                <div className="flex justify-center space-x-4">
                  {!isCallActive ? (
                    <Button 
                      variant="hero" 
                      size="lg" 
                      onClick={startCall}
                      className="px-8"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      Start Call
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant={isMuted ? "warning" : "voice"} 
                        size="lg"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="lg"
                        onClick={endCall}
                      >
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
                    className="text-center"
                  >
                    <Badge 
                      variant="secondary" 
                      className="bg-voice-success/20 text-voice-success"
                    >
                      Connected • {config.voice}
                    </Badge>
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
                        className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          entry.speaker === 'agent' 
                            ? 'bg-voice-primary/10 text-voice-primary' 
                            : 'bg-muted text-foreground'
                        }`}>
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
                    <span>{completedFields.length} / {config.fields.length}</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <div className="text-center text-sm text-muted-foreground">
                    {progress === 100 ? 'All data collected!' : `${Math.round(progress)}% complete`}
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
                  const value = collectedData[field.id] || '';

                  return (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0.5 }}
                      animate={{ 
                        opacity: isCompleted ? 1 : isCurrent ? 0.8 : 0.5,
                        scale: isCurrent ? 1.02 : 1
                      }}
                      className={`border rounded-lg p-4 ${
                        isCurrent ? 'border-voice-primary bg-voice-primary/5' : 
                        isCompleted ? 'border-voice-success bg-voice-success/5' : 
                        'border-border'
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
                        type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        value={value}
                        readOnly
                        className={`${
                          isCurrent ? 'ring-2 ring-voice-primary' : 
                          isCompleted ? 'bg-voice-success/10' : ''
                        }`}
                      />
                    </motion.div>
                  );
                })}

                {/* Confirmation */}
                {conversationStep === 'confirming' && progress === 100 && (
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

                {conversationStep === 'complete' && (
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
                      All information has been successfully collected and submitted.
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