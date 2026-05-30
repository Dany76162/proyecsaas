const { PrismaClient } = require("@prisma/client");

// Use the same DB URL as in .env
process.env.DATABASE_URL = "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";

const prisma = new PrismaClient();

async function setup() {
  console.log("Configurando nÃºmero de WhatsApp de plataforma...");

  try {
    const key = "PLATFORM_WHATSAPP_NUMBER";
    const value = "5491166037990";

    const setting = await prisma.globalSetting.findUnique({ where: { key } });

    if (!setting) {
      console.log(`Creando setting: ${key} = ${value}`);
      await prisma.globalSetting.create({
        data: {
          key,
          value,
          description: "NÃºmero oficial de WhatsApp de la plataforma para captaciÃ³n y soporte.",
        }
      });
    } else {
      console.log(`Actualizando setting: ${key} = ${value}`);
      await prisma.globalSetting.update({
        where: { key },
        data: { value }
      });
    }

    console.log("ConfiguraciÃ³n completada!");
  } catch (error) {
    console.error("Error al configurar WhatsApp:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
