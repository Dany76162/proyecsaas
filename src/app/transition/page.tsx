"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TransitionContent() {
  const router = useRouter();
  const params = useSearchParams();

  const raw = params.get("next");
  const destination =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(destination);
    }, 2000);
    return () => clearTimeout(timer);
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
