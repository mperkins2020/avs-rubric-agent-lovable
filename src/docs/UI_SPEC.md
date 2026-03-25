# ValueTempo UI Spec for Lovable

## 1. Objective

Build a light-mode-first website and product marketing surface for ValueTempo that feels:

- analytical
- premium
- product-native
- credible
- high-signal
- modern, without looking like a generic AI gradient startup

The system should be **light by default, dark by intention**.

Use light neutrals for most surfaces, then use Midnight Blue sparingly for hero bands, footers, high-signal CTA moments, dense product sections, and select data modules.

This spec is intended to be implemented in Lovable for:

- the ValueTempo marketing site
- the AVS Rubric landing page and key product-facing surfaces
- report preview sections
- CTA modules
- supporting informational pages such as methodology and FAQ

---

## 2. Brand Intent

### Brand meaning

ValueTempo should visually communicate:

- value realization
- speed and signal
- trust and structure
- measurement and clarity

### Core visual tension

The brand should sit between:

- **clarity and energy**
- **precision and warmth**
- **signal and restraint**

### What this should not feel like

Do not let the experience become:

- too dark
- too cold
- too playful
- too consumer-social
- too abstract
- too template-driven
- too "AI startup gradient wallpaper"

---

## 3. Design Principles

1. **Clarity first**
   Every section should help the visitor understand the product faster.

2. **Restraint beats decoration**
   Gradients, glows, and accent colors should be sparse and purposeful.

3. **Contrast should guide hierarchy**
   Use contrast to indicate importance, not to create noise.

4. **Cards are the main rhythm device**
   White cards on cool light neutrals should carry most content.

5. **Dark is a brand lever, not the default canvas**
   Midnight Blue should feel intentional and important.

6. **Product credibility matters more than visual trendiness**
   The site should look trustworthy enough for operators, product leaders, and enterprise buyers.

---

## 4. Color System

### 4.1 Core brand colors

| Token | Role | Hex | Use |
| --- | --- | --- | --- |
| `vt.violet.500` | Primary brand color | `#8C52FF` | core identity, selected emphasis, badges, accent highlights |
| `vt.cyan.500` | Signal color | `#00C2FF` | data signal, highlight lines, icons, chart primaries |
| `vt.blue.500` | Bridge color | `#4F7BFF` | gradient midpoint, data accents, selected hover states |
| `vt.midnight.900` | Dark anchor | `#0B1220` | hero bands, footer, primary CTAs, dense product moments |

### 4.2 Accent colors

| Token | Role | Hex | Use |
| --- | --- | --- | --- |
| `vt.coral.500` | Energy accent | `#FF7A45` | emphasis, selected highlights, alerts, featured moments |
| `vt.magenta.500` | High-intensity accent | `#C026D3` | very limited emphasis only |
| `vt.mint.500` | Positive / signal accent | `#22F0C6` | positive states, success, supporting charts |

### 4.3 Light neutrals

| Token | Role | Hex | Use |
| --- | --- | --- | --- |
| `vt.bg.page` | Main page background | `#F6F8FC` | default page canvas |
| `vt.bg.section` | Alternate section background | `#EEF2F8` | alternating blocks, section separation |
| `vt.bg.card` | Card surface | `#FFFFFF` | cards, forms, content panels |
| `vt.border.default` | Border / divider | `#D7DFEA` | card borders, inputs, separators |
| `vt.text.primary` | Primary text | `#0B1220` | body copy, headings |
| `vt.text.secondary` | Secondary text | `#5B667A` | support copy, labels |
| `vt.text.tertiary` | Low emphasis text | `#7A8798` | placeholder text, metadata |

### 4.4 Dark neutrals

| Token | Role | Hex | Use |
| --- | --- | --- | --- |
| `vt.bg.dark` | Dark background | `#0B1220` | anchor sections |
| `vt.bg.dark.card` | Dark card | `#111827` | dark inner panels |
| `vt.border.dark` | Dark border | `#1F2937` | dark-mode dividers |
| `vt.text.onDark` | Primary text on dark | `#E5E7EB` | headings and body on dark |
| `vt.text.onDark.secondary` | Secondary text on dark | `#9CA3AF` | supporting text on dark |

### 4.5 Gradient system

**Primary gradient:**

