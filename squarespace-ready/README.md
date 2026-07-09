# Squarespace-ready page fragments

These files started as full standalone HTML pages (`<!DOCTYPE>` / `<html>` / `<head>` / `<body>`,
each with its own custom `<header>` and `<footer>`). They're now converted to drop-in Code Block
fragments that sit **inside Squarespace's native header, nav, and footer** — the pages don't try to
replace Squarespace's site chrome, they only supply the content in between.

## What changed
1. **Removed the document wrapper** (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`). Only the inner
   content remains, plus the page's `<style>` block and Google Fonts `<link>` tags moved to the top
   of the fragment.
2. **Removed the custom `<header>` and `<footer>`** that were baked into the original design. Use
   Squarespace's native header/nav/footer instead — do **not** hide them or switch these pages to a
   Blank layout. (An earlier version of this conversion assumed a fully custom header replacing
   Squarespace's own, which needed a hand-built hamburger menu; that's no longer the approach.)
3. **Fixed internal navigation links** and verified them against the real page source of
   bigbossroofing.com. Rewritten to: `/`, `/contact`, `/estimate-request`, `/faq`, `/financing`,
   `/gallery`, `/service-areas`, `/services-content`, `/storm-damage-insurance-claims`. If you rename
   any page's URL slug in Squarespace, update the matching links in these fragments to match.
4. **Made multi-column grids stack on mobile.** The 3-column contact cards, gallery tiles, and
   3-column footer-style layouts used raw `grid-template-columns` with no responsive fallback, so on
   a phone they either got cut off at the right edge or produced a broken layout (a `grid-column:
   span 2` tile forces CSS Grid to create an extra implicit column even when the explicit grid is set
   to 1 column). Fixed both: grids collapse to a single column and spanned tiles go full-width below
   860px.
5. **Added hover animation to buttons and cards**, since Squarespace's own animation system (see
   below) can't reach inside a Code Block. CTA buttons (pill and rounded-rectangle style) lift,
   scale up slightly, and brighten on hover; card-style containers (service cards, FAQ items,
   gallery tiles) lift with a shadow on hover. Respects `prefers-reduced-motion`.
6. Left the `<script>` blocks (FAQ accordion on `faq.html`, form validation + mailto on
   `estimate.html`) untouched — they only reference IDs scoped to that page.

Verified all 9 pages at 375px (mobile) and 1440px (desktop) in a headless browser: no horizontal
overflow, grids stack cleanly, buttons and cards visibly animate on hover, no console errors.

## Why no custom header this time
The live bigbossroofing.com homepage is built with Squarespace's **native** page builder (Fluid
Engine blocks) inside Squarespace's own header/footer — not a Code Block replacing the whole page.
These 9 fragments now follow that same pattern: paste the fragment into a Code Block placed in the
page's normal content area, and let Squarespace's header/nav/footer render around it as usual.

## Note on animations
The live homepage's buttons/text/shapes animate via Squarespace's native per-block **Animation**
panel (visible in the page source as `data-block-animations` JSON — e.g. buttons scale to 110% and
lift on hover with spring easing). That system only works on native Squarespace blocks; it cannot
apply to a Code Block's HTML. The hover CSS added in this conversion (item 5 above) is a hand-built
equivalent so the code-block sections feel consistent with the rest of the site.

## How to use each file
1. Open the destination page in Squarespace — normal layout, header/footer/nav visible as usual (do
   **not** hide them or use a Blank layout for these).
2. Add a **Code Block** where you want this content and paste the entire contents of the matching
   file into it.
3. Set the page's **URL slug** to match the table below so the internal `<a href>` links between
   pages resolve correctly.
4. Set the page's **SEO Title** and **SEO Description** in Page Settings → SEO tab (see table below).
   The original `<title>` tag is also preserved as an HTML comment at the top of each fragment for
   reference.

## Pages, slugs, and SEO
| Output file | Squarespace slug | SEO Title | SEO Description |
|---|---|---|---|
| index.html | `/` (home) | BigBoss Roofing LLC \| DFW Roofing & Storm Damage Experts | Residential and commercial roofing across Dallas-Fort Worth. 50+ years of experience, storm claim support, and lifetime warranty options. Free estimates. |
| services.html | `/services-content` | Roofing Services in DFW \| BigBoss Roofing LLC | Roof repairs, full replacements, inspections, metal & flat roofing, gutters, and storm damage services for homes and businesses across Dallas-Fort Worth. |
| storm-damage.html | `/storm-damage-insurance-claims` | Storm Damage & Insurance Claims \| BigBoss Roofing LLC | Hail and wind damage inspections, photo documentation, and insurance claim assistance for DFW homeowners. Fast response for roof leaks and storm repairs. |
| financing.html | `/financing` | Roof Financing Options \| BigBoss Roofing LLC | Ask about Bank of America financing for qualified roofing projects. We review scope, warranty options, and next steps before work begins in DFW. |
| gallery.html | `/gallery` | Roofing Project Gallery \| BigBoss Roofing LLC | See completed roof replacements, storm repairs, gutters, and siding projects from BigBoss Roofing LLC across the Dallas-Fort Worth metroplex. |
| faq.html | `/faq` | Roofing FAQs \| BigBoss Roofing LLC | Answers about service areas, free estimates, storm claim support, warranties, financing, and commercial roofing from BigBoss Roofing LLC in DFW. |
| service-areas.html | `/service-areas` | DFW Service Areas \| BigBoss Roofing LLC | BigBoss Roofing LLC serves Dallas, Fort Worth, Arlington, Irving, Garland, Plano, Grand Prairie, and the surrounding DFW metroplex. Call to confirm coverage. |
| contact.html | `/contact` | Contact BigBoss Roofing LLC \| DFW Roofing | Call, text, or email BigBoss Roofing LLC for roof inspections, repairs, storm claims, and free estimates across the Dallas-Fort Worth area. |
| estimate.html | `/estimate-request` | Request a Free Roofing Estimate \| BigBoss Roofing LLC | Get a free, no-obligation roof estimate from BigBoss Roofing LLC. Tell us about your project and we'll follow up fast, serving all of DFW. |
| referral.html | *(not in original nav — set a slug, e.g. `/referral`)* | Referral Program \| BigBoss Roofing LLC | Refer a friend to BigBoss Roofing LLC and get $250 when their roof is complete. No limit on referrals — refer as many neighbors as you like. |

## referral.html — bonus page, fixed from a draft
This page wasn't part of the original 9. It was submitted separately as a draft and had three real
bugs, found by actually loading it in a headless browser and testing it (not just reading the code):
1. **The lead form didn't submit anywhere.** It validated fields and showed a fake "Referral
   received!" success message, but no email, webhook, or form backend ever received the data — every
   submission would have been silently lost. Fixed the same way as `estimate.html`: on submit it now
   builds a `mailto:info@bigbossroofing.com` link with the referrer's and friend's info and hands off
   to the visitor's email client, then shows the success state.
2. **The header nav vanished completely on mobile** (`header nav{display:none!important}` below
   900px) with no hamburger menu to replace it — confirmed via computed style at 375px and 414px.
   Resolved by removing the custom header entirely and switching this page to the same
   Squarespace-native-header pattern as the other 9 pages, so there's no custom nav to break.
3. **A literal broken markdown link** — `[www.bigbossroofing.com](https://www.bigbossroofing.com)` —
   was rendering as visible text in the "Refer in 30 seconds" sidebar instead of a clean link. Fixed
   to plain "bigbossroofing.com" text (the real `<a href>` was already correct, only the visible text
   was broken).

The footer's legal disclaimer ("Referral reward is paid after the referred project is completed and
paid in full...") was page-specific fine print, not generic site chrome, so it was preserved and
moved into its own small section at the end of the content rather than deleted along with the rest
of the footer.

## Optional cleanup (not required, but recommended)
Every fragment currently loads the same Google Fonts (`Saira Condensed`, `Archivo`) itself. If all
9 pages are live at once, it's more efficient to add those 3 `<link>` tags **once** in
**Settings → Advanced → Code Injection → Header** (site-wide) and delete them from each fragment
instead of loading the same fonts 9 times.
