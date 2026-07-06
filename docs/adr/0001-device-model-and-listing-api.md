# ADR 0001 — Device data model and GET /devices listing API

- **Status:** Accepted (implementation to be done by a separate agent later)
- **Date:** 2026-07-05
- **Context:** Home Hub is at the learning-plan stage. No `device` model exists yet
  in the backend (`backend/src`) or database. This ADR defines the first generic
  device schema and the read-only listing endpoint, to be validated before any
  NestJS/Mongoose code is written.

## 1. Goals and non-goals

**Goals**
- One generic MongoDB document shape that can represent a lamp, a smart plug, a
  sensor, or a thermostat without a schema change per device type.
- A simple, cheap-to-run `GET /devices` endpoint (pagination + basic filtering)
  suitable for a Raspberry Pi (limited CPU/RAM, slow storage).

**Non-goals (deliberately out of scope for now)**
- No device command/control endpoints (`PATCH /devices/:id/state`, actuation,
  etc.) — this ADR only covers the read model and the list endpoint.
- No per-protocol adapter design (Zigbee, MQTT, Wi-Fi, Matter...) — only a
  minimal `integration` metadata block to identify how a device is reached.
- No historical data / time-series (e.g. sensor readings over time). If needed
  later, that belongs in a separate collection, not in the `Device` document.
- No auth/roles model — assumed out of scope until a dedicated ADR.
- No real-time push (WebSocket/SSE) for state changes — plain REST polling for
  now, matches the "keep it simple" constraint.

## 2. Assumptions

- Single-home, single-tenant deployment (no multi-household concept yet).
- One MongoDB instance running locally on the same Raspberry Pi as the backend
  (or a lightweight external Mongo). No sharding/replica-set design needed.
- Device count is expected to stay small (tens to low hundreds), not thousands.
  This justifies simple `skip/limit` pagination over cursor-based pagination.
- `capabilities`/`state` are read as an opaque, per-type bag of key/value pairs
  rather than a strongly-typed field per device category, to avoid schema
  proliferation. Validation of that bag's shape can be enforced at the
  application layer per `type` later if needed, not at the DB layer now.
- The existing backend (`backend/src/health`) already follows a light
  hexagonal layout (`domain` / `application` / `infrastructure`, with ports and
  use-cases). This ADR assumes the `devices` feature will follow the same
  layout for consistency, even though this document focuses on the data/API
  contract rather than internal file structure.

## 3. Raspberry Pi constraints — how this design responds to them

| Constraint | Design response |
|---|---|
| Limited RAM | No heavy ORM features (no eager population/joins — single collection, no `$lookup` needed for listing). Mongoose `.lean()` reads recommended for the list endpoint to skip hydration overhead. |
| Limited CPU | Pagination is mandatory (`limit` capped server-side) to avoid large in-memory sorts/serializations. Avoid regex-heavy free-text search in v1; only exact-match filters indexed in MongoDB. |
| Slow storage | Keep documents small (no embedded history/logs in `Device`). Index only the fields actually filtered/sorted on (`type`, `status`, `name`) to limit index-write overhead on every device update. |
| Simplicity / low maintenance | One collection, no polymorphic Mongoose discriminators for v1 (would add complexity); `capabilities` as a loosely-typed object is enough at this stage. |

## 4. Device document schema (MongoDB / Mongoose)

Collection: `devices`

```ts
// Conceptual shape — not implementation code.
// Field names/comments in English per project convention.

interface Device {
  _id: ObjectId;                // MongoDB native id, exposed to clients as string `id`

  name: string;                 // user-facing label, e.g. "Living room lamp"
  type: DeviceType;             // device category, drives UI rendering and capability shape
  status: DeviceStatus;         // connectivity/health status, distinct from on/off state

  capabilities: Record<string, unknown>;
  // Generic, per-type bag of current state/capabilities.
  // Examples (not enforced by the DB schema, documented per `type` at app level):
  //   type "light"     -> { power: "on" | "off", brightness: 0-100 }
  //   type "plug"      -> { power: "on" | "off" }
  //   type "sensor"    -> { temperature: 21.4, unit: "celsius" }
  //   type "thermostat"-> { targetTemperature: 20, mode: "heat" | "off" }
  // Kept as a free-form object on purpose: avoids one Mongoose sub-schema per
  // device type (over-engineering) while still being queryable if needed later.

  integration: {
    protocol: string;           // e.g. "zigbee", "mqtt", "http", "wifi-local"
    externalId: string;         // id/address on the source system (e.g. Zigbee IEEE addr, MQTT topic)
    manufacturer?: string;      // optional, e.g. "IKEA", "Shelly"
  };

  room?: string;                // optional free-text location, e.g. "living-room"

  createdAt: Date;              // set on creation (Mongoose timestamps)
  updatedAt: Date;              // set on every update (Mongoose timestamps)
}

type DeviceType = 'light' | 'plug' | 'sensor' | 'thermostat' | 'other';

type DeviceStatus = 'online' | 'offline' | 'unknown';
```

