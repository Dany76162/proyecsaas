// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  enableVisualEditorPro: true,
  enableTechnicalTools: false,
  enableVisualCadEditor: false,
  enableExperimentalAiTourGenerator: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_AI_TOUR_GENERATOR === "true",
};
