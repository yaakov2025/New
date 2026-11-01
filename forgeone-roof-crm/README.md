# ForgeOne Roof Measure (development prototype)

Look up a US address, pull Google Solar roof data when Google has it, and trace a
contractor-grade takeoff (facets, pitches, eaves, rakes, ridges, hips, valleys,
flashing, penetrations, existing solar) on satellite imagery. Every number is
labelled with where it came from.

This is a standalone prototype. It does not connect to the live ForgeOne CRM or
any production database. Data is kept in `data/store.json`.

## Preview it in your browser (no install)

1. On GitHub, open the repo and switch to this branch.
2. Click **Code → Codespaces → Create codespace on this branch**.
3. Wait about 2 minutes. The app starts on its own and opens in a new tab. If it doesn't, open the **Ports** tab and click the globe next to port 3000.
4. Paste your Google API key on the first screen.

If your browser key has HTTP-referrer restrictions, add `https://*.app.github.dev/*` to them, or the map won't load.

## Run it

```bash
npm install
npm run dev               # open http://localhost:3000
```

On first launch the app asks for your Google Maps API key. Paste it once and it is
saved to the local `.env` file, which git ignores. To change the key later, edit `.env`.
Advanced: split it into `GOOGLE_MAPS_SERVER_KEY` and `GOOGLE_MAPS_BROWSER_KEY`, as shown in `.env.example`.

Production build: `npm run build && npm start`. Tests: `npm test`. Types: `npm run typecheck`.

## Google Cloud setup (project 31967172109)

Enabling an API is not enough. The **API key's own restrictions** must also allow it.
A key with a restriction list that leaves out Solar returns
`403 PERMISSION_DENIED · API_KEY_SERVICE_BLOCKED`, even when Solar API is enabled
on the project. That is the exact error the current key returns for Solar and Address Validation.

Fix (Cloud Console → APIs & Services → Credentials):

1. **Server key** (`GOOGLE_MAPS_SERVER_KEY`): API restrictions → tick
   *Geocoding API*, *Address Validation API*, *Solar API*. When you deploy, add an
   IP application restriction for the server.
2. **Browser key** (`GOOGLE_MAPS_BROWSER_KEY`): API restrictions → *Maps JavaScript API*,
   *Places API (New)*. Application restriction → HTTP referrers (`http://localhost:3000/*`,
   your domain).
3. Save. Changes take a few minutes. Then click **Refresh Google data** on a property.

The Maps JavaScript SDK has to load with a key in the browser. That is why there is a
separate, referrer-restricted browser key. The server key is never sent to the
browser, never put in URLs that get logged, and is redacted from every error message.

## Keeping Google usage low

- Each address lookup makes at most: 1 Address Validation call (text input only, can be turned off with
  `USE_ADDRESS_VALIDATION=false`), 1 Geocoding call, and 1–2 Solar `buildingInsights` calls
  (MEDIUM, then BASE only if Google returns 404).
- If a property with cached Solar data (<30 days) is looked up again, Solar is **not** called again.
- `dataLayers` (GeoTIFF rasters) are not requested.
- Daily caps enforced by the app (`DAILY_LIMIT_*` in `.env`, defaults 20 Solar / 100 Geocode /
  50 Address Validation). The header shows today's counts. Your Google budget alert is
  separate and is not a hard cap.

## What comes from where

| Measurement | Source | Label |
|---|---|---|
| Address, Place ID, coordinates | Geocoding `formatted_address`, `place_id`, `geometry.location` | GOOGLE |
| Whole-roof area / ground area | Solar `solarPotential.wholeRoofStats.areaMeters2` / `groundAreaMeters2` | GOOGLE |
| Segment pitch, azimuth, area | Solar `roofSegmentStats[].pitchDegrees`, `azimuthDegrees`, `stats.areaMeters2` | GOOGLE |
| Pitch as x/12, m² → ft² | `12·tan(pitchDegrees)`, `× 10.7639` | CALC |
| Facet areas, squares | Traced polygon plan area × √(1+(rise/12)²), WGS84 local projection | TRACED |
| Eave/rake/ridge/hip/valley/flashing lengths | Traced lines | TRACED |
| Penetrations, existing solar | Marked by the user | TRACED |
| Roof edge lines, plane outlines | Google Solar does not provide these | N/A |

Google's segment `boundingBox` is drawn as a dashed rectangle **for reference only**.
It is never used as a plane outline. When a traced facet's centre falls inside a
segment's box, the facet is offered that segment's Google pitch (labelled CALC).

If something is missing, the UI shows **"Not available — requires additional analysis"**.
Nothing is filled in with defaults.

### Verified

"Verified" appears only after a person clicks *Mark takeoff verified* and these
required checks pass: at least one facet, every facet has a pitch, no self-intersecting facets,
eaves traced, existing-solar answered yes/no. Two warnings are shown but don't block:
no ridges or hips, and traced area more than ±10% from Google's whole-roof area. Any edit clears verification.

## Other features

- **USA overview** (header button): every saved assessment as a pin, coloured by status. Click a pin to open it.
- **Branches**: tag each property with a branch, filter the list by branch, and set a default branch for new lookups.
- **Map views**: Satellite, Satellite + labels, Road map. Plus an on-map legend; click an entry to show or hide that layer.
- **Existing solar**: yes/no, panel count, system kW, inverter type, install year, reroof condition (good / repair / detach & reset / decommission), notes, and which facets carry panels.
- **Materials**: asphalt shingle, standing-seam metal, concrete/clay tile, TPO membrane. Waste factor and editable unit prices. Quantities come only from traced measurements.
- **Compliance** (header button): what is stored and for how long, plus Google terms and cost notes.

## Map editor

| Key | Tool |
|---|---|
| V | Select / edit: drag white handles to move corners, drag a midpoint to add one, right-click a corner to delete it |
| F | Draw facet: click corners, click the first corner / double-click / Enter to close |
| E | Draw edge: pick a type, click along the line (each click adds a segment), Esc or click the last point to stop |
| P | Mark penetration |
| M | Measure distance (not saved) |
| Del / Backspace | Delete selected item (or last draft point) |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |

Corners snap to existing corners within 12 px so shared hips and valleys line up.
Edits autosave. Accuracy check: traced lengths match `google.maps.geometry.spherical`
to within 0.1%.

## Caching rules (Google Maps Platform terms)

- **Place ID**: stored indefinitely.
- **Geocoded coordinates**: deleted 30 days after they were fetched. Expiry is checked on start-up, hourly, and on list.
- **Solar building insights**: also deleted after 30 days. The property then shows *Solar cache expired*.
- **Map tiles / imagery / Street View**: never fetched or stored by the server. The browser renders them directly.

## Not built yet (honest list)

- Automatic roof outline / edge detection (would need Solar `dataLayers` mask + DSM processing).
- 3D view and 3D measurement. The native 3D SDKs are enabled, but nothing here uses them yet.
- iOS / Android apps. See `docs/MOBILE.md`.
- Multi-user auth and multi-tenant isolation. Required before anything goes to production.
