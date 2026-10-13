---
name: Editorial Crimson Travel & Fleet
colors:
  surface: '#fff8f5'
  surface-dim: '#e0d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ee'
  surface-container: '#f4ece8'
  surface-container-high: '#eee7e3'
  surface-container-highest: '#e9e1dd'
  on-surface: '#1e1b19'
  on-surface-variant: '#5b403c'
  inverse-surface: '#33302d'
  inverse-on-surface: '#f7efeb'
  outline: '#8f706b'
  outline-variant: '#e4beb8'
  surface-tint: '#b82014'
  primary: '#6e0000'
  on-primary: '#ffffff'
  primary-container: '#990000'
  on-primary-container: '#ffa092'
  inverse-primary: '#ffb4a8'
  secondary: '#73584e'
  on-secondary: '#ffffff'
  secondary-container: '#fcd8ca'
  on-secondary-container: '#785d52'
  tertiary: '#433011'
  on-tertiary: '#ffffff'
  tertiary-container: '#5b4626'
  on-tertiary-container: '#d2b58c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930000'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#e2bfb2'
  on-secondary-fixed: '#2a170f'
  on-secondary-fixed-variant: '#5a4137'
  tertiary-fixed: '#fedeb2'
  tertiary-fixed-dim: '#e0c298'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#584323'
  background: '#fff8f5'
  on-background: '#1e1b19'
  surface-variant: '#e9e1dd'
  # Derived / added tokens (not part of the upstream Material scheme).
  # accent-line reuses on-tertiary-container; available-* is a semantic
  # success pair used for vehicle/service availability pills.
  accent-line: '#d2b58c'
  available-bg: '#edf4ee'
  available-text: '#235c2b'
  hairline: '1px solid rgba(30, 27, 25, 0.06)'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 4rem
  margin-tablet: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 3rem
---

## Brand & Style

This design system reimagines premium automotive mobility and tailored journeys through an editorial luxury lens inspired by high-end modern travel publications. It elevates vehicle hire and intercity private travel from utilitarian booking into an aspirational, boutique hospitality experience.

### Brand Personality & Emotional Atmosphere
- **Curated & Discerning:** Evoking the stillness, precision, and confidence of a modern luxury magazine.
- **Warm Hospitality:** Grounded in unhurried elegance, replacing chaotic booking interfaces with serene breathing room, architectural rhythm, and warm tactile surfaces.
- **Authoritative & Trustworthy:** Combining heritage reliability with sharp, contemporary digital craftsmanship.

### Aesthetic Movement & Philosophy
The aesthetic combines **Editorial Minimalism** with **Warm Bespoke Luxury**. It pairs generous negative space and cinematic photography framing with the brand's signature crimson signature. Crisp, high-contrast serif headlines evoke travel literature, while geometric sans-serif UI elements provide effortless utility and clarity across fleet specs and booking schedules.

## Colors

The palette balances the signature deep crimson red with warm, organic neutrals inspired by linen, travertine, and polished leather. The deep red serves as an authoritative anchor rather than an overwhelming wash, appearing strictly on high-intent actions, key typographic moments, badges, and active states.

> **Normative source of truth:** the `colors:` YAML frontmatter above. The values below are commentary on those roles and must not be used as independent color definitions. Where prose and frontmatter disagree, the frontmatter wins.

### Core Roles
- **Primary (`#6E0000`):** The signature Cakra crimson. Reserved for text and icon accents on light surfaces, active focus rings, and hover/pressed states.
- **Primary Container (`#990000`):** The only permitted crimson **fill**. Use for high-value interactive calls to action, selected vehicle tags, and status bands. This is the workhorse role for the brand red — `primary` is its darker counterpart, not a second fill.
- **On Primary (`#FFFFFF`):** Text and icons placed on either crimson role.
- **Secondary (`#73584E`):** Warm mocha taupe. Provides rich, warm contrast for deep footer fields, luxury tier dividers, and secondary button borders without the cold harshness of pure black.
- **Tertiary (`#433011`):** Deep sepia. Reserved for tertiary surfaces and luxury tier indicators.
- **Tertiary Fixed (`#FEDEB2`):** Warm sand gold. Used for delicate timeline rules, VIP accents, and luxury tier dividers.
- **Accent Line (`#D2B58C`):** Muted gold hairline for premium dividers, rules, and understated emphasis.
- **On Surface (`#1E1B19`):** Obsidian stone. Provides crisp editorial contrast for typography and primary data labels.
- **On Surface Variant (`#5B403C`):** Warm brown-grey for secondary copy, labels, and helper text.
- **Outline (`#8F706B`):** Field and control borders, disabled text, and low-emphasis rules.

