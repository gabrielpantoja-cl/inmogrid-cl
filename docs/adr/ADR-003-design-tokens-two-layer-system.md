# ADR-003: Design tokens con sistema de dos capas

**Estado**: Aceptado
**Fecha**: 2026-04-11
**Decisores**: equipo de inmogrid.cl
**Contexto de ejecución**: Rebranding completo azul → amarillo y saneamiento del color system

---

## Contexto

Hasta 2026-04-11 el color system de inmogrid.cl tenía tres problemas entrelazados:

1. **Duplicación entre `globals.css` y `tailwind.config.ts`**. Los valores de marca estaban definidos literalmente en ambos archivos. Cambiar `--primary` en uno y olvidar el otro los desincronizaba sin romper el build → bug silencioso.

2. **Tailwind ignoraba las CSS custom properties**. `tailwind.config.ts` tenía `primary: '#EFB810'` hardcodeado, no `var(--primary)`. Consecuencias:
   - El bloque `@media (prefers-color-scheme: dark)` en `globals.css` estaba **cableado a nada** — Tailwind seguía emitiendo los hex del config, no respetaba el override de las vars.
   - **Alpha modifiers no funcionaban**: `bg-primary/20` no generaba el color translúcido que Tailwind permite con sintaxis `rgb(... / <alpha-value>)` porque el config tenía un hex puro.

3. **Los componentes ignoraban el sistema semántico y usaban clases Tailwind raw** como `text-blue-600`, `bg-blue-50`, `border-blue-500`, etc. — deuda heredada del template original. Coexistían en el mismo repo:
   - Componentes con clases semánticas correctas (`text-primary`, `bg-accent`)
   - Componentes con clases raw (`text-blue-600`) que ignoraban completamente el branding
   - Una tercera capa de alias `brand-primary`, `brand-secondary`, `brand-accent`, `brand-text`, `brand-black` que duplicaban los semantic tokens con otro namespace

El resultado era que hacer rebranding implicaba tocar >20 archivos y rezar para no romper nada, y agregar dark mode era funcionalmente imposible sin reescribir el config.

## Decisión

Adoptar el patrón **two-layer design tokens** estándar de shadcn/ui, con `globals.css` como única fuente de verdad y `tailwind.config.ts` como capa de referencia.

### Capa 1 — CSS custom properties (`src/app/globals.css`)

Todos los valores de marca viven como CSS vars en formato **RGB triple sin comas** (ej. `239 184 16` para `#EFB810`). Este formato es obligatorio porque Tailwind necesita inyectar `<alpha-value>` para que los alpha modifiers funcionen:

```css
:root {
  --primary:            239 184 16;    /* #EFB810 */
  --primary-foreground: 0 0 0;
  --background:         248 242 232;
  --foreground:         66 66 66;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 26 22 16;
    /* ... */
  }
}
```

### Capa 2 — Tailwind config (`tailwind.config.ts`)

Tailwind **solo referencia** las CSS vars, no redefine valores. Patrón:

```ts
colors: {
  primary: {
    DEFAULT:    'rgb(var(--primary) / <alpha-value>)',
    foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
  },
  background: 'rgb(var(--background) / <alpha-value>)',
  /* ... */
}
```

### Tokens semánticos canónicos

Adoptamos los 12 tokens estándar de shadcn/ui como única fuente de nombres:

| Token | Uso |
|---|---|
| `primary` / `primary-foreground` | CTAs, brand accents, focus rings |
| `secondary` / `secondary-foreground` | Acciones secundarias |
| `background` / `foreground` | Canvas y texto base |
| `card` / `card-foreground` | Superficies elevadas |
| `popover` / `popover-foreground` | Dropdowns, tooltips |
| `muted` / `muted-foreground` | Fondos y texto desaturados |
| `accent` / `accent-foreground` | Highlights suaves, chat bubbles propias |
| `destructive` / `destructive-foreground` | Errores, delete buttons |
| `border`, `input`, `ring` | Tokens estructurales de UI |

### Eliminación del namespace `brand-*`

Los alias `brand-primary`, `brand-secondary`, `brand-accent`, `brand-background-light`, `brand-text`, `brand-black` se eliminaron. Eran redundantes con los semantic tokens. Los 2 únicos usos residuales (ambos en `Footer.tsx`) se migraron como parte de la misma fase.

### Eliminación de la escala `primary-50..950`

La escala hardcodeada `primary: { 50: '#fffbeb', ..., 950: '#452f04' }` se eliminó porque (a) ningún componente la usaba (verificado con grep) y (b) el mismo efecto se obtiene con alpha modifiers: `bg-primary/10`, `bg-primary/20`, `bg-primary/50`, etc. Un solo token con modificadores reemplaza 11 tokens fijos.

### Reemplazo masivo de clases Tailwind raw

Todas las ocurrencias de `(text|bg|border|ring|hover:text|hover:bg|focus:ring|focus-visible:ring|group-hover:*|peer-checked:*)-(blue|indigo|sky|cyan)-*` se reemplazaron por los tokens semánticos. Mapeo aplicado:

