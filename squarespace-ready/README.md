# Squarespace-ready page fragments

These files started as full standalone HTML pages (`<!DOCTYPE>` / `<html>` / `<head>` / `<body>`).
Squarespace Code Blocks can't accept a full document — only a fragment — so each file here has
been converted to a drop-in fragment. What changed:

1. **Removed the document wrapper** (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>` tags). Only the
   inner content remains, plus the page's `<style>` block and Google Fonts `<link>` tags moved to
   the top of the fragment.
2. **Fixed internal navigation links.** The originals linked page-to-page as `contact.html`,
   `service-areas.html`, etc. Squarespace doesn't serve `.html` files — it uses clean URLs based on
   each page's slug. Links were rewritten to `/`, `/contact`, `/estimate`, `/faq`, `/financing`,
   `/gallery`, `/service-areas`, `/services`, `/storm-damage`. **This only works if you set each
   page's URL slug in Squarespace to match** (Page Settings → SEO → URL Slug).
3. Left the `<script>` blocks (FAQ accordion on `faq.html`, form validation + mailto on
   `estimate.html`) untouched — they only reference IDs scoped to that page.
4. **Made the header mobile-friendly.** The original nav had no mobile breakpoint at all — on a
   phone-width screen it either stacked into a huge list of links above the page content, or (on
   some pages) got clipped off-screen entirely because the logo, nav, and "Free Estimate" button
   were all set to never shrink or wrap. Added a hamburger button that only shows at ≤860px width;
   it toggles the nav + call-to-action open/closed instead of them competing for space with the logo.
5. **Made multi-column grids stack on mobile.** The 3-column contact cards, gallery tiles, and
   3-column footer used raw `grid-template-columns` with no responsive fallback, so on a phone they
   either got visibly cut off at the right edge or produced a broken 2-column layout (a `grid-column:
   span 2` tile forces CSS Grid to create an extra implicit column even when the explicit grid is set
   to 1 column). Fixed both: all grids collapse to a single column and all spanned tiles go full-width
   below 860px.

Verified all 9 pages at 375px (mobile) and 1440px (desktop) in a headless browser: no horizontal
overflow, hamburger opens/closes correctly, grids stack cleanly, desktop nav/layout unchanged.

## How to use each file
1. Create the page in Squarespace (or open the existing one) and set its **layout to Blank**, with
   the site header, footer, and announcement bar hidden for that page — the pages already include
   their own custom header/nav/footer baked into the markup, so Squarespace's own chrome would
   double up otherwise.
2. Add a **Code Block** to the page and paste the entire contents of the matching file into it.
3. Set the page's **URL slug** to match the mapping above (e.g. `service-areas.html` → slug
   `service-areas`) so the nav links between pages resolve correctly.
4. Set the page's **SEO Title** and **SEO Description** in Page Settings → SEO tab (see table below).
   This works the same whether or not the header/footer are hidden — SEO fields live in the page's
   `<head>`, which is separate from the visual template chrome. The original `<title>` tag is also
   preserved as an HTML comment at the top of each fragment for reference.

## SEO titles & descriptions
Paste these into each page's **Page Settings → SEO tab** in Squarespace.

| Page | Slug | SEO Title | SEO Description |
|---|---|---|---|
| Home | `/` | BigBoss Roofing LLC \| DFW Roofing & Storm Damage Experts | Residential and commercial roofing across Dallas-Fort Worth. 50+ years of experience, storm claim support, and lifetime warranty options. Free estimates. |
| Services | `/services` | Roofing Services in DFW \| BigBoss Roofing LLC | Roof repairs, full replacements, inspections, metal & flat roofing, gutters, and storm damage services for homes and businesses across Dallas-Fort Worth. |
| Storm Damage | `/storm-damage` | Storm Damage & Insurance Claims \| BigBoss Roofing LLC | Hail and wind damage inspections, photo documentation, and insurance claim assistance for DFW homeowners. Fast response for roof leaks and storm repairs. |
| Financing | `/financing` | Roof Financing Options \| BigBoss Roofing LLC | Ask about Bank of America financing for qualified roofing projects. We review scope, warranty options, and next steps before work begins in DFW. |
| Gallery | `/gallery` | Roofing Project Gallery \| BigBoss Roofing LLC | See completed roof replacements, storm repairs, gutters, and siding projects from BigBoss Roofing LLC across the Dallas-Fort Worth metroplex. |
| FAQ | `/faq` | Roofing FAQs \| BigBoss Roofing LLC | Answers about service areas, free estimates, storm claim support, warranties, financing, and commercial roofing from BigBoss Roofing LLC in DFW. |
| Service Areas | `/service-areas` | DFW Service Areas \| BigBoss Roofing LLC | BigBoss Roofing LLC serves Dallas, Fort Worth, Arlington, Irving, Garland, Plano, Grand Prairie, and the surrounding DFW metroplex. Call to confirm coverage. |
| Contact | `/contact` | Contact BigBoss Roofing LLC \| DFW Roofing | Call, text, or email BigBoss Roofing LLC for roof inspections, repairs, storm claims, and free estimates across the Dallas-Fort Worth area. |
| Estimate | `/estimate` | Request a Free Roofing Estimate \| BigBoss Roofing LLC | Get a free, no-obligation roof estimate from BigBoss Roofing LLC. Tell us about your project and we'll follow up fast, serving all of DFW. |

## Optional cleanup (not required, but recommended)
Every fragment currently loads the same Google Fonts (`Saira Condensed`, `Archivo`) itself. If all
9 pages are live at once, it's more efficient to add those 3 `<link>` tags **once** in
**Settings → Advanced → Code Injection → Header** (site-wide) and delete them from each fragment
instead of loading the same fonts 9 times.

## Files
| Output file | Squarespace slug | Source upload |
|---|---|---|
| index.html | `/` (home) | 96ee9160-index.html |
| contact.html | `/contact` | 9d8dc8c0-contact.html |
| estimate.html | `/estimate` | f4f79458-estimate.html |
| faq.html | `/faq` | 70cdb0f1-faq.html |
| financing.html | `/financing` | 0d53e67a-financing.html |
| gallery.html | `/gallery` | bf771130-gallery.html |
| service-areas.html | `/service-areas` | 8d43f9bb-serviceareas.html |
| services.html | `/services` | f171e0d6-services.html |
| storm-damage.html | `/storm-damage` | d7a016fa-stormdamage.html |