### Canvas & Surface System
- **Background Root (`#FFF8F5`):** Warm alabaster cream, avoiding the clinical glare of `#FFFFFF`.
- **Surface Elevation 0 (`#FFFFFF`):** `surface-container-lowest`, pure crisp white for photography cards, fleet specs, and itinerary modules.
- **Surface Elevation 1 (`#FAF2EE`):** `surface-container-low`, soft oat neutral for input fields, filter bars, and comparison tables.
- **Surface Elevation 2 (`#F4ECE8`):** `surface-container`, for secondary panels and insets.
- **Surface Elevation 3 (`#EEE7E3` / `#E9E1DD`):** `surface-container-high` and `surface-container-highest`, for insets and hairline fills.
- **Surface Border (`hairline`):** `1px solid rgba(30, 27, 25, 0.06)` defining structure with quiet elegance.

## Typography

The typographic pairing reflects high-end travel journalism and modern concierge services:
- **Headlines (Playfair Display):** Selected for its graceful transitional contrast, sculpted serifs, and editorial warmth. It sets a slow, luxurious tempo for hero headers, destination guides, and fleet names.
- **Body & Controls (Plus Jakarta Sans):** Selected for its pristine geometric legibility, balanced proportions, and welcoming modern tone. It keeps dense vehicular specifications (transmission, luggage, capacity, rates) clean, crisp, and effortless to digest.

### Editorial Typographic Details
- **Uppercase Tracking:** All metadata badges, category indicators, and form field headers use `label-sm` or `label-md` with `text-transform: uppercase` and expanded letter spacing (`+0.06em` to `+0.08em`) to achieve a refined travel dispatch aesthetic.
- **Italic Emphasis:** Key descriptive adjectives in editorial narratives (e.g., *“Seamless journeys across Java”*) leverage the italic weights of Playfair Display to reinforce literary quality.

## Layout & Spacing

The layout philosophy mirrors the compositional pacing of a high-end coffee-table book: expansive margins, purposeful whitespace, and precise vertical alignment.

### Grid Architecture
- **Desktop (1024px+):** 12-column responsive grid with an expansive outer margin of `4rem` and `1.5rem` gutters. Content containers are capped at a maximum width of `1360px` to maintain optimal viewing lines.
- **Tablet (768px - 1023px):** 8-column grid with `2rem` margins and `1.25rem` gutters. Fleet filters transform into a sticky horizontal scroll rail.
- **Mobile (< 767px):** 4-column grid with `1.25rem` margins and `1rem` gutters. Multi-column fleet cards collapse into unified single-column vertical cards.

### Spacing Rhythm
- **Macro Spacing:** Section separations utilize generous vertical padding (`5rem` to `7rem` on desktop) to allow vehicles and itineraries to breathe without visual competition.
- **Micro Spacing:** Element gaps inside cards and input rows remain compact and systematic using `space-xs` (4px), `space-sm` (8px), and `space-md` (16px) to maintain functional cohesion.

## Elevation & Depth

Visual hierarchy rejects exaggerated drop shadows and heavy gloss in favor of subtle tactile depth, low-contrast outlines, and delicate warm-toned ambient diffusion.

