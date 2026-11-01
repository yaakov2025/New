# REST API (contract for web, iOS, Android)

All Google calls happen on the server. Clients only call these endpoints.
Types are in `shared/types.ts`.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/config` | | `{ browserKey, mapId, serverKeyConfigured, sharedKeyWarning }` |
| GET | `/api/usage` | | today's Google call counts and caps |
| GET | `/api/properties` | | `{ properties: PropertyRecord[] }` |
| GET | `/api/properties/:id` | | `{ property }` |
| DELETE | `/api/properties/:id` | | `{ deleted }` |
| POST | `/api/property/measure` | `{ address }` or `{ placeId }`, optional `forceRefresh` | `{ property }`: 201 new, 200 updated. 422 if the address cannot be located (body has `diagnostics`) |
| PUT | `/api/properties/:id/takeoff` | `Takeoff` | `{ property }`. Input is validated, malformed geometry is dropped, `verified` is cleared |
| POST | `/api/properties/:id/verify` | | `{ property, checks }` or 409 with failing `checks` |

`property.solarStatus.state` is one of `OK`, `NO_COVERAGE`, `KEY_BLOCKED`,
`API_DISABLED`, `QUOTA`, `ERROR`, `NOT_REQUESTED`, `EXPIRED`, with a `message` and an optional `fix`.
