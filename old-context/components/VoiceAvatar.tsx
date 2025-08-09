import React, { useState, useRef, useEffect, useMemo } from "react";

import styles from "./VoiceAvatar.module.scss";

export type VoiceAvatarMode = "idle" | "listening" | "speaking";

const backgroundVideo =
  "https://assetsimagesai.s3.us-east-1.amazonaws.com/v1.mp4";

interface VoiceAvatarProps {
  mode: VoiceAvatarMode;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  showStatusMessage?: boolean;
  isConnected?: boolean;
}

const getStatusMessage = (
  mode: VoiceAvatarMode | "idle",
  isHovered: boolean
): string => {
  if (mode === "speaking" && isHovered) {
    return "Press to stop";
  }

  switch (mode) {
    case "idle":
      return "Press to start";
    case "listening":
      return "Listening...";
    case "speaking":
      return "Speaking...";
    default:
      return "";
  }
};

// Function to generate random particles in a circle pattern
const generateParticles = (count: number, radius: number) => {
  const particles = [];
  const blueColors = [
    "#3498db", // Primary blue
    "#2980b9", // Darker blue
    "#5dade2", // Lighter blue
    "#85c1e9", // Very light blue
  ];

  // Create multiple circular rings for a more robotic pattern
  const ringsCount = 3;
  const particlesPerRing = Math.floor(count / ringsCount);

  for (let ring = 0; ring < ringsCount; ring++) {
    const ringRadius = radius * (0.6 + ring * 0.2); // Different radius for each ring
    const angleStep = (Math.PI * 4) / particlesPerRing;

    for (let i = 0; i < particlesPerRing; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;

      particles.push({
        id: ring * particlesPerRing + i,
        x,
        y,
        size: 3, // Consistent size for more mechanical look
        opacity: 0.7,
        speed: 0.3,
        angle: angle,
        distance: ringRadius,
        phase: i * (Math.PI / 12), // More structured phases
        ring: ring,
        color: blueColors[ring % blueColors.length], // Each ring gets its own color
      });
    }
  }

  return particles;
};