| Clase raw | Reemplazo |
|---|---|
| `text-blue-{500,600,700}` | `text-primary` |
| `hover:text-blue-*` | `hover:text-primary` o `hover:text-primary/80` |
| `bg-blue-50` | `bg-primary/10` |
| `bg-blue-100` | `bg-primary/20` |
| `bg-blue-{500,600}` | `bg-primary` |
| `bg-blue-700` | `bg-primary/90` (hover) |
| `border-blue-{200,300}` | `border-primary/30` a `border-primary/50` |
| `border-blue-500` | `border-primary` |
| `ring-blue-500`, `focus:ring-blue-500` | `ring-primary`, `focus:ring-primary` |
| `from-blue-50 to-blue-100` (gradients) | `from-primary/5 to-primary/10` |
| `peer-checked:bg-blue-600` | `peer-checked:bg-primary` |

Total: **23 archivos** tocados, ~60 clases reemplazadas.

## Consecuencias

### Positivas

- **Una sola fuente de verdad**. Cambiar `--primary` en `globals.css` propaga a todo el repo automáticamente.
- **Alpha modifiers funcionales**. `bg-primary/20`, `text-foreground/50`, `border-accent/30` compilan y emiten el color translúcido correcto.
- **Dark mode cableado**. El bloque `@media (prefers-color-scheme: dark)` ya funciona. Agregar `.dark` class-based es trivial (el config ya tiene `darkMode: ['class']`).
- **Tematización runtime**. `document.documentElement.style.setProperty('--primary', '239 68 68')` cambia el color sin recompilar. Habilita features futuros como white-label o temas personalizados por usuario.
- **Sin deuda de namespaces duplicados**. `brand-*` eliminado. `primary-50..950` eliminado. Los 12 tokens shadcn son la única API oficial.
- **Alineado con shadcn/ui**. Si se agregan más componentes de shadcn, funcionan plug-and-play.
- **Cambiar la paleta es 1 archivo, no 20**. Reemplazar el amarillo por azul hoy sería editar las 17 vars de `globals.css` y listo.

### Negativas

- **Costo de conversión inicial**. Hubo que reemplazar ~60 clases manualmente en 23 archivos. Para repos grandes sin este sistema, el costo es mayor.
- **Sintaxis de RGB triples es menos legible** que hex. `239 184 16` requiere mirar el comentario para saber que es `#EFB810`. Mitigación: comentarios inline al lado de cada var.
- **Los alpha modifiers requieren el formato RGB-triple exacto**. Si alguien agrega una var con sintaxis `rgb(239, 184, 16)` o `#EFB810`, los modifiers `/20` van a romper silenciosamente (no habrá error, solo no aplicarán opacity). Mitigación: comentario de advertencia en `globals.css` + lint rule futura.
- **Enforcement manual**. Nada impide que un desarrollador nuevo escriba `text-blue-600` otra vez. Mitigación: regla ESLint custom o Stylelint que prohíba las clases raw (ver **Enforcement pendiente** abajo).

## Alternativas consideradas

### 1. Mantener el status quo con `brand-*` + `primary`

- **Rechazada**. Duplicación permanente, alpha modifiers rotos, dark mode imposible.

### 2. Usar solo CSS vars sin capa de Tailwind (hardcodear `style={{ color: 'var(--primary)' }}`)

- **Rechazada**. Pierde todo el valor de Tailwind (auto-completar, purge, responsive modifiers). Tampoco permite `hover:bg-primary/10` sin CSS custom.

### 3. Generar los tokens con un script (Style Dictionary, design-tokens CLI)

- **Rechazada por ahora**. Overhead de tooling para un set de 17 tokens. Reevaluar cuando el sistema tenga ≥50 tokens o se necesite generar outputs para múltiples plataformas (iOS/Android/Figma).

### 4. Usar HSL en vez de RGB triples

- **Considerada**. HSL es lo que shadcn oficial usa por default. Elegimos RGB porque nuestra paleta ya estaba en hex y la conversión RGB es más directa (`#EFB810` → `239 184 16`) vs. HSL (`#EFB810` → `45 88% 50%`). Ambos soportan `<alpha-value>`, la diferencia es cosmética. Un refactor futuro a HSL es trivial (solo cambiar los valores en `globals.css`).

## Enforcement pendiente

Hoy nada impide introducir regresiones del tipo `text-blue-600`. Opciones a futuro:

1. **ESLint regla custom** que parsee los className strings y falle si encuentra `(blue|indigo|sky|cyan|red|green|yellow|purple|pink|orange|gray|slate|zinc|neutral|stone|emerald|teal|violet|fuchsia|rose|amber|lime)-\d{2,3}` fuera de una allowlist.
2. **Stylelint** con `tailwindcss/no-custom-classname`.
3. **Revisión manual en PR** — bajo coste pero frágil.

La opción 1 es la correcta. Queda como TODO para después de estabilizar el refactor de Sprint 4.

## Relacionados

- Guía operativa del design system: [`docs/design-system.md`](../design-system.md)
- [ADR-001 — Feature-first architecture](ADR-001-feature-first-architecture.md)
- Archivos pivote:
  - `src/app/globals.css` — capa 1 (CSS vars)
  - `tailwind.config.ts` — capa 2 (referencias)
