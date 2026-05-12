# RaicesPilot — Plataforma de Inteligencia Inmobiliaria

**Versión**: 3.1 (AgentOS 3.1 Release Candidate)

## 🚀 Setup Rápido

1. **Instalación**:
   ```bash
   cd artifacts/proyecsaas
   npm install
   ```

2. **Base de Datos**:
   ```bash
   npx prisma generate
   # Solo para desarrollo local
   npx prisma migrate dev
   ```

3. **Ejecución**:
   ```bash
   npm run dev
   ```

---

## 🔐 Variables de Entorno (Requeridas)

### Base & Auth
- `DATABASE_URL`: Conexión principal a PostgreSQL.
- `DIRECT_URL`: Conexión directa (si se usa Supabase/Railway).
- `AUTH_SESSION_SECRET`: Secreto para cookies de sesión.
- `OPENAI_API_KEY`: API Key para el motor de agentes.
- `WHATSAPP_TOKEN_ENCRYPTION_KEY`: Llave AES-256 para cifrado de tokens.

### AgentOS & Meta
- `AGENTOS_CRON_SECRET`: Token para disparar tareas programadas.
- `META_APP_ID`: ID de aplicación en Meta for Developers.
- `META_APP_SECRET`: Secreto de la aplicación de Meta.
- `META_REDIRECT_URI`: URL de callback para el flujo OAuth.

### Feature Flags (Seguridad)
- `AGENTOS_ENABLE_META_READONLY`: `true` para habilitar monitoreo.
- `AGENTOS_ENABLE_META_PUBLISHING`: `false` por defecto (activa post-QA).
- `AGENTOS_ENABLE_SCHEDULED_PUBLISHING`: `false` por defecto.

---

## 🛠 Comandos de Producción Seguros

Para garantizar la estabilidad en entornos como Railway:

1. **Migraciones**:
   ```bash
   npx prisma migrate deploy --schema prisma/schema.prisma
   ```
   *Nunca usar `db push` ni `migrate reset` en producción.*

2. **Validación Pre-Deploy**:
   ```bash
   npx prisma validate
   npx tsc --noEmit
   npx next build
   ```

---

## 📖 Documentación

- **Manual Operativo**: [MANUAL_OPERATIVO.md](./MANUAL_OPERATIVO.md)
- **Arquitectura Maestro**: [MANUAL_MAESTRO.md](./MANUAL_MAESTRO.md)
- **Manual Vivo**: Accesible en `/platform/master-manual` (Solo Superadmin).

---

## ⚠️ Advertencias Críticas

- **Seguridad**: El acceso a las herramientas de AgentOS está restringido estrictamente a administradores de plataforma.
- **Tokens**: Nunca expongas los tokens de Meta o WhatsApp en logs o interfaces.
- **Ready State**: Consulta el **Readiness Center** en el panel Superadmin tras cada despliegue para validar el estado de la infraestructura.