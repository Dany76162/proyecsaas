// Native fetch available in Node 20
const EVOLUTION_URL = "https://evolution-api-production-dfff.up.railway.app";
const EVOLUTION_KEY = "rp_evolution_7T9xK2mQpL4vR8sZ2026_segura"; 

async function testConnection() {
  console.log("--- Diagnóstico de Conexión Evolution API v2 ---");
  console.log(`URL Base: ${EVOLUTION_URL}`);
  
  const endpoints = [
    { name: "Fetch Instances", path: "/instance/fetchInstances", method: "GET" },
    { name: "Health (Root)", path: "/", method: "GET" }
  ];

  for (const ep of endpoints) {
    console.log(`\nProbando ${ep.name} [${ep.method} ${ep.path}]...`);
    try {
      const response = await fetch(`${EVOLUTION_URL}${ep.path}`, {
        method: ep.method,
        headers: { 
          "apikey": EVOLUTION_KEY,
          "Content-Type": "application/json"
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      const body = await response.text();
      console.log("Body:", body.slice(0, 500));
      
      if (response.status === 401) {
        console.log("⚠️ Intento fallido con apikey. Probando con Authorization: Bearer...");
        const responseBearer = await fetch(`${EVOLUTION_URL}${ep.path}`, {
          method: ep.method,
          headers: { 
            "Authorization": `Bearer ${EVOLUTION_KEY}`,
            "Content-Type": "application/json"
          }
        });
        console.log(`Status (Bearer): ${responseBearer.status}`);
      }
    } catch (err) {
      console.error(`❌ ERROR DE RED en ${ep.name}:`, err.message);
    }
  }
}

testConnection();
