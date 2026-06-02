# Contribuir a `inmogrid.cl`

Gracias por tu interés en contribuir. Este proyecto es open source y todas las contribuciones — código, documentación, diseño, feedback — son bienvenidas.

---

## Antes de empezar

1. Leé el [manifiesto](docs/manifesto.md) y la [visión](docs/vision.md). Lo que construimos tiene una identidad clara: **no vendemos propiedades, no intermediamos transacciones, no cobramos por posicionamiento**. Las contribuciones deben respetar esa identidad.
2. Revisá los [issues abiertos](https://github.com/gabrielpantoja-cl/inmogrid/issues). Si vas a trabajar en algo, comentá en el issue correspondiente o abrí uno nuevo para discutir el enfoque antes de mandar código.
3. Leé el [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

## Tipos de contribución

| Tipo | Ejemplos |
|---|---|
| **Código** | Features, fixes, refactors, tests |
| **Documentación** | Aclaraciones, ejemplos, correcciones |
| **Diseño** | UX, accesibilidad, tokens visuales, iconografía |
| **Datos** | Mejoras al modelo de `Event`, `ProfessionalProfile`, referenciales |
| **Reportes** | Issues describiendo bugs o casos de uso no cubiertos |

No hace falta saber programar para aportar. Un buen issue reportando un problema concreto vale tanto como un PR.

---

## Flujo de trabajo

### 1. Fork y clone

```bash
git clone https://github.com/TU_USUARIO/inmogrid.cl.git
cd inmogrid.cl
npm install
```

Configurá tus variables de entorno copiando `.env.example` a `.env.local` — ver instrucciones en el [README](README.md#variables-de-entorno).

### 2. Branch

```bash
git checkout -b feat/nombre-descriptivo
# o: fix/..., docs/..., refactor/..., test/...
```

### 3. Desarrollá

Antes de commitear:

```bash
npm run lint        # ESLint
npm run test        # Jest
npm run build       # Verificá que el build pasa
```

### 4. Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/):

```
feat: agrega filtro por región en /eventos
fix: corrige validación de ROL en formulario de post
docs: clarifica el flujo de autenticación Supabase
refactor: extrae hook useEventFilters
test: agrega casos borde a validación de username
```

### 5. Pull Request

- Título claro y descriptivo
- En la descripción: **qué** cambia, **por qué** y **cómo probarlo**
- Enlazá issues relacionados (`Fixes #123`)
- Si el cambio afecta UI, incluí screenshots o GIFs
- Si el cambio afecta el schema, documentá la migración SQL en el PR

---

## Estándares de código

### Lenguaje y tipos

- **TypeScript strict.** Sin `any` implícitos.
- Validación de input con **Zod** (API routes, forms).
- Forms con **React Hook Form + Zod**.

### Estructura

El proyecto usa una arquitectura **feature-first**: el código de dominio vive bajo `src/features/<feature>/`. Leé:

- [docs/adr/ADR-001-feature-first-architecture.md](docs/adr/ADR-001-feature-first-architecture.md)
- [docs/arquitectura/patrones.md](docs/arquitectura/patrones.md)

Si vas a agregar una feature nueva, seguí el mismo layout que las features existentes (`chat`, `posts`, `networking`, `profiles`, `referenciales`).

### Estilos

- **Tailwind CSS** + **shadcn/ui** (primitivos Radix).
- Usá los tokens de marca definidos en `tailwind.config.ts` (`brand-primary: #EFB810`, `brand-text`, etc.) — **no uses clases de color arbitrarias que rompan la paleta** (por ejemplo, `text-blue-700` fuera de contexto).

### Import alias

Todo import interno usa `@/` → `src/`:

```ts
import { getUser } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
```

### Migraciones de schema

**No usamos `prisma migrate`** (ver [docs/architecture.md](docs/architecture.md#modelo-de-datos)). El flujo es:

1. Editar `prisma/schema.prisma`
2. `npm run prisma:generate`
3. Generar el SQL equivalente y documentarlo en el PR — se aplica manualmente en Supabase

---

## Seguridad y privacidad

Este proyecto maneja datos de profesionales y (potencialmente) de ciudadanos chilenos. Reglas duras:

- **Nunca** comitees `.env*`, credenciales, tokens o claves API.
- **Nunca** incluyas datos personales reales en fixtures, tests o documentación.
- Datos sensibles bajo la **Ley 19.628** (RUT, teléfonos, direcciones privadas) no se almacenan si no son estrictamente necesarios.
- Si encontrás una vulnerabilidad, **no abras un issue público**. Reportala siguiendo el proceso descrito en `SECURITY.md` (si existe) o escribí a [hola@inmogrid.cl](mailto:hola@inmogrid.cl).

---

## Dudas

- **Preguntas técnicas:** abrí un issue con la etiqueta `question`.
- **Propuestas de diseño:** abrí un issue con la etiqueta `discussion`.
- **Reportes de bug:** abrí un issue con la etiqueta `bug` e incluí pasos para reproducir.

---

*Construir una madriguera lleva tiempo. Gracias por sumar.*
