# SIAS ERP

Sistema ERP modular para panadería. Construido con Vue 3 + Vite + Supabase.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite |
| Routing | Vue Router (hash history) |
| State | Pinia + TanStack Query |
| UI | PrimeVue 4 + Tailwind CSS + PrimeIcons |
| Forms | Vee-Validate + Zod |
| Backend | Supabase (PostgreSQL + RLS) |
| Deploy | GitHub Pages (via GitHub Actions) |

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Automático: al pushear a `main`, GitHub Actions buildear y deploya a GitHub Pages.

## Estructura

```
src/
├── core/               # Núcleo global
│   ├── auth/           # Autenticación Supabase
│   ├── components/     # UI global
│   ├── composables/    # Lógica compartida
│   ├── router/         # Router base + guards
│   └── store/          # Pinia global
├── modules/            # Módulos de negocio
│   └── panaderia/      # Módulo de panadería
│       ├── components/
│       ├── composables/
│       ├── views/
│       └── router.js
└── styles/
```
