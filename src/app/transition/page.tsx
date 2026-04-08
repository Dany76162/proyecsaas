"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SPLASH_MIN_DURATION_MS = 2000;
const SPLASH_MAX_DURATION_MS = 2300;
const SPLASH_SOUND_URL = "/onboarding/login-premium.wav";
const SPLASH_SOUND_VOLUME = 0.28;

function TransitionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const hasStartedRef = useRef(false);

  const raw = params.get("next");
  const destination =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const audio = new Audio(SPLASH_SOUND_URL);
    let minDurationElapsed = false;
    let audioFinished = false;
    let completed = false;

    const completeTransition = () => {
      if (completed || !minDurationElapsed || !audioFinished) {
        return;
      }

      completed = true;
      router.replace(destination);
    };

    const handleAudioFinished = () => {
      audioFinished = true;
      completeTransition();
    };

    audio.preload = "auto";
    audio.volume = SPLASH_SOUND_VOLUME;
    audio.addEventListener("ended", handleAudioFinished);
    audio.addEventListener("error", handleAudioFinished);

    const minTimer = setTimeout(() => {
      minDurationElapsed = true;
      completeTransition();
    }, SPLASH_MIN_DURATION_MS);

    const maxTimer = setTimeout(() => {
      handleAudioFinished();
    }, SPLASH_MAX_DURATION_MS);

    audio.play().catch(() => {
      handleAudioFinished();
    });

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener("ended", handleAudioFinished);
      audio.removeEventListener("error", handleAudioFinished);
    };
  }, [destination, router]);

  return <SplashImage />;
}

function SplashImage() {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <img
        src="/onboarding/closing.png"
        alt=""
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}

export default function TransitionPage() {
  return (
    <Suspense fallback={<SplashImage />}>
      <TransitionContent />
    </Suspense>
  );
}