`#00C2FF → #4F7BFF → #8C52FF`

Use the gradient only for:

- hero highlights
- select icon or illustration treatments
- high-value data callouts
- limited CTA emphasis
- accent strokes or bars

Do not use the gradient as a full-page background.

---

## 5. Surface Balance Rules

Use this distribution across the overall experience:

- **80 to 85%** light neutral surfaces
- **10 to 15%** white cards and content surfaces
- **5 to 10%** dark anchor moments

### Practical interpretation

- Most pages use `#F6F8FC` as the global background.
- Cards, report previews, and inputs sit on white.
- Alternate sections use `#EEF2F8`.
- Hero, footer, and select CTA sections use `#0B1220`.

If the site starts feeling dark again, the system is being misused.

---

## 6. Typography

### Type direction

Use a clean, modern sans-serif that feels product-grade and highly readable.

Recommended if available in Lovable:

- **Inter** for primary UI and body
- fallback: system sans-serif

### Typographic tone

- headings: crisp, compact, strong
- body: readable and calm
- labels: minimal, functional
- avoid oversized, fluffy marketing typography

### Type scale

| Token | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| `display.lg` | 56px | 700 | 1.05 | main hero headline on desktop |
| `display.md` | 44px | 700 | 1.1 | secondary hero, major page heads |
| `heading.xl` | 36px | 700 | 1.15 | section heads |
| `heading.lg` | 28px | 700 | 1.2 | card section heads |
| `heading.md` | 22px | 600 | 1.25 | subheads |
| `body.lg` | 18px | 400 | 1.6 | prominent body text |
| `body.md` | 16px | 400 | 1.6 | default body |
| `body.sm` | 14px | 400 | 1.5 | metadata, helper text |
| `label.sm` | 12px | 600 | 1.4 | chips, overlines, field labels |

### Typography rules

- Headings should be dark and decisive.
- Body text should use `vt.text.primary` or `vt.text.secondary`.
- Do not center long blocks of body copy.
- Limit hero headlines to 2 lines where possible.
- Use sentence case, not all caps, except for very small labels.

---

## 7. Spacing and Layout System

### 7.1 Global spacing scale

| Token | Value |
| --- | --- |
| `space.2` | 8px |
| `space.3` | 12px |
| `space.4` | 16px |
| `space.5` | 20px |
| `space.6` | 24px |
| `space.8` | 32px |
| `space.10` | 40px |
| `space.12` | 48px |
| `space.16` | 64px |
| `space.20` | 80px |
| `space.24` | 96px |
| `space.32` | 128px |

### 7.2 Border radius

| Token | Value | Use |
| --- | --- | --- |
| `radius.sm` | 12px | chips, pills |
| `radius.md` | 16px | inputs, small cards |
| `radius.lg` | 20px | buttons, content cards |
| `radius.xl` | 24px | feature cards |
| `radius.2xl` | 28px | hero cards, major panels |
| `radius.3xl` | 36px | standout modules |

### 7.3 Shadows

Use subtle shadows only. Heavy elevation will cheapen the interface.

| Token | Value |
| --- | --- |
| `shadow.sm` | `0 4px 14px rgba(11,18,32,0.06)` |
| `shadow.md` | `0 10px 30px rgba(11,18,32,0.08)` |
| `shadow.lg` | `0 18px 45px rgba(11,18,32,0.10)` |

### 7.4 Max width and grid

- global content max width: **1200px to 1280px**
- standard horizontal padding:
  - desktop: **32px to 40px**
  - tablet: **24px**
  - mobile: **16px to 20px**
- default page grid:
  - desktop: **12 columns**
  - tablet: **8 columns**
  - mobile: **4 columns**

### 7.5 Section rhythm

Standard section padding:

- desktop: **80px to 112px top and bottom**
- tablet: **64px to 80px**
- mobile: **48px to 64px**

Sections should breathe. Do not compress the layout to chase density.

---

## 8. Responsive Breakpoints

| Breakpoint | Width |
| --- | --- |
| Mobile | `< 768px` |
| Tablet | `768px to 1023px` |
| Desktop | `1024px to 1439px` |
| Wide | `1440px+` |

### Responsive rules

- Stack multi-column content on mobile.
- Hero input bars should collapse cleanly into vertical layout on mobile.
- Cards should preserve padding, do not shrink content into cramped blocks.
- Maintain readable line lengths on large screens by constraining content width.

