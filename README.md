# RaicesPilot SaaS

Plataforma SaaS multi-tenant B2B diseñada para automatizar la captación y calificación de leads en inmobiliarias de Argentina mediante Inteligencia Artificial (WhatsApp API + GPT-4).

## Estructura del Proyecto

El proyecto es un monorepo basado en `pnpm workspaces`:

- **Raíz (`/`)**: Configuración global del workspace y dependencias compartidas.
- **App Principal (`artifacts/proyecsaas/`)**: Núcleo de la aplicación Next.js, esquemas de Prisma y worker.

## Rama de Trabajo

- **Rama Actual/Recomendada**: `proyecsaas2`
- **Flujo de Promoción**: Los desarrollos se estabilizan en `proyecsaas2` antes de ser integrados a `main` para despliegues definitivos.

## Guía de Desarrollo Local

### Comandos Mínimos (desde la raíz)

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm --filter @workspace/proyecsaas run prisma:generate

# Iniciar Next.js en desarrollo
pnpm --filter @workspace/proyecsaas run dev

# Iniciar el Worker de IA/WhatsApp en desarrollo
pnpm --filter @workspace/proyecsaas run worker:dev
```

## Guía de Deployment

### Pipeline de Producción (Railway + Nixpacks)

El sistema opera bajo una política de **estabilidad absoluta**:

- **Cero Mutaciones Automáticas**: El pipeline de build y el arranque (`start`) NO ejecutan comandos que alteren la base de datos (`db push`, `migrate`).
- **Intervenciones**: Cualquier cambio en el esquema debe ser regularizado mediante intervenciones manuales controladas fuera del flujo de despliegue automático.

## Notas de Seguridad

- **Auth Standard**: Flujo basado en invitaciones (`InviteToken`) que fuerzan la creación de contraseñas seguras.
- **Fallback Legacy**: El sistema permite el acceso mediante `AUTH_SHARED_PASSWORD` **exclusivamente** para usuarios marcados como `isPlatformAdmin: true` que no poseen un hash de contraseña previo. No debe usarse para usuarios regulares.

---
Para más detalles técnicos, consultar: [AUDITORIA_TECNICA.md](./AUDITORIA_TECNICA.md)

## Filosofía de Operación

- El sistema prioriza estabilidad sobre automatización agresiva.
- No se ejecutan mutaciones de base de datos automáticamente.
- Cada cambio estructural es explícito, revisado y controlado.
- La rama `proyecsaas2` actúa como entorno de estabilización previo a producción.