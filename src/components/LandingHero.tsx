import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, Bot, Zap, Settings, Phone, MessageSquare, Search, Users, Calendar, HeadphonesIcon, Download, Heart } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface LandingHeroProps {
  onExplore: () => void;
}

export const LandingHero = ({ onExplore }: LandingHeroProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/agent-builder?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full" />
          </div>
          <span className="text-white text-sm">/support@topapps.io</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="bg-black hover:bg-gray-800 text-white">
              Browse App
            </Button>
            <Button variant="ghost" className="bg-black hover:bg-gray-800 text-white">
              Category
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm">En</span>
            <Button variant="ghost" className="bg-black hover:bg-gray-800 text-white">
              Download
            </Button>
            <div className="w-8 h-8 bg-orange-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Announcement Banner */}
      <div className="relative z-20 flex justify-center mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 border border-white/20 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm">We Raised $2.5M in Series B</span>
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight">
            Get the{" "}
            <span className="inline-flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mr-4">
                <Mic className="w-6 h-6 text-white" />
              </div>
            </span>
            Application you
            <br />
            Want for Growth
          </h1>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-16">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search API, Apps & Plugin"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-6 pr-16 text-lg bg-gray-800 border-gray-700 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                type="submit"
                className="absolute right-2 top-2 h-10 w-10 bg-black hover:bg-gray-800 rounded-lg"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </form>

          {/* Explore Marketplace Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Explore Marketplace</h2>
              <div className="flex items-center space-x-4">
                <Button variant="ghost" className="bg-black hover:bg-gray-800 text-white text-sm">
                  Featured
                </Button>
                <Button variant="ghost" className="bg-black hover:bg-gray-800 text-white text-sm">
                  Popular
                </Button>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">6</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Agent Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Customer Support Agent - Green */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-[#10B981] to-[#059669] p-6 rounded-2xl border-0 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <HeadphonesIcon className="w-6 h-6 text-white" />
                    <span className="text-white text-sm font-medium">4.9</span>
                  </div>
                  <Heart className="w-5 h-5 text-white" />
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2">Customer Support</h3>
                <p className="text-white/90 text-sm mb-4">AI-powered customer service agent for 24/7 support</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">4.2k</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">8.5k</span>
                    </div>
                  </div>
                  <span className="text-white font-bold text-xl">9,04,012+</span>
                </div>
                
                <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download APP
                </Button>
              </Card>
            </motion.div>

            {/* Sales Assistant Agent - Orange */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] p-6 rounded-2xl border-0 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-6 h-6 text-white" />
                    <span className="text-white text-sm font-medium">4.8</span>
                  </div>
                  <Heart className="w-5 h-5 text-white" />
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2">Sales Assistant</h3>
                <p className="text-white/90 text-sm mb-4">Lead qualification and sales conversion agent</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">3.8k</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">7.2k</span>
                    </div>
                  </div>
                  <span className="text-white font-bold text-xl">1,00,000+</span>
                </div>
                
                <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download APP
                </Button>
              </Card>
            </motion.div>

            {/* Appointment Booking Agent - Blue */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] p-6 rounded-2xl border-0 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-6 h-6 text-white" />
                    <span className="text-white text-sm font-medium">4.7</span>
                  </div>
                  <Heart className="w-5 h-5 text-white" />
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2">Appointment Booking</h3>
                <p className="text-white/90 text-sm mb-4">Automated scheduling and calendar management</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">2.9k</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white text-xs">5.8k</span>
                    </div>
                  </div>
                  <span className="text-white font-bold text-xl">70,800+</span>
                </div>
                
                <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download APP
                </Button>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};