---

## 9. Page Shell

### Body

- background: `vt.bg.page`
- text color: `vt.text.primary`
- overall feel: light, clean, calm, precise

### Navbar

#### Desktop navbar
- height: **72px to 80px**
- background: either transparent over light page background or a soft translucent white
- optional: `background: rgba(255,255,255,0.75)` with slight blur
- border-bottom: 1px solid `vt.border.default`
- logo aligned left
- nav links centered or right-aligned depending on page depth
- CTA on right

#### Navbar link styling
- default text: `vt.text.primary`
- hover: subtle color shift to `vt.violet.500` or underline accent in cyan
- active: slightly stronger weight or darker underline

#### Navbar CTA
- use primary button styling
- label should be short: `Analyze`

### Footer

- background: `vt.bg.dark`
- text: `vt.text.onDark`
- secondary text: `vt.text.onDark.secondary`
- top border or accent rule can use gradient line or cyan stroke
- layout should be clean and editorial, not crowded

---

## 10. Component Specs

## 10.1 Buttons

### Primary button
- background: `vt.midnight.900`
- text: white
- radius: `20px`
- height: `48px` or `52px`
- padding: `0 20px` to `0 24px`
- shadow: `shadow.sm`
- hover: slightly lighter dark, or lift with slightly stronger shadow
- active: reduce shadow and slightly darken

### Secondary button
- background: white
- text: `vt.text.primary`
- border: `1px solid vt.border.default`
- hover: background shifts to `#F8FAFD`

### Accent button
- use only for featured moments
- fill: gradient or violet
- text: white or midnight depending on contrast
- do not overuse

### Button rules
- No oversized pill buttons unless used intentionally in hero.
- Button copy should be direct and short.
- Avoid multiple accent button colors in the same viewport.

---

## 10.2 Inputs and URL Bar

### Primary URL input module
This is a key product interaction surface.

#### Structure
- white input field on light page background
- border: `vt.border.default`
- radius: `20px`
- height: `56px to 64px`
- inside padding: `16px to 20px`
- adjacent CTA button: primary button
- helper note below: `Free · 3 runs per week`

#### Placeholder text
- color: `vt.text.tertiary`

#### Focus state
- border becomes violet or blue
- optional subtle outer glow using low-opacity cyan or violet
- avoid heavy neon glow

#### Mobile behavior
- input and button stack vertically
- maintain generous spacing

---

## 10.3 Cards

### Default content card
- background: white
- border: `1px solid vt.border.default`
- radius: `24px to 28px`
- padding: `24px to 32px`
- shadow: `shadow.sm` or `shadow.md`

### Feature card
- same structure as default card
- optional small top accent rule in cyan, violet, or coral
- do not fill cards with gradient backgrounds except for very selective highlight modules

### Report preview card
- background: white
- radius: `28px`
- border: `1px solid vt.border.default`
- can include internal mini cards, chips, confidence bars, and score rows

### Card rules
- Keep shadows subtle.
- Let spacing, borders, and contrast do most of the work.
- Use icons sparingly.

---

## 10.4 Chips and labels

### Default chip
- background: `vt.bg.section`
- text: `vt.text.secondary` or `vt.text.primary`
- height: `28px to 36px`
- padding: `0 12px`
- radius: full pill or `999px`

### Score chip examples
- strong: background with subtle mint tint, text in deep positive color
- partial: subtle violet or blue tint
- sparse / warning: subtle coral tint

### Label use
Use chips for:
- confidence states
- section tags
- report metadata
- small overlines

Do not turn every line into a chip.

---

## 10.5 Section headers

Each section header should include:

- optional overline or chip
- strong headline
- one short supporting paragraph

Spacing should feel editorial.

Recommended max width:
- headline block: **680px to 760px**
- supporting paragraph: **620px to 720px**

---

## 10.6 Hero section

### Layout
Preferred desktop layout:

- left: headline, subhead, URL input, CTA, proof note
- right: product preview card, gradient illustration, or simplified analysis visual

### Hero background options
#### Option A, default
- page background `vt.bg.page`
- main hero content inside a large white or near-white card
- best for clarity and conversion

#### Option B, selective high-drama
- outer band uses `vt.bg.dark`
- inner hero card remains white
- use this sparingly

