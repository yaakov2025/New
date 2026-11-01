# iOS / Android and 3D: preparation notes

Status: **not implemented**. No mobile or 3D feature exists yet.

What is already set up for mobile:

- **One backend.** Mobile apps call the same `/api/*` endpoints (see `API.md`). The server key
  stays on the server. Mobile apps only need an app-restricted Maps SDK key
  (iOS bundle ID / Android package + SHA-1).
- **Portable logic.** `shared/measure.ts` and `shared/materials.ts` have no browser or Node
  dependencies. Port them to Swift/Kotlin, or run them on the server, so every client
  produces identical numbers. `tests/measure.test.ts` holds reference values to check a port against.
- **Plain geometry.** Facets, edges and penetrations are stored as lat/lng arrays, which render
  directly as `GMSPolygon`/`GMSPolyline` (iOS) and `Polygon`/`Polyline` (Android).

Before shipping mobile: add authentication, then build a map editor per platform
(tap to add vertex, drag handles, same snapping tolerance in screen points).

3D (Maps 3D SDK / photorealistic tiles) is planned as a *viewing* aid only. Any 3D-derived
measurement needs its own accuracy tests against traced or field-measured values
before it is shown.
