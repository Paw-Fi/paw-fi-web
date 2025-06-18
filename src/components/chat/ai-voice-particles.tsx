import React, { useState, useEffect, useRef } from 'react';

export type VoiceAnimationState = 'speaking' | 'listening' | 'thinking' | 'unauthorized';

interface AIVoiceParticlesProps {
  state: VoiceAnimationState;
  className?: string;
}

// Enhanced particle interface for lifelike behavior
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number; // What size the particle wants to be
  initialSize: number;
  opacity: number;
  targetOpacity: number; // What opacity the particle wants to be
  phase: number;
  amplitude: number;
  targetAmplitude: number; // What orbit radius the particle wants
  life: number;
  maxLife: number;
  energy: number; // How "excited" the particle is (0-1)
  targetEnergy: number; // What energy level the particle wants
  restfulness: number; // How much the particle resists change (0-1)
  awakening: number; // How quickly particle responds to state changes
}

// --- NATURAL BEHAVIOR CONFIGURATIONS ---
const STATE_CONFIGS = {
  listening: {
    particleCount: 100,
    baseSizeRange: { min: 1, max: 2 },
    energyLevel: 0.2, // Very calm
    awakenessSpeed: 0.98, // Slow to change
    restfulness: 0.9, // High resistance to movement
    orbitSpeed: 0.0008, // Slower, more peaceful
    ellipticalXFactor: 1.0,
    ellipticalYFactor: 0.8,
    // Gentle, breathing-like movement
    deviationX: (time: number, phase: number, energy: number) => 
      Math.sin(time * 0.0008 + phase * 0.3) * (3 + energy * 2),
    deviationY: (time: number, phase: number, energy: number) => 
      Math.cos(time * 0.0006 + phase * 0.4) * (2 + energy * 1.5),
    pulseSpeed: 0.001,
    pulseAmount: 0.15,
    sizePulseAmount: 0.3,
    baseOpacity: 0.6,
    connectionOpacityFactor: 0.06,
  },
  thinking: {
    particleCount: 120,
    baseSizeRange: { min: 1.5, max: 2.5 },
    energyLevel: 0.5, // Moderate activity
    awakenessSpeed: 0.95,
    restfulness: 0.7,
    orbitSpeed: 0.001,
    ellipticalXFactor: 1.0,
    ellipticalYFactor: 0.7,
    // More complex, thoughtful patterns
    deviationX: (time: number, phase: number, energy: number) => 
      Math.sin(time * 0.0015 + phase * 0.8) * (8 + energy * 6) + 
      Math.sin(time * 0.0025 + phase * 1.3) * (3 + energy * 2),
    deviationY: (time: number, phase: number, energy: number) => 
      Math.cos(time * 0.0018 + phase * 0.6) * (6 + energy * 4) + 
      Math.cos(time * 0.0022 + phase * 0.9) * (2 + energy * 3),
    pulseSpeed: 0.002,
    pulseAmount: 0.2,
    sizePulseAmount: 0.6,
    baseOpacity: 0.5,
    connectionOpacityFactor: 0.08,
  },
  speaking: {
    particleCount: 150,
    baseSizeRange: { min: 1.8, max: 2.8 },
    energyLevel: 0.8, // High energy, but controlled
    awakenessSpeed: 0.92,
    restfulness: 0.4, // More responsive
    orbitSpeed: 0.0018,
    ellipticalXFactor: 1.2,
    ellipticalYFactor: 0.9,
    // Expressive, wave-like movements
    deviationX: (time: number, phase: number, energy: number) => 
      Math.sin(time * 0.002 + phase * 1.0) * (10 + energy * 8) + 
      Math.sin(time * 0.004 + phase * 1.8) * (4 + energy * 6),
    deviationY: (time: number, phase: number, energy: number) => 
      Math.cos(time * 0.0025 + phase * 0.9) * (8 + energy * 6) + 
      Math.cos(time * 0.0035 + phase * 1.2) * (3 + energy * 4),
    pulseSpeed: 0.008,
    pulseAmount: 0.12,
    sizePulseAmount: 0.4,
    baseOpacity: 0.7,
    connectionOpacityFactor: 0.1,
  },
  unauthorized: {
    particleCount: 80,
    baseSizeRange: { min: 0.7, max: 1.7 },
    energyLevel: 0.3, // Subdued, uncertain
    awakenessSpeed: 0.88,
    restfulness: 0.6,
    orbitSpeed: 0.0012,
    ellipticalXFactor: 1.0,
    ellipticalYFactor: 1.0,
    // Hesitant, jittery movement
    deviationX: (time: number, phase: number, energy: number) => 
      Math.sin(time * 0.003 + phase * 1.5) * (2 + energy * 3) + 
      (Math.random() - 0.5) * energy * 2,
    deviationY: (time: number, phase: number, energy: number) => 
      Math.cos(time * 0.0035 + phase * 1.2) * (2 + energy * 2.5) + 
      (Math.random() - 0.5) * energy * 1.5,
    pulseSpeed: 0.004,
    pulseAmount: 0.08,
    sizePulseAmount: 0.25,
    baseOpacity: 0.4,
    connectionOpacityFactor: 0.05,
  }
};