### Hero content structure
- overline or small label
- headline
- supporting subheadline
- URL input + CTA
- small trust/proof note
- supporting visual

### Hero visual rules
- no generic blob illustrations
- no random AI spark particles
- visuals should feel like product, scoring, evidence, trust, or signal

---

## 10.7 Three-pillar section

This section explains what the analysis evaluates.

### Structure
- section background: `vt.bg.page` or `vt.bg.section`
- 3 cards in desktop row
- stacked on mobile
- each card gets:
  - small accent line or chip
  - title
  - short explanation

### Visual tone
- highly legible
- no over-illustration
- keep structure clean

---

## 10.8 Example analysis / report preview

This is one of the most important modules because it converts abstract trust into something concrete.

### Structure
- large white card
- internal segmentation for score area, evidence block, confidence layer, and improvement callouts
- optional split layout:
  - left: score / trust stack summary
  - right: evidence and notes

### Styling
- white background
- thin borders
- subtle internal dividers
- small accent color bars only where needed

### Important rule
This module should feel like a real product surface, not like a marketing illustration pretending to be a product.

---

## 10.9 Evidence-backed scoring block

### Purpose
Explain that the score is based on public evidence, confidence levels, and observable trust surfaces.

### Styling
- use a light neutral or white card
- include 3 to 4 small supporting tiles or bullets
- use restrained iconography if needed

---

## 10.10 CTA bands

### Primary CTA band
- use `vt.bg.dark`
- text on dark
- single primary CTA button
- optional secondary CTA as text link or light button
- include a short clarifying line beneath the CTA if helpful

### CTA band rule
Dark CTA sections should feel like punctuation marks in the experience. If there are too many, they lose force.

---

## 10.11 Methodology page modules

Use a more editorial layout with:

- section index or sticky side nav on desktop
- white cards for methodology blocks
- chips for dimensions and confidence markers
- tables with subtle borders and generous row spacing

Keep this page highly readable. It is not a visual playground.

---

## 10.12 FAQ page modules

- accordion items on white cards or white background with separators
- question text in `vt.text.primary`
- answer text in `vt.text.secondary`
- hover and expand states should be subtle

---

## 11. Data Visualization Guidance

Because ValueTempo is scoring-oriented, charts and diagrams must look disciplined.

### Default color order
1. `#00C2FF`
2. `#4F7BFF`
3. `#8C52FF`
4. `#22F0C6`
5. `#FF7A45`

### Rules
- Use cyan and blue first for analytical clarity.
- Use violet for category or comparison emphasis.
- Use mint for positive outcomes or completed states.
- Use coral for warnings or attention.
- Avoid wide rainbow palettes.
- Use gradient only in hero metrics or selected showcase charts.

### Chart containers
- white card background
- light border
- dark text labels
- very light grid lines

---

## 12. Motion and Interaction

### Motion principle
Motion should communicate precision, not spectacle.

### Recommended motion behavior
- card hover: slight lift, tiny shadow increase
- button hover: subtle elevation or tonal change
- section reveal: short fade and upward motion
- chip / accent highlight: gentle opacity or background shift

### Timing
- hover transitions: `150ms to 220ms`
- section reveal: `250ms to 400ms`

### Avoid
- floaty infinite animations
- heavy parallax
- glowing pulse loops
- decorative motion that does not improve comprehension

---

## 13. Accessibility Rules

### Contrast
- all body text must meet accessible contrast on backgrounds
- do not rely on color alone to communicate meaning

### Focus states
- visible focus ring on buttons, inputs, and interactive cards
- recommended focus ring: violet or blue outline with subtle outer halo

### Typography
- minimum body size: `16px`
- maintain comfortable line height
- avoid low-contrast secondary copy on white

### Layout
- preserve large tap targets on mobile
- avoid tiny chips as primary interactive elements

---

## 14. Content and UI Density Guidance

ValueTempo should feel:

- structured
- high-signal
- calm
- trustworthy

It should not feel:

- crowded
- decorative
- buzzword-heavy
- visually over-optimized

### Density rules
- Use whitespace aggressively around hero, report preview, and methodology sections.
- Keep paragraphs short.
- Break complex explanations into clean cards or rows.
- Do not put too many colored elements in one section.

---