export const VoiceAvatar = ({
  mode = "idle",
  size = 200,
  onClick,
  disabled = false,
  showStatusMessage = false,
  isConnected = false,
}: VoiceAvatarProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const particlesContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Use same number of particles for both speaking and listening modes
  const particleCount = 250; // Consistent number of particles for both modes

  // Get radius based on mode - can still vary size
  const getParticleRadius = (currentMode: string) => {
    if (currentMode === "speaking") return size / 2.5; // Slightly smaller for speaking
    if (currentMode === "listening") return size / 4; // Even smaller for listening
    return size / 5; // Even smaller for idle (though they'll be invisible)
  };

  // Generate particles based on current mode's radius
  const particleRadius = getParticleRadius(mode);

  const particles = useMemo(
    () => generateParticles(particleCount, particleRadius),
    [mode, size, particleRadius]
  );

  // Track previous mode for smooth transitions
  const [prevMode, setPrevMode] = useState(mode);
  const [transitionProgress, setTransitionProgress] = useState(1); // 0 to 1

  // Store particle positions to prevent jumping
  const particlePositionsRef = useRef<{
    [key: number]: { x: number; y: number; scale: number; opacity: number };
  }>({});

  // Animation function for particles
  const animateParticles = () => {
    if (!particlesContainerRef.current) return;

    const container = particlesContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;

    // Don't show particles in idle mode with completed transition
    if (mode === "idle" && prevMode === "idle" && transitionProgress === 1) {
      // Clear all particles
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animateParticles);
      return;
    }

    // Clear previous particles
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create and position particles
    particles.forEach((particle) => {
      const dot = document.createElement("div");
      dot.className = styles.particle;

      // Different behavior based on mode
      let x, y, scale, opacity;

      // Get the previous position if available
      const prevPosition = particlePositionsRef.current[particle.id] || {
        x: centerX + Math.cos(particle.angle) * particle.distance,
        y: centerY + Math.sin(particle.angle) * particle.distance,
        scale: 0,
        opacity: 0,
      };

      // Calculate new target position based on mode
      let targetX, targetY, targetScale, targetOpacity;

      if (mode === "speaking") {
        // Speaking mode: bouncing inward and outward with rotation
        const time = Date.now() * 0.0005; // Faster time factor for more dynamic animation

        // Create a more pronounced bouncing effect
        // This simulates the rhythm of speech

        // Base bounce frequency - can be adjusted to match AI speaking speed
        const bounceFrequency = 1.2; // Higher = faster bouncing

        // Create a pronounced inward/outward bounce effect
        // Using absolute sine wave to create a more obvious bounce
        const bouncePhase = time * bounceFrequency + particle.phase;
        const bounceEffect = Math.abs(Math.sin(bouncePhase)) * 25; // More dramatic bounce

        // Calculate distance with bounce effect
        // This will make particles move inward and outward rhythmically
        const minDistance = particle.distance * 0.7; // Inward bound
        const maxDistance = particle.distance * 1.3; // Outward bound
        const distance = minDistance + bounceEffect;

        // Add subtle rotation for more dynamic effect
        const rotationSpeed = 0.1; // Slower rotation to focus on the bounce
        const rotationAngle = particle.angle + time * rotationSpeed;

        // Apply both rotation and bounce effects
        targetX = centerX + Math.cos(rotationAngle) * distance;
        targetY = centerY + Math.sin(rotationAngle) * distance;

        // Pulse size with the bounce
        targetScale = 0.6 + Math.abs(Math.sin(bouncePhase * 1.2)) * 0.4;
        // Pulse opacity with the bounce
        targetOpacity = 0.5 + Math.abs(Math.sin(bouncePhase)) * 0.4;
      } else if (mode === "listening") {
        // Listening mode: smaller, gentler circular motion
        const time = Date.now() * 0.0002;

        // Create gentle circular motion
        const rotationSpeed = 0.08; // Slower rotation for listening mode
        const rotationAngle = particle.angle + time * rotationSpeed;

        // Very subtle breathing effect
        const breathEffect = Math.sin(time * 0.4 + particle.phase) * 3;
        const distance = particle.distance + breathEffect;

        targetX = centerX + Math.cos(rotationAngle) * distance;
        targetY = centerY + Math.sin(rotationAngle) * distance;

        // Smaller, more consistent particles
        targetScale = 0.6 + Math.sin(time * 0.3) * 0.1;
        targetOpacity = 0.4 + Math.sin(time * 0.4) * 0.1;
      } else {
        // Idle mode: hide particles completely
        targetX = centerX;
        targetY = centerY;
        targetScale = 0;
        targetOpacity = 0;
      }

      // Apply smooth interpolation from current position to target position
      // This creates frame-to-frame smoothing independent of mode transitions
      // Use different smoothing factors based on mode
      let smoothingFactor = 0.1;
      if (mode === "speaking") {
        smoothingFactor = 0.15; // Faster response for speaking mode to show rotation
      } else if (mode === "listening") {
        smoothingFactor = 0.08; // Slower, smoother transitions for listening mode
      }

      x = prevPosition.x + (targetX - prevPosition.x) * smoothingFactor;
      y = prevPosition.y + (targetY - prevPosition.y) * smoothingFactor;
      scale =
        prevPosition.scale +
        (targetScale - prevPosition.scale) * smoothingFactor;
      opacity =
        prevPosition.opacity +
        (targetOpacity - prevPosition.opacity) * smoothingFactor;

      // Store the new position for the next frame
      particlePositionsRef.current[particle.id] = {
        x,
        y,
        scale,
        opacity,
      };

      // Mode transitions are now handled by the frame-to-frame smoothing above

      // Apply styles
      dot.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      dot.style.opacity = opacity.toString();
      dot.style.width = `${particle.size}px`;
      dot.style.height = `${particle.size}px`;
      dot.style.backgroundColor = particle.color || "#3498db"; // Use the particle's color

      container.appendChild(dot);
    });

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animateParticles);
  };

  // Update previous mode when current mode changes
  useEffect(() => {
    if (mode !== prevMode) {
      // Just update the previous mode - transitions are handled in the animation loop
      setPrevMode(mode);
    }
  }, [mode, prevMode]);

  useEffect(() => {
    if (videoRef.current) {
      // Remove video rotation for all modes
      videoRef.current.classList.remove(styles["reverse"]);
      videoRef.current.play().catch(() => {});
    }

    // Start particle animation
    animateParticles();

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }

      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, isConnected]);

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    if (!disabled && onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const statusMessage = getStatusMessage(mode, isHovered);

  return (
    <div className={styles["voice-avatar-container"]}>
      <div
        className={`${styles["voice-avatar"]} ${styles[mode]}`}
        style={{
          width: size,
          height: size,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label={`Voice avatar - ${mode} mode`}
      >
        <div className={styles["voice-interaction-circle"]}>
          <div className={styles["voice-interaction-inner"]}>
            <div
              ref={particlesContainerRef}
              className={styles["particles-container"]}
            ></div>
          </div>
        </div>
        <video
          ref={videoRef}
          className={styles["voice-video"]}
          autoPlay={true}
          loop
          muted
          playsInline
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      </div>
      {!disabled && showStatusMessage && (
        <div className={styles["status-message"]}>
          <span>{statusMessage}</span>
          {/* {mode !== 'idle' && (
                        <button
                            className={styles['close-button']}
                            onClick={handleClick}
                            aria-label="Stop"
                            type="button"
                        >
                            <svg
                                className={styles['close-icon']}
                                width="10"
                                height="10"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M1 1L13 13M1 13L13 1"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    )} */}
        </div>
      )}
    </div>
  );
};
