const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Use the same DB URL as in .env
process.env.DATABASE_URL = "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";

const prisma = new PrismaClient();

async function setup() {
  const rawNumber = "+54 9 11 6163-0205";
  // Limpiamos el nÃºmero para wa.me (solo dÃ­gitos)
  const cleanNumber = rawNumber.replace(/\D/g, "");
  
  console.log(`Configurando nÃºmero oficial: ${rawNumber} (Limpio: ${cleanNumber})`);

  try {
    // 1. Actualizar GlobalSetting
    const key = "PLATFORM_WHATSAPP_NUMBER";
    await prisma.globalSetting.upsert({
      where: { key },
      update: { value: cleanNumber },
      create: {
        key,
        value: cleanNumber,
        description: "NÃºmero oficial de WhatsApp de la plataforma para captaciÃ³n y soporte.",
      }
    });
    console.log("DB: GlobalSetting actualizado.");

    // 2. Actualizar .env para persistencia y fallbacks
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      
      const newVar = `WHATSAPP_PLATFORM_PHONE_DISPLAY="${cleanNumber}"`;
      
      if (envContent.includes("WHATSAPP_PLATFORM_PHONE_DISPLAY")) {
        envContent = envContent.replace(/WHATSAPP_PLATFORM_PHONE_DISPLAY=.*/, newVar);
      } else {
        envContent += `\nWHATSAPP_PLATFORM_PHONE_DISPLAY="${cleanNumber}"\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(".env: Variable WHATSAPP_PLATFORM_PHONE_DISPLAY actualizada.");
    }

    console.log("Â¡Todo configurado con el nuevo nÃºmero oficial!");
  } catch (error) {
    console.error("Error al configurar WhatsApp:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
