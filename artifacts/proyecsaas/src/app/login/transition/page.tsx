"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoginSplash } from "@/components/auth/LoginSplash";

function TransitionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextPath = searchParams.get("next") || "/";

  const handleComplete = () => {
    router.replace(nextPath);
  };

  if (!mounted) return null;

  return <LoginSplash onComplete={handleComplete} duration={2500} />;
}

export default function LoginTransitionPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <TransitionContent />
    </Suspense>
  );
}
