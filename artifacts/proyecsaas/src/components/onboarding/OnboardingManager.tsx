"use client";

import React, { useState, useEffect } from "react";
import { WelcomeVideo } from "./WelcomeVideo";

const ONBOARDING_KEY = "raicespilot_onboarding_seen";

export function OnboardingManager() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Check if user has already seen the video
    const hasSeen = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeen) {
      setShowVideo(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowVideo(false);
  };

  if (!showVideo) return null;

  return <WelcomeVideo onComplete={handleComplete} />;
}
