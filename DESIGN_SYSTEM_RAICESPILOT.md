# Design System: RaicesPilot (Phase 2)

## Identidad Visual: "Infraestructura Institucional Serena"
El objetivo es proyectar confianza, orden y profesionalismo para inmobiliarias argentinas. La interfaz debe ser "silenciosa" pero de alta precisión.

---

## 1. Design Tokens

### Colores
- **Brand Blue**: `#2356D9` (Principal acción, acentos críticos).
- **Slate/Navy**: Base estructural (Fondos, bordes, sidebar).
- **Emerald/Amber/Red**: Estados semánticos (Éxito, Advertencia, Peligro).

### Geometría (Radios)
- **`rounded-lg` (8px)**: Estándar para componentes operativos (Botones, Inputs, Badges).
- **`rounded-xl` (12px)**: Estándar para contenedores grandes (Cards, Modales, Secciones).
- **PROHIBIDO**: `rounded-full` (excepto spinners o puntos de estado), `rounded-3xl` o superiores.

### Sombras
- **`shadow-enterprise`**: Sombra sutil y plana para elevación institucional.
- **`shadow-soft`**: Sombra más profunda para interacción y modales.

### Tipografía
- **Títulos**: Font-bold, tracking-tight, Slate-900.
- **Cuerpo**: Font-medium, Slate-700.
- **Labels/Metadatos**: Text-[10px], font-bold, uppercase, tracking-wider, Slate-400/500.

---

## 2. Componentes UI Base (`src/components/ui`)

### Button
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `destructive`.
- **Regla**: Siempre usar `font-bold`. El `primary` usa Brand Blue con sombra de acento.

### Badge
- **Variants**: `neutral`, `success`, `warning`, `danger`, `info`, `brand`.
- **Regla**: Texto siempre en uppercase con tracking-wider.

### Card
- **Variants**: `default` (borde sutil), `elevated` (con sombra), `interactive` (hover effect).
- **Regla**: Siempre usar `rounded-xl`.

### Input / Textarea / Select
- **Estilo**: Fondo `slate-50/50`, borde sutil, foco en `Brand Blue`.
- **Regla**: `rounded-lg`. No usar bordes oscuros por defecto.

### Table
- **Estilo**: Encabezados en `slate-50/50` con texto uppercase. Filas con hover sutil.

### Dialog (Modal)
- **Estilo**: Backdrop blur `slate-900/60`, contenedor `rounded-xl`, animado.

---

## 3. Reglas de Uso y Prohibiciones

- **NO** usar colores ad-hoc (indigo, violet, etc).
- **NO** usar radios inconsistentes.
- **NO** usar sombras pesadas o de colores.
- **SÍ** priorizar el espacio en blanco (spacing) para respiración visual.
- **SÍ** usar iconos de `lucide-react` con trazo fino (h-4 w-4 o h-5 w-5).

---

## 4. Ejemplo de Implementación (Anatomía de Página)

```tsx
<SectionHeader 
  title="Gestión de Clientes" 
  description="Administra los accesos y cuotas de tus inmobiliarias."
  action={<Button variant="primary">Nueva Inmobiliaria</Button>}
/>

<div className="grid grid-cols-3 gap-6">
  <MetricCard title="Leads" value={150} icon={UserPlus} variant="brand" />
  {/* ... */}
</div>

<Card variant="elevated">
  <Table>
    <TableHeader>{/* ... */}</TableHeader>
    <TableBody>{/* ... */}</TableBody>
  </Table>
</Card>
```
