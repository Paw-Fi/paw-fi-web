// GSAP configuration and plugin registration
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';

// Register all GSAP plugins
gsap.registerPlugin(ScrollTrigger, Draggable);

export { gsap, ScrollTrigger, Draggable };
