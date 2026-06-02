# Design System

Guía operativa del sistema de diseño de inmogrid.cl. Si vas a tocar UI — escribir componentes, cambiar colores, agregar un estilo nuevo — empezá por acá.

Para la decisión arquitectónica ver [ADR-003](adr/ADR-003-design-tokens-two-layer-system.md).

---

## TL;DR

- **Los colores viven en `src/app/globals.css`**. `tailwind.config.ts` solo los referencia.
- **Usa clases semánticas** (`text-primary`, `bg-accent`, `border-muted`), nunca clases Tailwind raw (`text-blue-600`, `bg-slate-100`).
- **Alpha modifiers funcionan**: `bg-primary/20`, `hover:bg-primary/10`, `text-foreground/50`.
- **Agregar un color nuevo**: definir la var en `globals.css`, referenciarla en `tailwind.config.ts`. Dos archivos.

---

## Arquitectura en dos capas

```
┌────────────────────────────────────────────────────────┐
│  Capa 1 — CSS custom properties (globals.css)          │
│  ÚNICA fuente de verdad. Valores RGB triples.          │
│                                                         │
│  :root {                                                │
│    --primary:            239 184 16;   /* #EFB810 */   │
│    --primary-foreground: 0 0 0;                         │
│    --background:         248 242 232; /* #F8F2E8 */   │
│    ...                                                  │
│  }                                                      │
└────────────────────────┬───────────────────────────────┘
                         │ referencia (no redefine)
                         ▼
┌────────────────────────────────────────────────────────┐
│  Capa 2 — Tailwind config (tailwind.config.ts)         │
│                                                         │
│  colors: {                                              │
│    primary: {                                           │
│      DEFAULT:    'rgb(var(--primary) / <alpha-value>)',│
│      foreground: 'rgb(var(--primary-foreground) /      │
│                       <alpha-value>)',                  │
│    },                                                   │
│    ...                                                  │
│  }                                                      │
└────────────────────────┬───────────────────────────────┘
                         │ consumo
                         ▼
┌────────────────────────────────────────────────────────┐
│  Capa 3 — Componentes                                  │
│                                                         │
│  <button className="bg-primary text-primary-foreground │
│                     hover:bg-primary/90">              │
│    Acción                                               │
│  </button>                                              │
└────────────────────────────────────────────────────────┘
```

El componente **nunca** sabe de qué color es `primary`. Solo sabe que existe y qué rol cumple. Cambiar el amarillo a rojo es editar un solo valor en `globals.css`.

---

## Los 12 tokens semánticos

Los nombres vienen del estándar de shadcn/ui y representan **roles visuales**, no colores literales.

| Token | Para qué sirve | Ejemplo de uso |
|---|---|---|
| `primary` / `primary-foreground` | CTAs, brand accents, focus rings, active states | `bg-primary text-primary-foreground` |
| `secondary` / `secondary-foreground` | Acciones secundarias (raramente usado hoy) | — |
| `background` / `foreground` | Canvas global y texto base | `bg-background text-foreground` |
| `card` / `card-foreground` | Superficies elevadas (tarjetas, panels) | `bg-card text-card-foreground` |
| `popover` / `popover-foreground` | Dropdowns, menús flotantes, tooltips | `bg-popover text-popover-foreground` |
| `muted` / `muted-foreground` | Fondos desaturados, texto secundario | `bg-muted text-muted-foreground` |
| `accent` / `accent-foreground` | Highlights suaves, chat bubbles del usuario, hover states | `bg-accent text-accent-foreground` |
| `destructive` / `destructive-foreground` | Errores, botones delete, estados críticos | `bg-destructive text-destructive-foreground` |
| `border` | Bordes estructurales de cards/inputs | `border border-border` |
| `input` | Bordes específicos de form inputs | `border-input` |
| `ring` | Focus rings (Tailwind lo usa automáticamente en `focus:ring-*`) | `focus:ring-2 focus:ring-ring` |

### ¿Cuál token uso para qué?

