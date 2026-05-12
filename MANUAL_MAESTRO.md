# Manual Maestro de Arquitectura y Operación — RaicesPilot

**Versión**: 3.1  
**Estado**: Release Candidate  

## 1. Visión General del Producto
RaicesPilot es un ecosistema SaaS diseñado para transformar inmobiliarias tradicionales en organizaciones asistidas por inteligencia artificial. La arquitectura se basa en una separación clara entre la **Operación de Tenant** (Inmobiliaria) y la **Gobernanza de Plataforma** (AgentOS).

## 2. Arquitectura de Datos (ERD Lite)
- **Organization (Tenant)**: Contenedor lógico de datos. Aislamiento total por `organizationId`.
- **AiAgent**: Entidad reactiva (WhatsApp) y proactiva (AgentOS).
- **AgentRun / Task**: Registro de ejecuciones y ciclos de pensamiento de la IA.
- **AgentGovernancePolicy**: Centralización de límites (Budget Guard).

## 3. Modelo Multi-tenant (Seguridad)
El acceso está protegido por:
1. **Membresías**: Un usuario puede pertenecer a múltiples organizaciones.
2. **Platform Admin**: Flag global que habilita el acceso a `/platform`.
3. **Cifrado de Secretos**: Uso de `WHATSAPP_TOKEN_ENCRYPTION_KEY` para tokens de terceros.

## 4. AgentOS 3.1: Orquestación Inteligente
AgentOS permite automatizar procesos complejos (Marketing, Análisis, Operaciones) mediante:
- **Director Operativo IA**: Orquestador principal de objetivos.
- **Canvas Operativo**: Visualización de la jerarquía de agentes y tareas.
- **Content Calendar**: Gestión de publicaciones hacia Meta (FB/IG).

## 5. Gobernanza y Protección (Budget Guard)
El **Budget Guard** previene desbordamientos de costos y comportamientos erráticos:
- **Límites de Tareas**: Máximo de tareas por objetivo.
- **Nivel de Autonomía**: Grados de libertad antes de requerir aprobación humana.
- **Readiness Center**: Validación de salud de API Key, Cron y Conectividad.

## 6. Integración con Meta
- **Seguridad**: Los tokens de Meta se obtienen vía OAuth y se almacenan cifrados.
- **Feature Flags**: La publicación real está bloqueada por `AGENTOS_ENABLE_META_PUBLISHING=false` por defecto.
- **Audit Logs**: Registro de cada post y respuesta de la API de Meta.

## 7. Protocolo de Producción y Deploy
1. **Migraciones**: Ejecución obligatoria de `prisma migrate deploy`.
2. **Validación**: Ningún despliegue se considera válido sin `tsc --noEmit` exitoso.
3. **Check-in**: El primer paso tras el deploy es visitar `/platform/agents/readiness`.

## 8. Roadmap Operativo
- **Fase Actual**: AgentOS 3.1 RC (Superadmin Only).
- **Próxima Fase**: AgentOS para Inmobiliarias (Habilitación por Tenant).
- **Futuro**: Integraciones con Portales (Zonaprop/Argenprop) vía Agentes de Carga.

---
**Propiedad de Inmuebles Digitales — 2026**
