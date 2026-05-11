const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "src/app/platform/support/page.tsx",
  "src/app/platform/settings/PlatformSettingsUI.tsx",
  "src/app/platform/page.tsx",
  "src/app/platform/organizations/[orgId]/page.tsx",
  "src/app/platform/onboarding/page.tsx",
  "src/app/platform/health/page.tsx",
  "src/app/platform/captacion/page.tsx",
  "src/app/platform/billing/page.tsx",
  "src/app/platform/ai-operations/page.tsx",
  "src/app/platform/agents/canvas/page.tsx",
  "src/app/platform/agents/page.tsx",
  "src/app/platform/agents/tasks/page.tsx",
  "src/app/platform/agents/tasks/new/page.tsx",
  "src/app/platform/agents/logs/page.tsx",
  "src/app/platform/agents/approvals/page.tsx",
  "src/app/platform/agents/content/page.tsx",
  "src/app/platform/activation/page.tsx"
];

const patternsToRemove = [
  "mx-auto max-w-6xl",
  "mx-auto max-w-5xl",
  "mx-auto max-w-4xl",
  "mx-auto max-w-3xl",
  "mx-auto max-w-[1500px]",
  "max-w-[1200px] mx-auto w-full",
  "mx-auto max-w-[1200px]",
  "max-w-6xl mx-auto",
  "max-w-5xl mx-auto",
  "max-w-3xl mx-auto"
];

for (const relPath of filesToUpdate) {
  const fullPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    
    for (const pattern of patternsToRemove) {
      // Create a global regex to replace the pattern and any extra spaces
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'g');
      content = content.replace(regex, '');
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Updated: ${relPath}`);
    } else {
      console.log(`No changes made to: ${relPath}`);
    }
  } else {
    console.log(`File not found: ${relPath}`);
  }
}
