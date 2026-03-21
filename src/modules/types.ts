export type AppModule = {
  key: string;
  label: string;
  description: string;
  workspacePath: string | null;
};

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
