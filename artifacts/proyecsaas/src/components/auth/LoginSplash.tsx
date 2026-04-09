"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginSplashProps {
  onComplete: () => void;
  duration?: number;
}

const SUCCESS_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

export function LoginSplash({ onComplete, duration = 2500 }: LoginSplashProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Play success sound
    const audio = new Audio(SUCCESS_SOUND_URL);
    audio.volume = 0.4;
    audio.play().catch((err) => console.log("Audio play blocked:", err));

    const timer = setTimeout(() => {
      setIsExiting(true);
      // Give time for exit animation
      setTimeout(onComplete, 800);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden">
      <AnimatePresence>
        {!isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="relative flex h-full w-full flex-col items-center justify-center"
          >
            {/* Background Image with subtle zoom */}
            <motion.div 
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: duration / 1000 + 1, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img
                src="/onboarding/closing.png"
                alt="Raíces Pilot"
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
            </motion.div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6">
              {/* Logo/Icon placeholder if needed, current uses the full image logo */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="space-y-4"
              >
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                  Raíces<span className="text-brand-400">Pilot</span>
                </h1>
                <p className="text-lg md:text-xl font-medium text-white/80">
                  Tu éxito, automatizado.
                </p>
              </motion.div>

              {/* Loading Indicator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-center gap-4 mt-8"
              >
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.2,
                      }}
                      className="h-2 w-2 rounded-full bg-brand-500"
                    />
                  ))}
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                  Iniciando Workspace
                </span>
              </motion.div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-brand-500/20">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className="h-full bg-brand-500 shadow-[0_0_15px_rgba(var(--brand-500),0.8)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
