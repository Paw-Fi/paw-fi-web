import React, { useState, useEffect, useRef } from 'react';
import FOG from 'vanta/dist/vanta.fog.min'; // Import the Vanta effect you want
import * as THREE from 'three'; // Import Three.js

 const AmbientHalo = () => {
    // A reference to the DOM element where the animation will be rendered
    const vantaRef = useRef(null); 
    
    // State to hold the Vanta effect instance
    const [vantaEffect, setVantaEffect] = useState(null);

    useEffect(() => {
        // Initialize the Vanta effect only if it hasn't been created yet
        if (!vantaEffect) {
            setVantaEffect(FOG({
                el: vantaRef.current,
                THREE: THREE, // Pass the THREE.js library
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                highlightColor: 0xd4a7f0,
                midtoneColor: 0x63c5b7,
                lowlightColor: 0x568bfa,
                blurFactor: 0.73,
                speed: 2.10,
                zoom: 0.50
            }));
        }

        // Cleanup function: This will be called when the component unmounts
        return () => {
            if (vantaEffect) {
                vantaEffect.destroy(); // Destroy the effect to free up resources
            }
        };
    }, [vantaEffect]); // The effect runs only when vantaEffect state changes

    return (
        <div className="vanta-container">
        <div 
            ref={vantaRef} 
            className="fixed inset-0 z-5 w-full h-full overflow-hidden z-0 pointer-events-none"
            style={{ backgroundColor: '#f0f0ff',opacity: 0.45}}
        >
        </div>
        
  
    </div>
    );
};

export default AmbientHalo;