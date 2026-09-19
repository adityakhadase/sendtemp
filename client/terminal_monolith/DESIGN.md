---
name: Terminal Monolith
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c4c7c9'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#8e9193'
  outline-variant: '#444749'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3132'
  primary-container: '#e2e2e3'
  on-primary-container: '#636466'
  inverse-primary: '#5d5e60'
  secondary: '#c6c5cf'
  on-secondary: '#2f3038'
  secondary-container: '#4a4b53'
  on-secondary-container: '#bcbbc5'
  tertiary: '#ffffff'
  on-tertiary: '#303033'
  tertiary-container: '#e4e1e5'
  on-tertiary-container: '#656467'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e3'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1d'
  on-primary-fixed-variant: '#454748'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#e4e1e5'
  tertiary-fixed-dim: '#c8c6c9'
  on-tertiary-fixed: '#1b1b1e'
  on-tertiary-fixed-variant: '#47464a'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.04em
  headline-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a pure, terminal-grade developer environment designed for frictionless ephemeral sharing. Its identity balances industrial rigor, mechanical clarity, and modern minimalism inspired by premier developer workflows like Linear, Raycast, and Vercel CLI.

The emotional tone is quiet competence: focused, high-performance, and deliberately stripped of decorative excess. Visual communication prioritizes dense information architecture, precise tabular alignment, and raw functional efficiency. Interfaces must feel like an immediate extension of the engineer’s shell—unencumbered by extraneous chrome, heavy gradient washes, or ornamental distractions.

## Colors

The system relies entirely on an uncompromising, high-contrast monochrome and cold zinc palette. Color is never decorative; it functions purely as an operational signal.

- **Primary (`#f4f4f5`)**: Zinc 100. High-luminance foreground text, primary commands, focus highlights, and active terminal flags.
- **Secondary (`#71717a`)**: Zinc 500. Subdued metadata, inactive tab indicators, timestamps, and muted parameters.
- **Tertiary (`#27272a`)**: Zinc 800. Component fills, interactive hover backdrops, code block backgrounds, and divider frames.
- **Neutral (`#09090b`)**: Zinc 950 / True Dark. Canvas base, root console background, and low-contrast surface foundations.

### Accent & Utility Borders
- Subtle light borders in dark mode utilize `#27272a` (borders default) and `#3f3f46` (active/focus borders).
- For rare high-visibility elements or light accents, slate tones `#cbd5e1` and `#e2e8f0` are deployed strictly as hairline bounds or active cursor carets.
- Destructive and success events use austere, de-saturated monochrome indicators (strikethroughs, filled bullet states) or minimal muted indicators, avoiding loud saturation.

## Typography

The typographical engine marries the structured rhythm of JetBrains Mono with the legibility of Geist.

- **JetBrains Mono** governs all headlines, labels, keyboard shortcuts, timestamps, tokens, file sizes, and command lines. Numbers must always render with tabular figures (`tnum`) to ensure strict vertical columns across data payloads.
- **Geist** manages long-form body text, instructional summaries, and descriptions to ensure rapid scanning without visual exhaustion.
- Case convention: Micro-labels, badge keys, and command descriptors prioritize lowercase or strict snake_case conventions (`--expire-after`, `payload_size`, `status: active`) to reinforce the CLI ethos.

## Layout & Spacing

Layout operates on a rigid 4px base rhythm designed for compact density and strict horizontal/vertical alignment.

- **Canvas Architecture**: A 12-column desktop grid with a maximum content container of 1200px. For dedicated terminal dashboards and payload inspection views, layouts transition into full-bleed modular panes separated by 1px hairline borders.
- **Mobile Adaptation**: Under 768px, layout collapses into a single-column command stream. Section margins compress to `1rem`, and command trays anchor to the bottom viewport edge for thumb ergonomics.
- **Alignment Rules**: Data points, keys, and values must maintain hard vertical rules. Never float tabular data loosely; anchor them with hairline guides (`#18181b` / `#27272a`).

## Elevation & Depth

This design system deliberately excludes blurs, heavy dropshadows, and diffused ambient glows. Depth is articulated through **tonal layering** and **hairline edge definition**:

1. **Base Layer (L0)**: `#09090b` (Deep Canvas).
2. **Elevated Panels (L1)**: `#121215` framed by 1px solid `#27272a`.
3. **Interactive Overlays & Popovers (L2)**: `#18181b` bound by 1px solid `#3f3f46`.
4. **Active/Focus Highlight**: Pure `#f4f4f5` or high-contrast zinc outline (`1px solid #f4f4f5`) with zero shadow offset.

Elevated windows (such as drop zones, modal drawers, and command palettes) utilize sharp, precise 1px inset highlights (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`) instead of exterior drop shadows.

## Shapes

The geometric framework is sharp, restrained, and utilitarian.

- Standard UI containers, cards, and input fields utilize a subtle `0.25rem` (`roundedness: 1`) corner radius, softening the edge without diluting the mechanical, boxy developer tool aesthetic.
- Terminal output blocks, code snippets, and inline tags adhere strictly to matching sub-radii (2px–4px).
- Circular elements are strictly prohibited outside of terminal window control dots or user avatars. Action buttons, pills, and status tags remain rectangular with micro-filleted corners.

## Components

### Buttons
- **Primary**: Background `#f4f4f5`, text `#09090b`, font `JetBrains Mono` 12px / medium. Hover states invert slightly via opacity transition (opacity: 0.9). Sharp feedback on `:active`.
- **Secondary / CLI Ghost**: Background `#18181b`, border `1px solid #27272a`, text `#f4f4f5`. Hover triggers border transition to `#3f3f46` and background to `#27272a`.
- **Destructive**: Hairline border `#71717a` with text `#f4f4f5`. Active confirmation reveals high-contrast text inverted on solid border.

### Inputs & Command Fields
- Background `#09090b`, border `1px solid #27272a`, text `JetBrains Mono` 13px.
- Focus state eliminates standard browser glows, applying an immediate `1px solid #f4f4f5` frame.
- Inline prefix displays command prompt indicators (`$ `, `> `) in `#71717a`.

### Cards & Payload Containers
- Surface background `#121215` with an outer border `1px solid #27272a`.
- Headers feature integrated micro-toolbars with explicit metadata flags (`TTL: 10m`, `AES-256-GCM`, `SIZE: 42.1KB`) separated by internal 1px hairbars.

### Tags & Chips
- Monospaced, uppercase, or dot-syntax tags (`status.expired`, `mode.ephemeral`).
- Padding: 2px 6px, font size 10px, background `#18181b`, border `1px solid #27272a`, text `#a1a1aa`.

### Checkboxes & Toggles
- Custom square checkboxes: 14px × 14px, 2px radius, border `1px solid #3f3f46`, surface `#09090b`.
- Checked state uses an inverted full `#f4f4f5` block or a single horizontal monospaced hyphen/cross.

### Data Tables & Transfer Logs
- Row items separated by continuous 1px `#18181b` rules.
- Alternating hover states trigger subtle surface shift to `#141417`. Monospaced tabular alignment throughout.