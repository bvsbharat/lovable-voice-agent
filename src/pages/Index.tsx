import { useNavigate } from "react-router-dom";
import HeroGeometric from "@/components/ui/shape-landing-hero";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  const handleLearnMore = () => {
    // You can add a learn more page or scroll to features section
    console.log("Learn more clicked");
  };

  return (
    <div className="min-h-screen">
      <HeroGeometric 
        badge="AI Voice Agents"
        title1="Why AI Voice Agents"
        title2="Make a Difference"
        onGetStarted={handleGetStarted}
        onLearnMore={handleLearnMore}
      />
    </div>
  );
};

export default Index;