### Elevation Strategy
- **Base Level (Canvas):** Flat warm alabaster tone (`#FFF8F5`) grounding all primary sections.
- **Level 1 (Card & Modular Surfaces):** Pure white fill (`#FFFFFF`) with a whisper-light perimeter line: `1px solid rgba(30, 27, 25, 0.06)`. Accompanied by an ultra-soft warm ambient shadow: `0 8px 30px -4px rgba(91, 64, 60, 0.04)`.
- **Level 2 (Hover & Interactive Focus):** Smooth lift transitioning into `0 16px 40px -6px rgba(153, 0, 0, 0.08)`, gently tinting the ambient shadow with the signature crimson to give the card an aura of responsive luxury.
- **Floating Modals & Date Pickers:** Glass-frosted backdrop (`backdrop-filter: blur(12px)`) bound by an oat-colored floating surface (`#FFFFFF` at 96% opacity) with a structured silhouette: `0 24px 48px -12px rgba(43, 24, 16, 0.12)`.

## Shapes

The geometric character balances architectural precision with approachable hospitality. 

### Corner Radius System
- **Cards & Visual Containers (`rounded-lg`, 1rem):** Vehicle cards, itinerary snapshots, and image frames utilize 16px radius corners, delivering an organic yet structured silhouette.
- **Pill Elements (`rounded-full`):** Category tags, travel status badges, chauffeur qualification pills, and primary CTAs use fully rounded pill geometries (9999px) reminiscent of modern luxury travel tags.
- **Form Controls & Inputs (`rounded-md`, 0.5rem):** Search fields, date selectors, and filter dropdowns maintain an 8px radius to preserve ergonomic focus and data entry efficiency.
- **Visual Framing:** Automotive and destination imagery uses consistent `16:10` or `4:3` aspect ratios with subtle `1px` inner boundary strokes to evoke fine-art photo prints.

## Components

### Buttons & Interactive Controls
- **Primary CTA:** `primary-container` crimson fill (`#990000`), crisp white text (`#FFFFFF`), `rounded-full`, uppercase tracked typography (`label-md`). Hover state shifts to `primary` (`#6E0000`) with subtle elevation lift. Use `primary` for the hover/pressed state and for crimson text on light surfaces; reserve the crimson *fill* for `primary-container`.
- **Secondary / Editorial Ghost Button:** Transparent background with a refined 1px border (`#73584E`), `on-surface` text, transforming on hover to `secondary` background with `on-secondary` text.
- **Tertiary Text Action:** Playfair Display medium weight with a persistent hairline `primary` underline spaced 4px beneath the baseline.

### Badges & Status Chips
- **Category & Fleet Pill:** Small pill shape (`rounded-full`) in `surface-container-low` oat neutral (`#FAF2EE`) with `on-surface` uppercase text (`#1E1B19`).
- **Signature / Featured Pill:** `primary-container` crimson fill (`#990000`) with `on-primary` white text (`#FFFFFF`), used for "Driver Included" or "Premium Luxury".
- **Availability Pill:** `available-bg` soft sage (`#EDF4EE`) with `available-text` deep forest green (`#235C2B`).

### Fleet Vehicle Cards
- Structured white surface container with 16px border radius.
- Top section holds an immersive `16:10` automotive photograph with a floating category pill on the top left.
- Middle section presents the vehicle name in Playfair Display (`headline-sm`) accompanied by a subtle horizontal divider line.
- Feature grid displays iconographic specifications (passengers, luggage capacity, transmission, air conditioning) using `body-sm` in stone grey.
- Bottom baseline features a clean daily rate display in bold crimson alongside a rounded "Book Vehicle" button.

### Form Inputs & Travel Search Bar
- Concierge-inspired segmented pill bar floating above hero imagery.
- Integrated segmented fields: "Pickup Location", "Travel Dates", and "Service Type" (Self-Drive vs. Chauffeur Service).
- Subtle vertical hairline dividers (`rgba(28, 25, 23, 0.1)`) separating each input chunk.
- Focused state highlights the entire segment with a micro 1px crimson border and warm cream background fill.

### Itinerary & Route Timeline Cards
- Vertical continuous line in warm sand (`#FEDEB2`, `tertiary-fixed`) connecting departure and arrival milestones.
- Waypoint nodes highlighted with miniature crimson filled dots.
- Travel duration and distance metrics set in uppercase `label-sm` tracking.