---
name: Veil Clubs
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d4c0d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9d8ba0'
  outline-variant: '#514255'
  surface-tint: '#ecb2ff'
  primary: '#ecb2ff'
  on-primary: '#520071'
  primary-container: '#bd00ff'
  on-primary-container: '#ffffff'
  inverse-primary: '#9900cf'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#777676'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#ecb2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#74009f'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-display:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.05em
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style
The design system is engineered to evoke a sense of high-stakes privacy and elite cryptographic access. It adopts a **Dark Tech-Minimalism** aesthetic, blending the sterile precision of developer tools with the luxury of a private members' club. 

The visual narrative is built on "The Invisible Hand"—where complexity is hidden behind a sleek, impenetrable interface. Key stylistic pillars include:
- **Glassmorphism & Depth:** Using semi-transparent surfaces to simulate layers of encrypted data.
- **Neon Precision:** High-chroma accents used sparingly to guide the eye toward critical financial actions.
- **Cryptographic Patterns:** Subtle noise textures and micro-grid overlays that reinforce the theme of secure, private computation.
- **Premium Utility:** A focus on high-density information presented with enough whitespace to feel exclusive rather than cluttered.

## Colors
The palette is rooted in **Void Black** and **Deep Charcoal** to provide a high-contrast foundation that feels infinite and secure. 

- **Primary (Electric Violet):** Reserved for high-intent actions, active states, and "Premium" status indicators.
- **Secondary (Pure White):** Transitioned from cyan to white to provide a starker, more sophisticated contrast. Used for secondary interactions, core data readability, and highlighting cryptographic hashes.
- **Surface Strategy:** Surfaces use subtle gradients of charcoal to differentiate between the background and interactive panels.
- **Accents:** A specialized "Data Green" is included specifically for positive yield values and successful transaction confirmations, maintaining the technical "terminal" feel.

## Typography
The typography strategy employs a dual-font system to balance human readability with machine-like precision.

- **Hanken Grotesk** handles the UI framework. It is modern, sharp, and highly legible, providing the "Premium" feel.
- **JetBrains Mono** is utilized for all "dynamic" content—wallet addresses, yields, percentages, and transaction hashes. This creates a psychological link between the user and the underlying cryptographic protocol.
- **Hierarchy:** Headlines should use tighter letter spacing for a more authoritative look, while monospaced labels should use generous tracking to improve scannability in high-density data views.

## Layout & Spacing
The layout follows a **Rigid Grid** philosophy, mirroring the structured nature of blockchain blocks. 

- **Grid Model:** A 12-column grid for desktop with 24px gutters. Elements should align strictly to the grid to maintain a "calculated" appearance.
- **Rhythm:** An 8px base unit drives all padding and margins, ensuring mathematical consistency throughout the interface.
- **Density:** High-density data tables should be balanced by significant outer margins (64px+) on desktop to create a sense of "exclusive space" and focus.
- **Responsive:** On mobile, transitions to a 4-column grid with reduced margins (16px). Cards and data tables reflow into vertical stacks, but monospaced data points maintain their horizontal alignment where possible.

## Elevation & Depth
In this design system, depth is not created with traditional shadows, but through **Luminance and Opacity**.

- **Tonal Layering:** The background is #080808 (Void Black). Primary containers use #1A1A1A (Deep Charcoal). Interactive elements lift visually through subtle luminance shifts.
- **Glassmorphism:** Use a `backdrop-filter: blur(12px)` with a `0.05` opacity white fill for overlays and modals. This creates a "frosted lens" effect over the dark background.
- **Glow Borders:** Rather than drop shadows, use `1px` solid borders with very low opacity (`0.08`). On hover or focus, these borders should transition to a subtle glow using a 2px spread of the Electric Violet color.
- **Micro-Noise:** Apply a subtle 2% grain overlay to the entire background to eliminate banding and add a tactile, "analog-tech" quality.

## Shapes
Shapes are **precise and architectural**. 

- **Soft Square:** A 4px (0.25rem) radius is the standard for cards, buttons, and inputs. This provides a hint of modern refinement without losing the technical "edge."
- **Interactive States:** Buttons may transition from a 4px radius to a slightly more rounded 8px on active states to provide tactile feedback, though the default should remain sharp.
- **Icons:** Use thin-stroke (1.5px) geometric icons. Avoid filled icons unless indicating an active toggle state.

## Components
- **Buttons:** Primary buttons are solid Charcoal with a 1px Electric Violet border and white text. On hover, the border glows. Secondary buttons are ghost-style with White text and a subtle low-opacity border.
- **Data Cards:** Use a semi-transparent background (`rgba(26, 26, 26, 0.8)`) with a `1px` border. Headers within cards should use the `label-caps` monospaced style.
- **Inputs:** Darker than the container background. Focus state triggers an Electric Violet glowing border and a monospaced cursor character.
- **Chips/Status:** Small, monospaced text badges. "Active" yield status should have a subtle pulsing "Data Green" dot.
- **Vault Lists:** High-density rows with `1px` dividers. Each row should have a subtle hover highlight that shifts the background color 2% lighter.
- **Cryptographic Patterns:** Use a repeating SVG "dot-grid" pattern in the background of primary dashboard sections to reinforce the technical theme.

## Non-Negotiable UI Rules
- Do not change the current dark tech-minimal identity, spacing system, typography, colors, or sharp rectangular component language.
- Do not change the hero globe style, color, wireframe material, animation behavior, mouse interaction, or right-side hero placement.
- New wallet, pool, club, deposit, draw, and dashboard features must reuse the existing Tailwind tokens and interaction patterns.
- Keep high-intent actions Electric Violet, secondary actions transparent with subtle borders, and all protocol data in JetBrains Mono.
- Avoid gradients, decorative orbs, large rounded cards, colorful DeFi-dashboard styling, or any visual direction that makes the interface feel less like a confidential capital terminal.
