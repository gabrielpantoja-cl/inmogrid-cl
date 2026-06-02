# inmogrid.cl

> **Ecosistema inmobiliario abierto y colaborativo para Chile.** Proyecto open source.

Plataforma de conocimiento inmobiliario abierto: perfiles profesionales, contenido, networking, agenda de eventos del sector y acceso a datos públicos de transacciones. **No vende propiedades. No intermedia transacciones. No tiene algoritmos de pago por posicionamiento.**

- **Sitio en producción:** https://inmogrid.cl
- **Manifiesto:** [docs/manifesto.md](docs/manifesto.md)
- **Visión y principios:** [docs/vision.md](docs/vision.md)
- **Arquitectura técnica:** [docs/architecture.md](docs/architecture.md)

---

## Stack

Next.js 15 · React 19 · TypeScript · Prisma · PostgreSQL · Tailwind CSS · Vercel.

Detalles completos en [docs/architecture.md](docs/architecture.md).

---

## Empezar a desarrollar

Requisitos: Node.js 20+, npm 10+, una instancia PostgreSQL (p. ej. Supabase).

```bash
git clone https://github.com/gabrielpantoja-cl/inmogrid.git
cd inmogrid.cl
npm install
cp .env.example .env.local    # completar valores
npm run prisma:generate
npm run dev                   # http://localhost:3000
```

Ver [docs/architecture.md](docs/architecture.md) para variables de entorno y estructura del repo.

### Comandos útiles

```bash
npm run dev            # Next.js con Turbopack
npm run lint           # ESLint
npm run test           # Jest
npm run test:e2e       # Playwright
npm run prisma:studio  # UI de Prisma
```

---

## Cómo contribuir

Las contribuciones son bienvenidas. Antes de abrir un PR:

1. Leé [`CONTRIBUTING.md`](CONTRIBUTING.md) y [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
2. Abrí un **issue** describiendo el cambio si es algo más que un typo o un fix chico.
3. Respetá la [estructura feature-first](docs/adr/ADR-001-feature-first-architecture.md) y los [patrones de código](docs/arquitectura/patrones.md).
4. Corré `npm run lint` y `npm run test` antes de hacer push.

---

## Licencia

[MIT](LICENSE) © contribuidores de `inmogrid.cl`.

Los datos publicados dentro de la plataforma mantienen sus propias condiciones de uso — ver https://inmogrid.cl/terms.
