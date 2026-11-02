# Visio Spaces brand guidelines

Version 0.1, derived on 2 November 2026 from the logo file. See it all laid out in [brand-sheet.html](brand-sheet.html). Machine-readable values are in [tokens.css](tokens.css) and [tokens.json](tokens.json).

## What is fact and what is proposed

The firm supplied a logo and nothing else, so most of this system is a proposal built outward from it.

| Taken directly from the logo file | Proposed from it, needs approval |
|---|---|
| The mark and the wordmark artwork | Accent colour (Blueprint) and stone neutrals |
| Graphite `#1F1F1F` | Typeface for everything outside the logo (Archivo) |
| The descriptor "Architectural Consultancy" | Brand idea, voice and imagery direction |
| Segoe UI, as used in the wordmark | Clear space and minimum sizes |

## The idea: built and drawn

The mark is two forms side by side. One is a **solid plane**. The other starts as a solid block with a doorway and rises into a **thin outline**. A building is both things at once: what stands on site, and the line drawn before it.

That gives the brand one visual rule and one sentence:

> Solid where it's decided. Line where it's still being imagined.

| | |
|---|---|
| **Theme** | Exact, open threshold |
| **Philosophy** | Identity-first: the mark and its logic carry the story |
| **Archetype** | Sage, with Creator as secondary |
| **Should feel** | Considered, clear, grounded |
| **Must never feel** | Showy, decorative, corporate |

## Logo

All files are in [logo/](logo/). The SVGs were converted from the original Illustrator PDF without changing the shapes, and the type is outlined, so no font is needed to display them.

| File | Use |
|---|---|
| `visio-spaces-logo-graphite.svg` | Primary lockup, on light backgrounds |
| `visio-spaces-logo-white.svg` | Primary lockup, on dark backgrounds or photos |
| `visio-spaces-mark-graphite.svg` | Mark alone, where the name appears nearby |
| `visio-spaces-mark-white.svg` | Mark alone, reversed |
| `source/visio-spaces-logo-source.pdf` | Original artwork. Keep it as the master |

**Clear space:** keep a margin around the logo equal to the height of the mark's doorway, about 14% of the mark's height.

**Minimum sizes**

| Version | Screen | Print | Why |
|---|---|---|---|
| Full lockup | 120 px wide | 32 mm wide | Below this the descriptor stops being readable |
| Mark alone | 40 px tall | 10 mm tall | Below this the outline falls under 1 px and starts to disappear |

**Colour:** the logo is only ever Graphite or white. On photos, use white over a dark, calm area.

**Don't:** recolour it in Blueprint or any other colour, add effects, rotate it, rearrange the lockup, or retype the wordmark. Its letters are stretched about 26% wider than normal, so typing "VISIO SPACES" in Segoe UI will not match.

## Name

- Write **Visio Spaces** in text, as two words with capitals. Capitals throughout belong to the logo only.
- The firm's descriptor is **Architectural Consultancy**. Use it wherever the firm is introduced.

## Colour

Graphite and paper do almost all of the work. Blueprint stands for the drawn line, so it is reserved for things that are live: links, focus, and small technical marks. As a guide, keep it under about 5% of any layout.

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| `graphite` | `#1F1F1F` | `oklch(23.9% 0 0)` | Logo, text, dark surfaces |
| `white` | `#FFFFFF` | `oklch(100% 0 0)` | Reversed logo, cards |
| `paper` | `#F6F5F2` | `oklch(97% 0.004 91)` | Main background |
| `stone-100` | `#ECEAE5` | `oklch(93.7% 0.007 89)` | Alternate background |
| `stone-200` | `#DAD7D0` | `oklch(88% 0.010 87)` | Dividers |
| `stone-300` | `#BDB9B0` | `oklch(78.6% 0.013 87)` | Borders, secondary text on Graphite |
| `stone-400` | `#98948B` | `oklch(66.7% 0.014 87)` | Decorative only on light backgrounds |
| `stone-500` | `#76726A` | `oklch(55.3% 0.013 85)` | Large text and icons on paper |
| `stone-600` | `#5C5952` | `oklch(46.5% 0.012 88)` | Secondary text |
| `stone-700` | `#45433E` | `oklch(38.3% 0.009 89)` | Strong secondary text |
| `stone-800` | `#31302C` | `oklch(30.9% 0.007 95)` | Raised dark surfaces |
| `blueprint-100` | `#E3EAF6` | `oklch(93.5% 0.018 261)` | Tinted background |
| `blueprint-300` | `#8FAADB` | `oklch(73.6% 0.078 262)` | Links and accents on Graphite |
| `blueprint-500` | `#2F62BC` | `oklch(51.1% 0.152 261)` | Link hover |
| `blueprint-600` | `#1F4FA3` | `oklch(44.5% 0.146 261)` | Links, focus, buttons |
| `blueprint-700` | `#193F83` | `oklch(38.2% 0.123 261)` | Pressed state |
| `blueprint-900` | `#102850` | `oklch(28.3% 0.079 260)` | Deep tinted surface |

