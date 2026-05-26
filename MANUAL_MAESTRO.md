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

## 9. Gobernanza Comercial y Reglas de Suscripción (Manual vs Automático)

El motor comercial opera bajo las siguientes directrices y reglas estrictas de negocio para garantizar la coherencia de datos, prevenir el acceso a usuarios morosos y salvaguardar la reputación pública de la plataforma:

### 9.1. El Ecosistema de Suscripciones
Cada `Organization` posee una relación uno-a-uno opcional con `Subscription`. El estado de esta suscripción define si las funcionalidades del Tenant y de **AgentOS** están desbloqueadas.

#### Matriz de Estados de Suscripción y Accesos:

| Estado (`SubscriptionStatus`) | ¿Tiene Acceso al Panel? | ¿Se muestra en Landing Pública? | Descripción y Comportamiento |
| :--- | :---: | :---: | :--- |
| **`ACTIVE`** (Activa) | **SÍ** | **SÍ** | Cuenta con pago registrado (automático o manual). Acceso completo. |
| **`TRIALING`** (Trial) | **SÍ** | **NO** | Periodo de onboarding o demostración activa. Excluido del carrusel de producción. |
| **`PAST_DUE`** (Falta Pago) | **SÍ** (Con Alerta) | **NO** | Período de gracia. Notificaciones de cobranza activas. |
| **`SUSPENDED`** (Suspendida) | **NO** | **NO** | Acceso bloqueado. Bots de WhatsApp pausados. |
| **`CANCELLED`** (Cancelada) | **NO** | **NO** | Cuenta dada de baja definitiva. |

### 9.2. Reglas del Agente IA CEO
El Agente IA CEO debe seguir estrictamente estas prioridades operativas al interactuar con clientes o procesar consultas administrativas:
1. **Prioridad del Control Manual**: Cualquier actualización manual ejecutada por el Superadmin (ej. método `TRANSFER`, `CASH` o `COURTESY`) tiene jerarquía absoluta sobre los webhooks. La IA no debe intentar anular o revertir estados manuales a menos que se registre un nuevo pago online válido posterior.
2. **Exclusión de Pruebas**: Para proteger la estética y seriedad de la plataforma en producción, en el carrusel de la Landing Pública **solo figurarán inmobiliarias con estado `ACTIVE`** que hayan completado su proceso de Onboarding. Cuentas en estado `TRIALING` o demostraciones incompletas nunca deben listarse públicamente.
3. **Automatización Asistida**: En caso de retraso en los pagos (`PAST_DUE`), la IA propondrá o enviará mensajes utilizando la acción `suggestBillingMessageAction`, adaptando el tono según los días de mora y facilitando el link de pago seguro de Mercado Pago (`mpPaymentUrl`).

---
**Propiedad de Inmuebles Digitales — 2026**

