import { updateGlobalSetting, getGlobalSettings } from "./actions/settings-actions";
import PlatformSettingsUI from "./PlatformSettingsUI";

export default async function PlatformSettingsPage() {
  const globalSettings = await getGlobalSettings();
  
  const settings = {
    waContact: globalSettings.waContact,
    basePrice: globalSettings.basePrice,
    mpStatus: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    aiStatus: !!(process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env.OPENAI_API_KEY),
  };

  return <PlatformSettingsUI settings={settings} />;
}
