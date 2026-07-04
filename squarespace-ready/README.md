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
4. Set the page's **SEO title** manually in Page Settings — the original `<title>` tag is preserved
   only as an HTML comment at the top of each fragment for reference.

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