| Quiero… | Usa… |
|---|---|
| Un CTA principal amarillo | `bg-primary text-primary-foreground hover:bg-primary/90` |
| Un fondo muy sutil para un banner informativo | `bg-primary/10` |
| Un hover state de link | `hover:text-primary` |
| Un chip / badge con el color de marca | `bg-primary/20 text-primary border border-primary/30` |
| Una card con borde | `bg-card border border-border rounded-lg` |
| Un botón destructivo | `bg-destructive text-destructive-foreground` |
| Texto secundario (placeholder, hint, metadata) | `text-muted-foreground` |
| Un focus ring en un input | `focus:ring-2 focus:ring-ring` (o `focus:ring-primary`) |
| Un background global de página | `bg-background` |
| Texto base de un párrafo | `text-foreground` |

---

## Alpha modifiers — cómo lograr variantes

La sintaxis `token/NN` produce el color con opacidad `NN%`. Funciona con **cualquier** token semántico:

```tsx
<div className="bg-primary">           {/* Opacity 100% — amarillo sólido */}
<div className="bg-primary/90">        {/* Hover state — 90% */}
<div className="bg-primary/50">        {/* Medio translúcido */}
<div className="bg-primary/20">        {/* Chip/badge background */}
<div className="bg-primary/10">        {/* Banner / card subtle highlight */}
<div className="bg-primary/5">         {/* Barely-there — gradient stops */}
```

**Escala práctica** (cuando necesitás valores intermedios):

- `/5` — casi invisible, gradients, borders muy sutiles
- `/10` — backgrounds tipo "info banner"
- `/20` — chips, badges, active tabs
- `/30` — bordes destacados
- `/50` — estados disabled de colores primarios
- `/80` — hover de CTAs
- `/90` — hover más intenso, active state de CTAs

**Esto reemplaza la escala vieja de `primary-50..primary-950`** que ya no existe en el config. Los alpha modifiers son más flexibles (soportan cualquier porcentaje, no solo los 11 pasos fijos) y requieren solo un token para definir.

---

## Agregar un color nuevo

Supongamos que necesitamos un token `warning` (amarillo distinto al primary, para advertencias no-críticas):

### Paso 1 — definir la CSS var en `globals.css`

```css
:root {
  /* ... vars existentes ... */

  /* Alertas y estados */
  --warning:            251 191 36;   /* #FBBF24 — ámbar */
  --warning-foreground: 120 53 15;    /* #78350F — marrón oscuro */
}
```

> **Importante**: formato **RGB triple sin comas** (`251 191 36`, NO `rgb(251, 191, 36)` ni `#FBBF24`). Si ponés otra sintaxis, los alpha modifiers `/20` van a romper silenciosamente.

### Paso 2 — referenciarla en `tailwind.config.ts`

```ts
colors: {
  /* ... existentes ... */
  warning: {
    DEFAULT:    'rgb(var(--warning) / <alpha-value>)',
    foreground: 'rgb(var(--warning-foreground) / <alpha-value>)',
  },
},
```

### Paso 3 — usar

```tsx
<div className="bg-warning/20 text-warning border border-warning/30">
  Atención
</div>
```

Listo. Dos archivos, un token nuevo, alpha modifiers funcionando, y si mañana cambiamos a dark mode, basta con agregar el override en `@media (prefers-color-scheme: dark)` dentro del mismo `globals.css`.

---

## Reglas (qué hacer y qué no)

### Sí

- `text-primary`, `bg-accent`, `border-muted` — tokens semánticos.
- `bg-primary/10`, `text-foreground/50` — alpha modifiers.
- `text-gray-600`, `text-red-600` — SOLO para grises neutros y estados destructive donde el branding no aplica.
- Si necesitás un color que no existe como token, definilo primero (paso 1-3 arriba).

### No

- ❌ `text-blue-600`, `bg-blue-50`, `border-blue-500` — **nunca**. Son los colores del template original que estamos erradicando. Si lo necesitás, es un CTA → `text-primary`.
- ❌ `text-[#EFB810]`, `bg-[#F8F2E8]` — hex hardcoded. Rompe el sistema.
- ❌ `style={{ color: '#EFB810' }}` — inline styles con hex. Idem.
- ❌ `text-brand-primary` — el namespace `brand-*` fue eliminado en ADR-003.
- ❌ `bg-primary-600`, `text-primary-800` — la escala `primary-50..950` ya no existe. Usá alpha modifiers (`bg-primary/60`, `text-primary/80`).

---

## Dark mode (cableado pero no expuesto aún)