**Indexes**

- `{ type: 1 }` — supports filtering by category.
- `{ status: 1 }` — supports filtering by connectivity state.
- `{ name: 1 }` — supports alphabetical sort / basic prefix search.
- No compound/text index in v1 — added only if a real query pattern justifies
  the extra write cost on a resource-constrained device.

**Explicitly rejected for v1 (flagged as risk/complexity trade-off)**

- Mongoose discriminators per device type: would give per-type schema
  validation but adds conceptual overhead disproportionate to today's needs.
  Revisit only if `capabilities` misuse (wrong shape per type) becomes a real
  bug source.
- Separate `capabilities` collection: unnecessary indirection for a
  single-document-per-device read pattern.

## 5. REST API contract — `GET /devices`

### Request

```
GET /devices?page=1&limit=20&type=light&status=online&sort=name
```

| Query param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | integer ≥ 1 | no | `1` | 1-based page index |
| `limit` | integer, 1–100 | no | `20` | Server caps at 100 regardless of client value, to protect CPU/RAM |
| `type` | `DeviceType` | no | — | Exact match filter |
| `status` | `DeviceStatus` | no | — | Exact match filter |
| `room` | string | no | — | Exact match filter |
| `sort` | `name` \| `-name` \| `createdAt` \| `-createdAt` | no | `name` | Whitelisted values only; anything else → `400` |

Rejected on purpose for v1: free-text `q` search param (would require a text
index — extra write-time cost — and relevance scoring, disproportionate to
current needs).

### DTOs (conceptual, not implementation)

```ts
// Query DTO
class ListDevicesQueryDto {
  page?: number;      // validated as int, min 1
  limit?: number;      // validated as int, min 1, max 100
  type?: DeviceType;
  status?: DeviceStatus;
  room?: string;
  sort?: 'name' | '-name' | 'createdAt' | '-createdAt';
}

// Response item DTO — mirrors Device, with _id mapped to string `id`
class DeviceResponseDto {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: Record<string, unknown>;
  integration: {
    protocol: string;
    externalId: string;
    manufacturer?: string;
  };
  room?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Envelope DTO
class PaginatedDevicesResponseDto {
  data: DeviceResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;      // total matching documents (post-filter)
    totalPages: number;
  };
}
```

### Success response — `200 OK`

