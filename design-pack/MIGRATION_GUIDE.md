# EyeHear Design Pack Migration Guide

## Quick Start
1. Copy `css/theme.css` to your project and import after CSS reset
2. Merge `tokens/tailwind.theme.extend.json` into your `tailwind.config.js`
3. Import component styles from `css/globals.extract.css`
4. Copy Google Fonts link from `assets/fonts.manifest.json`

## Token Mapping
- All colors use HSL format with CSS variables
- Dark theme is default (`:root`), light uses `.light` class
- Semantic tokens: `--primary`, `--background`, `--foreground`, etc.

## Component Integration
Use `components/primitives.map.json` to match shadcn/ui component variants:
- Button variants: `default`, `outline`, `ghost`, `destructive`
- Custom classes: `.transcript-vibrant`, `.glass-card`, `.neon-border`

## Animations
All keyframes included in Tailwind config. Key animations:
- `animate-mic-pulse` - Recording indicators  
- `animate-text-glow` - Futuristic text effects
- `animate-card-hover` - 3D interactions

## Accessibility
- Reduced motion support included
- Focus rings use semantic tokens
- ARIA patterns documented in components map

## Conflicts
If you have existing CSS variables, merge carefully. Prefix with `--eh-` if needed.