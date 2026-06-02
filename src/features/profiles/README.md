# Feature: `profiles`

Edición del perfil profesional del usuario autenticado. Renderiza el formulario de `/perfil` y maneja la actualización contra `/api/users/profile`.

## Descomposición de `ProfileEditForm` (era 471 líneas)

El componente original se partió en piezas <200L cada una:

```
features/profiles/
├── components/
│   ├── ProfileEditForm.tsx            #  75L — orquestador
│   ├── FormSection.tsx                # 138L — FormSection + TextField/TextArea/SelectField
│   └── sections/
│       ├── BasicInfoSection.tsx       #  49L
│       ├── ProfessionalSection.tsx    #  84L (profesión + contacto + región/comuna)
│       └── SocialPrivacySection.tsx   #  66L (redes + privacidad)
├── hooks/
│   └── useProfileForm.ts              #  97L — state, diff-submit, router.refresh
├── lib/
│   └── constants.ts                   # PROFESSION_OPTIONS, REGIONES
├── types/
│   └── index.ts                       # ProfileUser, ProfileFormData
└── index.ts
```

Ningún archivo supera el límite de 200L del CLAUDE.md (el más grande es `FormSection.tsx` con 138L y es el repositorio de primitives reutilizables del feature).

## API pública

```ts
import {
  ProfileEditForm,
  useProfileForm,
  PROFESSION_OPTIONS,
  REGIONES,
  type ProfileUser,
  type ProfileFormData,
} from '@/features/profiles';
```

## Comportamiento destacado

- **Diff-submit**: `useProfileForm` solo envía los campos que cambiaron respecto al `user` original. Evita sobreescribir datos accidentalmente.
- **Strings vacíos → null**: al enviar, un campo vacío se serializa como `null` (coherente con el schema de Prisma).
- **Sin cambios**: si el usuario submitea sin modificar nada, muestra feedback verde y no hace request.

## Dependencias permitidas

- Internas: ninguna (aún). El hook hace `fetch('/api/users/profile')` directo — en el futuro podría extraerse a `features/profiles/lib/api.ts` cuando haya más clientes.
- Externas: `react`, `next/navigation`, `@prisma/client` (solo types)

## Consumido por

- `src/app/(public)/perfil/page.tsx`

## Pendiente

- Validación Zod en el cliente antes de enviar (hoy solo valida el server)
- Extraer `fetch('/api/users/profile')` a `features/profiles/lib/api.ts`
- Mover `REGIONES` a `@/shared/constants/regions.ts` cuando otros features lo necesiten
- `ProfessionType` viene del enum de Prisma pero los valores en `PROFESSION_OPTIONS` NO coinciden 1:1 con el enum (ej. `CORREDOR` vs `CORREDOR_PROPIEDADES`). Revisar y sincronizar.
