import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";

import logo1 from "../images/logo1.png";
import logo2 from "../images/logo2.png";
import logo3 from "../images/logo3.png";
import logo4 from "../images/logo4.png";
import logo5 from "../images/logo5.png";
import logo6 from "../images/logo6.png";
import logo7 from "../images/logo7.png";
import logo8 from "../images/logo8.png";
import logo9 from "../images/logo9.png";
import logo10 from "../images/logo10.png";
import logo11 from "../images/logo11.png";
import logo12 from "../images/logo12.png";

import bgVideo from "../images/bgvideo.mp4";
import { useNavigate } from "react-router";

function Loginanother() {
  const navigate = useNavigate();
  const [showLogo, setShowLogo] = useState(false); 

  useEffect(() => {
    const timer1 = setTimeout(() => setShowLogo(true), 1000);
    return () => {
      clearTimeout(timer1);
    };
  }, []);

  const logos = [
    logo1, logo2, logo3, logo4, logo5, logo6,
    logo7, logo8, logo9, logo10, logo11, logo12,
  ];

   const handleLogin = ()=>{
    navigate("/home")
  }
 
  const logoVariants = {
    hidden: { opacity: 0, x: -150, rotate: -10 },
    visible: (i: any) => ({
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        delay: i * 0.2, 
        duration: 0.9,
        ease: "easeOut" as Transition["ease"],
      },
    }),
   
  };

  return (
    <div className="h-[100vh] bg-contain bg-center flex">
    
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={bgVideo} type="video/mp4" />
      </video>

      {/* Wavy SVG */}
      <svg
        className="absolute top-0 left-0 h-full w-full"
        viewBox="0 0 500 150"
        preserveAspectRatio="none"
      >
        <path fill="#972E26">
          <animate
            attributeName="d"
            dur="4s"
            repeatCount="indefinite"
            values="
              M0,0 C150,10 300,20 300,150 L0,150 Z;
              M0,0 C120,45 320,0 300,150 L0,150 Z;
              M0,0 C150,10 300,20 300,150 L0,150 Z"
          />
        </path>
      </svg>

      {/* Left side */}
      <div className="relative h-[100vh] w-[50%] overflow-hidden flex items-center justify-center">
        <div className="bg-white/50 rounded-2xl text-white z-50 p-6 w-[50%]">
          <h2 className="font-bold text-3xl text-center mb-1">Login</h2>
          <p className="text-center">Enter your details</p>

          <div className="flex flex-col mt-5 gap-2">
            <label>User Name:</label>
            <input
              type="text"
              placeholder="Enter user name"
              className="rounded-3xl text-[#972E26] bg-white/80 placeholder-[#972E26] placeholder:text-sm px-4 py-2 focus:outline-none"
            />
          </div>
          <div className="flex flex-col mt-5 gap-2">
            <label>Password:</label>
            <input
              type="password"
              placeholder="Enter password"
              className="rounded-3xl  text-[#972E26] bg-white/80 placeholder-[#972E26] placeholder:text-sm px-4 py-2 focus:outline-none"
            />
          </div>

          <p className="text-blue-600 text-sm text-right mt-1">
            Forgot password?
          </p>
          <button className="bg-[#972E26] w-full rounded-3xl text-white px-3 py-2 mt-7 mx-auto" onClick={handleLogin}>
            Submit
          </button>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center justify-center w-[50%] relative z-50">
        <div className="grid grid-cols-3 gap-10">
          <AnimatePresence>
            {showLogo &&
              logos.map((logo, i) => (
                <motion.img
                  key={i}
                  src={logo}
                  alt={`logo-${i}`}
                  className="rounded-full bg-white w-28 h-28 p-4 shadow-lg object-contain"
                  custom={i}
                  variants={logoVariants}
                  initial="hidden"
                  animate="visible"
                  
                />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Loginanother;
