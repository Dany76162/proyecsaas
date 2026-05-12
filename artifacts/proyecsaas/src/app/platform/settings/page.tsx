import { getGlobalSettings, getDelegatedAdmins } from "./actions/settings-actions";
import PlatformSettingsUI from "./PlatformSettingsUI";

export default async function PlatformSettingsPage() {
  const [globalSettings, delegatedAdmins] = await Promise.all([
    getGlobalSettings(),
    getDelegatedAdmins(),
  ]);

  const settings = {
    waContact: globalSettings.waContact,
    basePrice: globalSettings.basePrice,
    operatorName: globalSettings.operatorName,
    operatorLastName: globalSettings.operatorLastName,
    operatorCuid: globalSettings.operatorCuid,
    operatorCompany: globalSettings.operatorCompany,
    mpStatus: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    aiStatus: !!(process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env.OPENAI_API_KEY),
  };

  return <PlatformSettingsUI settings={settings} delegatedAdmins={delegatedAdmins} />;
}