// Smooth interpolation with natural easing
const naturalLerp = (current: number, target: number, speed: number): number => {
  const diff = target - current;
  return current + diff * speed;
};

// Organic easing function that mimics natural movement
const organicEase = (t: number): number => {
  // Combines ease-out with a slight bounce for lifelike feel
  const easeOut = 1 - Math.pow(1 - t, 3);
  const bounce = Math.sin(t * Math.PI * 0.5) * 0.1 * (1 - t);
  return Math.min(1, easeOut + bounce);
};

export const AIVoiceParticles: React.FC<AIVoiceParticlesProps> = ({ 
  state = 'listening',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const lastStateChangeRef = useRef(Date.now());
  
  // Natural state transition tracking
  const [currentState, setCurrentState] = useState(state);
  const stateChangeTimeRef = useRef(0);
  
  // Handle state changes naturally
  useEffect(() => {
    if (state !== currentState) {
      setCurrentState(state);
      lastStateChangeRef.current = Date.now();
      stateChangeTimeRef.current = 0;
      
      // Gently awaken particles to the new state
      const newConfig = STATE_CONFIGS[state];
      particlesRef.current.forEach(particle => {
        particle.targetEnergy = newConfig.energyLevel + (Math.random() - 0.5) * 0.2;
        particle.awakening = newConfig.awakenessSpeed;
        particle.restfulness = newConfig.restfulness;
        
        // Set new targets for gradual transition
        const newSize = Math.random() * (newConfig.baseSizeRange.max - newConfig.baseSizeRange.min) + newConfig.baseSizeRange.min;
        particle.targetSize = newSize;
        particle.targetOpacity = newConfig.baseOpacity + (Math.random() - 0.5) * 0.2;
        particle.targetAmplitude = particle.amplitude + (Math.random() - 0.5) * 10;
      });
    }
  }, [state, currentState]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Main animation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // Initialize particles with lifelike properties
    const initializeParticles = () => {
      const config = STATE_CONFIGS[currentState];
      particlesRef.current = [];
      
      for (let i = 0; i < 150; i++) { // Max particles across all states
        const ringIndex = Math.floor(i / 25);
        const baseRadius = 30 + ringIndex * 20;
        const baseSize = Math.random() * (config.baseSizeRange.max - config.baseSizeRange.min) + config.baseSizeRange.min;
        const individualRestfulness = config.restfulness + (Math.random() - 0.5) * 0.2;
          
        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: 0,
          vy: 0,
          size: baseSize,
          targetSize: baseSize,
          initialSize: baseSize,
          opacity: config.baseOpacity + (Math.random() - 0.5) * 0.2,
          targetOpacity: config.baseOpacity + (Math.random() - 0.5) * 0.2,
          phase: Math.random() * Math.PI * 2,
          amplitude: baseRadius + Math.random() * 15,
          targetAmplitude: baseRadius + Math.random() * 15,
          life: 1,
          maxLife: Math.random() * 100 + 50,
          energy: config.energyLevel + (Math.random() - 0.5) * 0.3,
          targetEnergy: config.energyLevel + (Math.random() - 0.5) * 0.3,
          restfulness: Math.max(0.1, Math.min(0.99, individualRestfulness)),
          awakening: config.awakenessSpeed
        });
      }
    };
    
    // Only initialize if particles don't exist
    if (particlesRef.current.length === 0) {
      initializeParticles();
    }
    
    // Animation function with lifelike behavior
    const animate = (time: number) => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      const config = STATE_CONFIGS[currentState];
      const timeSinceStateChange = time - lastStateChangeRef.current;
      
      // Soft gradient background
      const gradient = ctx.createRadialGradient(
        centerX, 
        centerY, 
        0, 
        centerX, 
        centerY, 
        dimensions.width * 0.4
      );
      gradient.addColorStop(0, 'rgba(167, 139, 250, 0.08)');
      gradient.addColorStop(1, 'rgba(139, 167, 250, 0.01)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      // Update particles with natural, lifelike behavior
      const activeParticleCount = Math.min(config.particleCount, particlesRef.current.length);
      
      for (let index = 0; index < activeParticleCount; index++) {
        const particle = particlesRef.current[index];
        if (!particle) continue;
        
        // Natural property transitions - particles gradually adapt to new state
        particle.energy = naturalLerp(particle.energy, particle.targetEnergy, 1 - particle.restfulness);
        particle.size = naturalLerp(particle.size, particle.targetSize, 0.02);
        particle.opacity = naturalLerp(particle.opacity, particle.targetOpacity, 0.015);
        particle.amplitude = naturalLerp(particle.amplitude, particle.targetAmplitude, 0.01);
        
        // Natural orbital movement influenced by energy and state
        const angle = time * config.orbitSpeed * (0.8 + particle.energy * 0.4) + particle.phase;
        const radius = particle.amplitude * (0.9 + particle.energy * 0.2);
        
        // Get natural deviations based on current energy
        const deviationX = config.deviationX(time, particle.phase, particle.energy);
        const deviationY = config.deviationY(time, particle.phase, particle.energy);

        // Smooth position updates
        const targetX = centerX + Math.cos(angle) * radius * config.ellipticalXFactor + deviationX;
        const targetY = centerY + Math.sin(angle) * radius * config.ellipticalYFactor + deviationY;
        
        // Natural movement with inertia
        particle.vx = naturalLerp(particle.vx, (targetX - particle.x) * 0.1, 0.15);
        particle.vy = naturalLerp(particle.vy, (targetY - particle.y) * 0.1, 0.15);
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Natural pulsation influenced by energy
        const pulseFactor = Math.sin(time * config.pulseSpeed * (0.8 + particle.energy * 0.4) + particle.phase);
        const finalSize = particle.size + pulseFactor * config.sizePulseAmount * particle.energy;
        const finalOpacity = Math.max(0, Math.min(1, 
          particle.opacity + pulseFactor * config.pulseAmount * particle.energy
        ));

        // Special unauthorized state behavior
        if (currentState === 'unauthorized' && Math.random() > 0.998) { 
          particle.targetOpacity = Math.min(0.9, particle.targetOpacity * 1.5);
          particle.targetSize = Math.min(particle.initialSize * 1.8, particle.targetSize * 1.3);
        }

        // Draw particle with natural glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, finalSize, 0, Math.PI * 2);
        
        const hue = 250 + particle.energy * 20; // Slight hue variation based on energy
        const saturation = 70 + particle.energy * 15;
        const lightness = 60 + particle.energy * 10;
        
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${finalOpacity})`;
        ctx.fill();
        
        // Subtle glow effect for more alive feeling
        if (particle.energy > 0.4) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, finalSize * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${finalOpacity * 0.1})`;
          ctx.fill();
        }
        
        // Natural connections that strengthen with energy
        if (index % 4 === 0 && particle.energy > 0.3) { 
          for (let otherIndex = 0; otherIndex < activeParticleCount; otherIndex++) {
            const otherParticle = particlesRef.current[otherIndex];
            if (!otherParticle || index === otherIndex || otherIndex % 4 !== 0) continue;
            
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 80) { 
              const connectionStrength = (particle.energy + otherParticle.energy) * 0.5;
              const connectionOpacity = config.connectionOpacityFactor * connectionStrength * (1 - distance / 80);
              
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${connectionOpacity})`;
              ctx.lineWidth = 0.2 + connectionStrength * 0.3;
              ctx.stroke();
            }
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start the natural animation loop
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentState, dimensions]);
  
  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ width: '100%', height: '100%', display: 'block' }} 
    />
  );
};

export default AIVoiceParticles;