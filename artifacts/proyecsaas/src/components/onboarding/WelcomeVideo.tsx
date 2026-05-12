"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeVideoProps {
  onComplete: () => void;
}

export function WelcomeVideo({ onComplete }: WelcomeVideoProps) {
  const [stage, setStage] = useState<"video" | "closing">("video");
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setStage("closing");
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {stage === "video" ? (
          <motion.div
            key="video-stage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
          >
            <video
              ref={videoRef}
              src="/onboarding/welcome.mp4"
              autoPlay
              muted={isMuted}
              className="h-full w-full object-cover"
            />

            {/* Controls Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 transition-opacity hover:opacity-100">
              <div className="flex justify-end">
                <button
                  onClick={handleSkip}
                  className="group flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 transition-all"
                >
                  Saltar
                  <X className="h-4 w-4 transition-transform group-hover:rotate-90" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
                  >
                    {isPlaying ? <X className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
                  >
                    {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Direct Skip Button (Always visible but subtle) */}
             <button
                onClick={handleSkip}
                className="absolute top-4 right-4 z-10 rounded-full bg-black/40 p-2 text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
          </motion.div>
        ) : (
          <motion.div
            key="closing-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex flex-col items-center"
          >
            <div className="relative h-[500px] w-[800px] overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
              <img
                src="/onboarding/closing.png"
                alt="RaÃ­ces Pilot Closing"
                className="h-full w-full object-cover"
              />
              
              {/* Overlay message and button */}
              <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent pb-16">
                <motion.div
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.3 }}
                   className="text-center"
                >
                  <button
                    onClick={onComplete}
                    className="group flex items-center gap-3 rounded-full bg-brand-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    Empezar ahora
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              </div>
            </div>
            
            {/* Argentine Spanish Note (Visual reminder of the voice-over) */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
              className="mt-6 text-sm italic text-white/60"
            >
              "Tu Ã©xito, automatizado. Empecemos."
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