Status colours, for forms only: `success` `#1E6B4A`, `warning` `#8A5A00`, `error` `#B3261E`. Always pair them with a word or icon, not colour alone.

**Checked contrast (WCAG 2.1)**

| Pair | Ratio | Allowed for |
|---|---|---|
| Graphite on paper | 15.12 | All text |
| Graphite on stone-100 | 13.71 | All text |
| Stone-600 on paper | 6.41 | All text |
| Stone-500 on paper | 4.39 | Large text and icons only |
| Stone-400 on paper | 2.77 | Not for text or meaningful icons |
| Blueprint-600 on paper | 7.12 | All text |
| White on Blueprint-600 | 7.76 | All text |
| Paper on Graphite | 15.12 | All text |
| Stone-300 on Graphite | 8.42 | All text |
| Blueprint-300 on Graphite | 7.02 | All text |

## Typography

**Archivo** is used for everything outside the logo. It is free under the SIL Open Font License, available from Google Fonts, and has a width axis. That lets headings echo the logo's widened letters while body text stays at normal width, so one family does both jobs.

**Fallback stack:** `Archivo, "Segoe UI", Arial, sans-serif`. Segoe UI ships with Windows and matches the logo, but it isn't free to self-host on the web, so it is only a fallback for people who already have it.

| Token | Size | Role | Width | Weight | Line height | Tracking |
|---|---|---|---|---|---|---|
| `display` | `clamp(3.5rem, 9vw, 9rem)` | Largest moments | 125% | 400 | 1.0 | -1% |
| `2xl` | 61 px | Page heading | 125% | 400 | 1.05 | -1% |
| `xl` | 39 px | Section heading | 125% | 400 | 1.1 | -0.5% |
| `lg` | 25 px | Sub-heading | 112% | 500 | 1.2 | 0 |
| `md` | 20 px | Lead paragraph | 100% | 400 | 1.45 | 0 |
| `base` | 16 px | Body | 100% | 400 | 1.55 | 0 |
| `sm` | 14.4 px | Labels and metadata | 100% | 500 | 1.4 | +0.5% |
| `xs` | 12.8 px | Captions | 100% | 400 | 1.4 | +0.5% |

Set headings in sentence case and keep body lines under about 75 characters. Avoid setting long text in capitals. For very large display type, 300 is an acceptable lighter weight.

## Graphic language

- **Solid and line:** pair a filled form with an outlined one. Use a fine line and a heavy mass, with little in between.
- **The angle:** the mark's sloped edges run at about 32° to 42°. Where a diagonal cut is needed, stay in that range, around 36°.
- **Square corners:** the architecture of the mark has no rounded forms, so avoid rounded cards and pill buttons.
- **No decoration:** no gradients, shadows or patterns for their own sake. Don't crop or slice the mark to make a pattern.

**Fixed:** logo, Graphite, Archivo, the solid-and-line logic.
**Can vary:** layout, photography, the balance of paper and Graphite, how much Blueprint appears up to the limit above.

## Voice

Write the way a good architect talks to a client: plain, specific and calm.

| Quality | Means | Instead of |
|---|---|---|
| **Precise** | "The bedrooms face east for morning light." | "Light-filled, inspiring spaces." |
| **Plain** | "We reply within two working days." | "Reach out to start your journey." |
| **Grounded** | Name the site, the material, the constraint. | "Pushing the boundaries of design." |

Use sentence case, active verbs and real numbers, and only claim what the firm can show in its work.

## Imagery

**Standard image brief:** natural daylight, with a low sun raking across real materials. Show the building at a true human scale, with level verticals and a calm frame. If people appear, they are small and using the space, never posing. Colour stays close to how the materials really look.

**Avoid:** dramatic HDR skies, heavy colour grading, wide-angle distortion, stock people, and renders presented as completed buildings.

## Using the brand on the website

| Brand asset | On the site |
|---|---|
| Logo | Header uses the lockup or mark at the minimum sizes above, with the clear space kept |
| Graphite and paper | Page text and background |
| Blueprint | Links, focus rings and technical marks such as the sun dial |
| Archivo | Replaces the current site fonts, Big Shoulders Display and Newsreader |
| Built and drawn | The opening sketch-to-solid animation already expresses this idea, so keep it |
| Descriptor | Page title and description say "Architectural Consultancy", not "Architecture studio" |

## Open items

1. **Approval:** the firm should sign off the proposals in the first table above.
2. **Artwork quality:** the logo's edges are made of many short, slightly uneven segments, which suggests it was image-traced. It looks fine at normal sizes, but a clean redraw is worth doing before large-format use such as signage.
3. **Very small sizes:** there is no version of the mark that survives below 40 px, which a favicon needs. It needs a simplified small-use version, with the outline thickened.
4. **Web font check:** confirm the current Segoe UI licensing with Microsoft before any wider use beyond the outlined logo.