El sistema soporta dark mode **técnicamente**. El bloque en `globals.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: 26 22 16;
    --foreground: 245 240 232;
    /* ... */
  }
}
```

Ya funciona automáticamente — Tailwind lee las CSS vars y renderiza los colores correctos cuando el sistema operativo del usuario está en dark. **No hay toggle manual aún** y tampoco estamos testeando dark mode activamente, así que puede haber componentes que no se vean bien. El patrón canónico para agregar un toggle class-based es:

```ts
// tailwind.config.ts ya tiene
darkMode: ['class'],

// y se activaría así en un futuro:
<html class={theme === 'dark' ? 'dark' : ''}>
```

Con `.dark { ... }` en `globals.css` en vez del `@media`. Queda como TODO futuro.

---

## Tematización runtime (posible pero no usada)

Como los tokens son CSS vars, podés cambiarlos en runtime desde JS sin recompilar:

```ts
document.documentElement.style.setProperty('--primary', '239 68 68')  // rojo
```

Esto habilita features futuras como:

- **White-label**: cada cliente con su paleta
- **Temas por usuario**: el usuario elige su color primary en settings
- **A/B testing de branding**: probar variantes sin redeploy

No está implementado hoy, pero el sistema lo soporta sin cambios estructurales.

---

## Troubleshooting

### "Cambié `--primary` y no veo el cambio"

1. Hard reload del browser (Ctrl+Shift+R). Next.js dev server a veces cachea el CSS.
2. Si persiste: `npm run clean && npm run dev`.
3. Verificá que **no haya** un hex hardcoded en el componente (`text-[#EFB810]`) que está overrideando.

### "`bg-primary/20` se ve como `bg-primary` sólido, sin opacidad"

Pasa cuando la CSS var está en formato no-compatible con `<alpha-value>`. Chequeá `globals.css`:

```css
/* ❌ MAL — no funciona con alpha modifiers */
--primary: #EFB810;
--primary: rgb(239, 184, 16);
--primary: rgba(239, 184, 16, 1);

/* ✅ BIEN — RGB triple sin comas */
--primary: 239 184 16;
```

### "ESLint me acepta `text-blue-600` sin quejarse"

Hoy no hay enforcement automático. Si lo viste en un PR, rechazalo en review. ADR-003 menciona una futura regla ESLint como TODO.

### "¿Dónde estaba `brand-primary` antes?"

Eliminado en Fase 1 del 2026-04-11. Usá `primary` (el nombre canónico de shadcn). Ver ADR-003 para el contexto.

### "¿Dónde están `primary-50`, `primary-100`, ..., `primary-950`?"

Eliminados también. Usá alpha modifiers: `bg-primary/10` reemplaza `bg-primary-50`, `bg-primary/20` reemplaza `bg-primary-100`, etc. Ver tabla de escala práctica más arriba.

---

## Paleta actual (amarillo mostaza — `inmogrid`)

| Token | Valor | Visual |
|---|---|---|
| `primary` | `#EFB810` | Amarillo mostaza — brand principal |
| `primary-foreground` | `#000000` | Negro — texto sobre `primary` |
| `secondary` | `#FFCB2B` | Amarillo más brillante |
| `background` | `#F8F2E8` | Off-white cálido |
| `foreground` | `#424242` | Gris oscuro — texto base |
| `muted` | `#FFE5AD` | Beige claro |
| `muted-foreground` | `#737373` | Gris medio |
| `accent` | `#FFE5AD` | Igual a `muted` por ahora |
| `destructive` | `#EF4444` | Rojo estándar de Tailwind |
| `border`, `input` | `#FFE5AD` | Beige claro |
| `ring` | `#EFB810` | Mismo que `primary` |

Para cambiar cualquiera: editar el valor en `globals.css` (en formato RGB triple) y reiniciar el dev server.

---

## Referencias

- [ADR-003: Design tokens con sistema de dos capas](adr/ADR-003-design-tokens-two-layer-system.md)
- Archivos pivote:
  - [`src/app/globals.css`](../src/app/globals.css) — capa 1
  - [`tailwind.config.ts`](../tailwind.config.ts) — capa 2
- Documentación externa:
  - [shadcn/ui theming](https://ui.shadcn.com/docs/theming)
  - [Tailwind v3 `<alpha-value>` placeholder](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
