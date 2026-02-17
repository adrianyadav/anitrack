# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start development server (Next.js on localhost:3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config with Next.js core-web-vitals + TypeScript rules)

## Tech Stack

- **Framework:** Next.js 16 with App Router (React 19, TypeScript, RSC enabled)
- **Styling:** Tailwind CSS v4 with `tw-animate-css`, CSS variables for theming (oklch colors), dark mode via `.dark` class
- **UI Components:** shadcn/ui (new-york style, lucide icons) — add components with `npx shadcn add <component>`
- **Utilities:** `cn()` helper in `lib/utils.ts` (clsx + tailwind-merge) for conditional class merging

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `components/ui/` — shadcn/ui components
- `components/` — Custom application components
- `lib/` — Shared utilities
- `hooks/` — Custom React hooks

## Path Aliases

`@/*` maps to the project root (configured in tsconfig.json). Use `@/components`, `@/lib`, `@/hooks` etc.
