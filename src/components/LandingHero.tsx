import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Bot, Zap, Settings, Phone, MessageSquare } from "lucide-react";

interface LandingHeroProps {
  onExplore: () => void;
}

export const LandingHero = ({ onExplore }: LandingHeroProps) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 gradient-hero opacity-90" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 bg-white/5 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${10 + i * 15}%`,
              top: `${10 + i * 10}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20">
              <Mic className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Voice AI Platform</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Build Powerful
            <br />
            <span className="text-transparent bg-gradient-to-r from-white to-primary-glow bg-clip-text">
              Voice Agents
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Create conversational AI agents for data collection across finance, logistics, insurance, and more. 
            Drag-and-drop interface with real-time voice preview powered by Vapi.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              variant="hero" 
              size="lg" 
              onClick={onExplore}
              className="text-lg px-8 py-4"
            >
              <Zap className="w-5 h-5 mr-2" />
              Explore Platform
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-4 text-white border-white/30 hover:bg-white/10"
            >
              <Phone className="w-5 h-5 mr-2" />
              Demo Call
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 hover:bg-white/15 transition-smooth">
                <Bot className="w-8 h-8 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold mb-2">AI Agent Builder</h3>
                <p className="text-white/70 text-sm">
                  Drag-and-drop interface to create sophisticated data collection agents
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 hover:bg-white/15 transition-smooth">
                <MessageSquare className="w-8 h-8 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold mb-2">Real-time Preview</h3>
                <p className="text-white/70 text-sm">
                  Test your agents instantly with live voice conversations and data collection
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 hover:bg-white/15 transition-smooth">
                <Settings className="w-8 h-8 text-white mb-4 mx-auto" />
                <h3 className="text-white font-semibold mb-2">Industry Templates</h3>
                <p className="text-white/70 text-sm">
                  Pre-built templates for finance, logistics, insurance, and healthcare
                </p>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};