# AGENTS.md

## Developer Commands

- `npm run dev` - Start Astro dev server (apps/web)
- `npm run build` - Build for production
- `npm run check` - Type-check all packages
- `npm run check -w packages/sonner-astro` - Check single package

## Architecture

- **Monorepo**: Workspaces in `apps/*` and `packages/*`
- **Library**: `packages/sonner-astro` exports `./Toaster.astro` and `./styles.css`
- **Demo**: `apps/web` - Astro site consuming `sonner-astro`

## Skills

- `.agents/skills/emil-design-eng/SKILL.md` - UI polish guidelines (load with skill tool)
- `.agents/skills/make-interfaces-feel-better/SKILL.md` - Design engineering principles
