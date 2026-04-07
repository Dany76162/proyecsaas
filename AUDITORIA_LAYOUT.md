# Auditoría Estructural de Layout y Responsive — RaicesPilot

**Fecha**: Abril 2026
**Rama analizada**: `dev-proyecsaas1`
**Propósito**: Mapa de problemas estructurales de layout detectados para resolver en fase de reparación.

---

## A. Hallazgos en shells/layouts raíz

**1. Asimetría `overflow-x-hidden` entre shells**
- **Plataforma (SuperAdmin):** El `<main>` tiene `overflow-x-hidden` → errores de flex quedan enmascarados visualmente.
- **Inmobiliaria (Admin/Tenant):** El `<main>` **NO tiene** `overflow-x-hidden`. Cualquier componente interno que viole Flexbox forzará scroll horizontal catastrófico en móvil.
- **Corrección aplicada en este cierre**: `workspace-shell.tsx` NO fue tocado en este commit (pertenece a la siguiente fase de reparación estructural).

**2. Truncamiento frágil en headers**
- Ambas shells usan `max-w-[160px]` / `max-w-[200px]` estáticos para truncar nombres de usuario y emails.
- En viewports muy estrechos (iPhone SE) estos anchos fijos pueden seguir empujando el layout.
- Solución correcta: usar `min-w-0 flex-1` en el contenedor del texto.

---

## B. Bugs confirmados en SuperAdmin

**1. Footer/Logout desaparece en sidebar mobile (Crítico — CORREGIDO EN ESTE COMMIT)**
- **Archivo**: `src/components/platform/platform-sidebar.tsx`
- **Causa**: El `<aside>` raíz tenía `overflow-y-auto` global, haciendo que el footer scrolleara fuera de la pantalla al abrirse el sidebar en móvil.
- **Fix aplicado**: El sidebar de Superadmin fue normalizado para tener la misma estructura que el de Inmobiliaria: scroll solo en el bloque interno `<nav>`, footer `shrink-0` fijo al fondo.

**2. `platform-shell.tsx` <main> sin `overflow-x-hidden` ni padding estándar (CORREGIDO)**
- El main no tenía `min-w-0` ni `overflow-x-hidden`, dejando el panel vulnerable a desbordamientos.
- Padding no era consistente con workspace-shell.

---

## C. Bugs confirmados en Admin Inmobiliario

**1. `LeadMiniCard` sin `min-w-0` en nodos flex con datos dinámicos (PENDIENTE)**
- **Archivo**: `src/components/workspace/lead-mini-card.tsx`
- El `<p>` con `fullName` no tiene truncado ni `min-w-0` → nombres muy largos desbordas la tarjeta.
- **No corregido en este commit**; pertenece a la ronda de normalización de layout.

**2. `workspace-shell.tsx` sin `overflow-x-hidden` (PENDIENTE)**
- El `<main>` del shell de Inmobiliaria no tiene `overflow-x-hidden`.
- Cualquier componente que rompa width generará scroll horizontal global en móvil.
- **No corregido en este commit**; pertenece a la ronda de normalización de layout.

---

## D. Componentes base riesgosos

| Componente | Riesgo | Prioridad | Estado |
|---|---|---|---|
| `platform-sidebar.tsx` | Footer perdido en mobile por overflow global | **Crítica** | ✅ Corregido |
| `platform-shell.tsx` | Main sin overflow-x-hidden ni min-w-0 | **Alta** | ✅ Corregido |
| `workspace-shell.tsx` | Main sin overflow-x-hidden | **Alta** | ⏳ Pendiente |
| `lead-mini-card.tsx` | Flex sin min-w-0, texto dinámico | **Alta** | ⏳ Pendiente |
| Ambas shells (header) | Truncado con max-w estático | **Media** | ⏳ Pendiente |

---

## E. Ronda de Normalización Pendiente

Los siguientes archivos deben corregirse en la próxima fase de reparación de layout:

1. `src/components/workspace/workspace-shell.tsx` → añadir `overflow-x-hidden` al `<main>`
2. `src/components/workspace/lead-mini-card.tsx` → añadir `min-w-0 truncate` al párrafo de `fullName`
3. `src/components/workspace/stage-column.tsx` → añadir `truncate` al título `<h3>`
4. Headers de ambas shells → migrar de `max-w-[...]` estático a `min-w-0 flex-1 truncate`