```json
{
  "data": [
    {
      "id": "665f1a2b8c9d4e0012a3b456",
      "name": "Living room lamp",
      "type": "light",
      "status": "online",
      "capabilities": { "power": "on", "brightness": 80 },
      "integration": {
        "protocol": "zigbee",
        "externalId": "0x00158d0004f2a1b3",
        "manufacturer": "IKEA"
      },
      "room": "living-room",
      "createdAt": "2026-06-01T10:15:00.000Z",
      "updatedAt": "2026-07-04T18:42:11.000Z"
    },
    {
      "id": "665f1a2b8c9d4e0012a3b457",
      "name": "Kitchen temperature sensor",
      "type": "sensor",
      "status": "online",
      "capabilities": { "temperature": 21.4, "unit": "celsius" },
      "integration": {
        "protocol": "mqtt",
        "externalId": "home/kitchen/sensor1"
      },
      "room": "kitchen",
      "createdAt": "2026-06-02T09:00:00.000Z",
      "updatedAt": "2026-07-05T07:30:02.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### Error responses

| Status | When | Example body |
|---|---|---|
| `400 Bad Request` | Invalid query param (e.g. `page=0`, `limit=500`, unknown `sort` value, invalid `type`/`status` enum value) | `{ "statusCode": 400, "message": ["limit must not be greater than 100"], "error": "Bad Request" }` |
| `500 Internal Server Error` | Unexpected server/DB error (e.g. Mongo unreachable) | `{ "statusCode": 500, "message": "Internal server error", "error": "Internal Server Error" }` |

No `404` at the collection level (an empty result set is a valid `200` with
`data: []`, not an error).

### Non-functional notes for this endpoint

- Use `.lean()` on the Mongoose query (read-only, no need for hydrated
  documents/getters) to reduce CPU/memory overhead on the Pi.
- Run the `find()` and the `countDocuments()` for `meta.total` as two queries;
  do not use `$facet` aggregation for this simple case (aggregation pipelines
  cost more CPU than two indexed queries at this data volume).
- Response should stay flat and small; no nested population/joins.

## 6. Risks / open questions to flag before implementation

1. **`capabilities` typing safety** — being a free-form object, nothing stops
   a bad write from storing an inconsistent shape for a given `type`. Accepted
   trade-off for v1; if this becomes a recurring bug source, consider
   introducing per-type validation (e.g. `class-validator` groups or a
   discriminator) in a follow-up ADR — not now.
2. **`status` semantics** — need agreement that `status` reflects
   connectivity/reachability, not the on/off power state (that's inside
   `capabilities.power`). Must be documented clearly to avoid confusion in the
   frontend.
3. **No soft-delete / device removal contract yet** — this ADR only covers
   listing. Deletion/deactivation semantics (hard delete vs. `status:
   "offline"` vs. an `archived` flag) are undecided and should be a separate
   ADR before a `DELETE /devices/:id` is implemented.
4. **Timezone/formatting** — timestamps are ISO 8601 UTC; frontend is
   responsible for local formatting, backend does not localize.
5. **Index growth on constrained storage** — each new index has a write cost.
   The three proposed indexes are intentionally minimal; resist adding more
   without a concrete filtering/sorting need.

## 7. Checklist — Backend

- [ ] Follow the existing hexagonal layout used by the `health` module
      (`devices/domain`, `devices/application` with ports/use-cases,
      `devices/infrastructure` for the Mongoose schema/controller) for
      consistency with the current codebase.
- [ ] Create `Device` Mongoose schema exactly as specified in section 4 (no
      extra fields without updating this ADR first).
- [ ] Add indexes on `type`, `status`, `name` only.
- [ ] Implement `ListDevicesQueryDto` with `class-validator` decorators
      enforcing: `page` ≥ 1, `limit` between 1 and 100 (default 20), `type`/
      `status` restricted to the documented enums, `sort` restricted to the
      4 whitelisted values.
- [ ] Implement `GET /devices` returning `PaginatedDevicesResponseDto` exactly
      as shown in section 5 (including `meta` block).
- [ ] Use `.lean()` for the list query; use `countDocuments()` with the same
      filter for `meta.total`.
- [ ] Cap `limit` server-side at 100 even if a higher value is requested
      (do not silently accept it as valid — return `400` instead, per the
      DTO validation).
- [ ] Return `400` (not `500`) for all validation failures, using Nest's
      built-in `ValidationPipe`.
- [ ] No business logic for device control in this endpoint — read-only.
- [ ] Do not implement discriminators, text search, or history collections in
      this iteration — flag to the architect if a real need appears.

## 8. Checklist — Frontend

- [ ] Define a TypeScript `Device` interface/type in Angular mirroring
      `DeviceResponseDto` (section 5) — keep in sync manually until/unless a
      shared types package is introduced (not in scope now).
- [ ] Consume the `meta` block for pagination UI (page/limit/total/totalPages)
      rather than inferring pagination from `data.length`.
- [ ] Treat `status` as connectivity/reachability, and read on/off or other
      device state from `capabilities` (per `type`) — do not conflate the two
      in the UI.
- [ ] Render `capabilities` per `type` (e.g. a light shows brightness/power,
      a sensor shows a read-only measurement) rather than generically dumping
      the object — but do not hardcode assumptions about keys absent from
      this ADR without checking with backend first.
- [ ] Handle `400` responses (invalid filters) gracefully in the UI (e.g.
      reset to defaults) rather than crashing.
- [ ] Do not assume real-time updates — this is a polling/manual-refresh
      model in v1; no WebSocket subscription to build yet.