## 15. Lovable Build Instructions

Use the following implementation rules in Lovable.

### 15.1 Overall page setup
- Set the global body background to `#F6F8FC`.
- Use Inter or a close modern sans-serif.
- Keep the page max width around `1200px to 1280px`.
- Use white cards with soft radius and subtle shadows.
- Use Midnight Blue only for hero anchors, CTA bands, footer, and high-signal product moments.

### 15.2 Section styling rules
- Alternate between `#F6F8FC`, `#EEF2F8`, and white card surfaces.
- Avoid placing multiple dark sections back to back unless there is a strong narrative reason.
- Keep sections roomy with generous padding.

### 15.3 Component styling rules
- Buttons: dark primary, white secondary, gradient only for selective emphasis.
- Inputs: white, bordered, slightly rounded, with clean focus states.
- Cards: white, bordered, subtle shadows, 24px to 28px radius.
- Chips: soft tinted backgrounds, minimal use.

### 15.4 Hero rules
- Use a white or very light hero card sitting on the cool light neutral page background.
- Keep the main CTA close to the URL input.
- Use one product-like visual on the right, not a decorative abstract illustration.

### 15.5 Report preview rules
- Make the preview look like an actual product surface.
- Use real layout structure such as score blocks, evidence list, confidence labels, and recommendation rows.
- Avoid fake dashboard clutter.

### 15.6 Footer rules
- Use Midnight Blue.
- Keep the footer spacious and clean.
- Use cyan or violet sparingly as accent dividers or icon touches.

---

## 16. Do and Do Not

### Do
- use `#F6F8FC` as the default page background
- use white cards generously
- keep dark sections sparse and purposeful
- use the cyan to blue to violet gradient as a controlled brand asset
- keep the UI product-like and legible
- make the report preview feel real
- use borders and spacing to create structure

### Do not
- make the whole site dark navy
- wash large surfaces in gradients
- overuse coral, magenta, or mint
- use generic AI visual clichés
- over-animate the interface
- create visual noise with too many badges, glows, and colors
- let the site feel like a template gallery landing page

---

## 17. Recommended Page-by-Page Application

### Homepage
- light page background
- white hero card
- three-pillar section on light neutral
- report preview on white
- evidence-backed scoring on alternate light background
- dark CTA band near bottom
- dark footer

### Methodology
- light editorial layout
- white methodology cards
- strong table styling with subtle borders
- minimal accent usage

### FAQ
- light background
- white accordion items
- clean typography

### Product / report preview pages
- mostly white-card structure
- selective dark sections only where density benefits from contrast

---

## 18. Copy-Paste Prompt for Lovable

Use this prompt directly in Lovable as the design and UI direction:

> Redesign the ValueTempo site and key product-facing marketing surfaces using a light-mode-first system that feels analytical, premium, credible, and product-native. The default page background should be `#F6F8FC`. Use white cards with subtle borders `#D7DFEA`, soft premium radius `24px to 28px`, and restrained shadows. Primary text should be `#0B1220`, secondary text `#5B667A`. Use Midnight Blue `#0B1220` only for dark anchor moments such as the footer, select CTA bands, hero emphasis, and dense product sections. The core brand colors are Signal Cyan `#00C2FF`, Deep Blue `#4F7BFF`, Electric Violet `#8C52FF`, with the primary gradient `#00C2FF -> #4F7BFF -> #8C52FF` used sparingly for highlights, accent bars, and select product or hero moments. Avoid generic AI startup visuals, large gradient washes, heavy glows, or overly dark layouts. The interface should feel clear, structured, high-signal, and trustworthy. Use real product-like cards for report previews, scoring blocks, evidence rows, and confidence labels. Buttons should be dark primary, white secondary, and gradient only for selective emphasis. Keep the layout spacious, with max width around `1200px to 1280px`, generous section padding, clean card rhythm, and restrained motion.

---

## 19. Final Build Standard

The site should look like:

- a serious product company
- a modern analytical system
- a trust infrastructure platform

It should not look like:

- a crypto site
- a developer toy
- a vague AI studio
- a gradient-heavy startup template

The job of the UI is not to impress people with style alone.

The job is to make ValueTempo look credible enough that a sharp operator believes the product could actually help them diagnose and improve trust, pricing legibility, and growth friction.
