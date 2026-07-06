# ADR 0003 — Light device support (data model, API, control actions)

- **Status:** Proposed (implementation to be split across Backend and Frontend
  agents)
- **Date:** 2026-07-06
- **Context:** ADR 0001 defines the generic `Device` model and the read-only
  `GET /devices` listing endpoint; it explicitly deferred "device command/
  control endpoints" as a non-goal. ADR 0002 built the frontend read-only list
  view on top of that. This ADR introduces the first real device type with
  actual control: **light** — on/off and dimming, sent from the dashboard to
  the physical device. It defines the light-specific data shape and the
  mutation endpoints needed to act on a light, without redefining `GET
  /devices` (ADR 0001/0002 remain the source of truth for listing).
- **Relationship to ADR 0001/0002:** this document does not change the
  `Device` collection shape, the `GET /devices` contract, or the frontend list
  view. It **adds**: (a) a documented, validated shape for `capabilities` when
  `type === 'light'` (previously an untyped `Record<string, unknown>` bag),
  and (b) new mutation endpoints scoped to light devices. Any conflict between
  this document and the real implementation must be resolved in favor of the
  actual code and flagged back to the architect.

## 1. Goals and non-goals

**Goals**
- Define a minimal, realistic capability shape for `type: 'light'`: on/off
  power state, and optional dimming (brightness). Justify anything beyond
  that before adding it.
- Define REST endpoint(s) to send a control command to a specific light
  device (turn on/off, set brightness), and specify how the command changes
  `capabilities` and `updatedAt`.
- Define what the frontend can invoke, and how a control action maps to an
  HTTP call and to a UI state change (optimistic vs. server-confirmed).
- Stay consistent with existing layering conventions (domain / application /
  infrastructure, ports, DTOs with `fromDomain`, class-validator query/body
  DTOs) as seen in `backend/src/devices/**`.

**Non-goals (out of scope for this iteration)**
- **No color temperature or RGB color.** Nothing in the current project scope
  (a dashboard for controlling household devices, not a lighting-design tool)
  justifies it yet, and no target hardware/integration has been named that
  requires it. Adding it now would be speculative complexity. If a real light
  integration needs it later, extend `LightCapabilities` with an optional
  `colorTemperature`/`color` field in a follow-up ADR — additive, non-breaking.
- **No scenes, schedules, groups, or automations** ("turn off all lights",
  "dim at sunset"). Single-device, single-action control only.
- **No real-time push of state changes** (no WebSocket/SSE). The frontend
  learns the new state from the HTTP response of its own command, or from the
  next `GET /devices` poll/reload — consistent with ADR 0001/0002's "no
  real-time updates" non-goal. If two dashboard tabs are open, one may show
  stale state until it refetches; acceptable for v1 on a single-household LAN
  dashboard.
- **No physical protocol integration in this ADR.** How a command actually
  reaches a Zigbee/MQTT/Wi-Fi bulb is out of scope here; this ADR only
  specifies the REST contract and how it updates the `devices` collection.
  The actual adapter that talks to hardware is a separate concern (see Risks,
  item 1) — for v1, the command handler updates MongoDB directly, as if the
  command always succeeds against the physical device. This is a deliberate,
  explicitly-flagged simplification (see Risks).
- **No authentication/authorization on control endpoints.** Matches the rest
  of the current backend (no auth exists anywhere yet); flagged as a
  pre-existing risk, not introduced or worsened by this ADR.
- **No optimistic concurrency control** (e.g. `If-Match`/version field) for
  concurrent commands on the same device. Last write wins. Acceptable given
  single-user/household LAN scale and no multi-writer contention expected.

## 2. Data model

### 2.1 `LightCapabilities` (new, documented shape of `capabilities` when `type: 'light'`)

Extends the existing free-form `capabilities: Record<string, unknown>` field
on `Device` (ADR 0001) — the field itself is not renamed or restructured.
This ADR documents and validates its shape specifically for lights; other
device types are untouched.

```ts
interface LightCapabilities {
  power: 'on' | 'off';
  brightness?: number; // 0-100, percentage. Present only if the light is dimmable.
}
```

Rationale for the two fields:
- `power`: every light, dimmable or not, has an on/off state. Mandatory.
- `brightness`: optional, because not every light is dimmable (a simple
  on/off bulb/relay has no brightness). When present, it is a `0-100`
  integer percentage — not raw driver units (e.g. Zigbee's 0-254) — so the
  frontend and API never need to know about a specific protocol's scale.
  Conversion to/from a device's native brightness range is the responsibility
  of whatever hardware adapter exists in the future (out of scope here, see
  section 1); for v1 the command handler stores the percentage as-is.

Not included, and why:
- `colorTemperature` / `color` (RGB or HSB): no current requirement, no
  target hardware named that needs it (see non-goals).
- `transitionDuration` (fade time): a real feature of some smart bulbs, but
  adds a parameter with no consumer yet (no scheduling/scenes). Add later if
  a concrete need appears.

### 2.2 Validation rule tying `brightness` to `power`

- `brightness` may be present when `power` is `'off'` (it represents "the
  brightness it will resume at when turned on", which is how most dimmable
  bulbs behave) — so no rule forbidding that combination.
- If `brightness` is provided in a command while the light has no prior
  `brightness` field at all, it simply gets added — a device's dimmability
  is inferred from whether the field is ever set for it, not from a separate
  flag. This is a pragmatic v1 shortcut (see Risks, item 2) — a small,
  explicit risk this ADR accepts rather than adding a `dimmable: boolean`
  field to the schema for one bit of information no endpoint currently needs
  to branch on.

### 2.3 No new MongoDB collection or schema field

`capabilities` stays `@Prop({ type: Object, required: true, default: {} })`
in `device.schema.ts` (ADR 0001) — untouched at the Mongoose level. This ADR
only adds:
- A TypeScript type (`LightCapabilities`) used by the application layer to
  read/write it in a typed way when `device.type === 'light'`.
- A class-validator DTO (`LightCommandDto`, section 3) to validate the
  **input** to the new control endpoint. The DTO is not the stored shape;
  the use case merges validated fields into the existing `capabilities`
  object before persisting.

## 3. API contract

### 3.1 New endpoint: send a control command to a light

```
PATCH /devices/:id/light-command
```

- Method: `PATCH` (partial update of device state) — not `PUT` (this is not a
  full resource replacement) and not `POST` (this is idempotent: sending the
  same command twice yields the same end state, unlike creating a new
  resource each time).
- Path param: `:id` — the device's Mongo `_id` (string form, same as
  `Device.id` everywhere else in the codebase).
- Scoped by URL to lights specifically (`light-command`, not a generic
  `/devices/:id/command`) to keep validation simple and type-specific per
  device type, matching the project's stated preference for small, explicit
  code over a generic/abstracted "any device, any command" mechanism at this
  stage. A generic command endpoint can be introduced later if/when a second
  controllable device type (e.g. `plug`) needs one and the duplication
  becomes real (see Risks, item 4).

**Request body** (`LightCommandDto`):

```json
{
  "power": "on",
  "brightness": 60
}
```

- Both fields optional, but **at least one must be present** — an empty body
  is a `400` (nothing to do is a client error, not a silent no-op).
- `power`: `'on' | 'off'`, optional.
- `brightness`: integer `0-100`, optional. Sending `brightness` alone (no
  `power`) is allowed and only changes brightness, leaving `power` as it was
  — matches how a physical dimmer often works (adjusting brightness while
  the light is already on) and keeps the two controls independently usable
  from the UI (see section 4).
- Validation (`class-validator`, same style as `ListDevicesQueryDto`):
  - `@IsOptional() @IsIn(['on', 'off']) power?: 'on' | 'off'`
  - `@IsOptional() @IsInt() @Min(0) @Max(100) brightness?: number`
  - A custom class-level check (or a small manual check in the controller/use
    case) rejects the request with `400` if both fields are `undefined`.

**Responses:**
- `200 OK` — command applied; body is the updated device, same
  `DeviceResponseDto` shape as `GET /devices` items (ADR 0001 section 5), so
  the frontend can reuse the existing `Device` model with no new response
  type:

```json
{
  "id": "665f1a2b8c9d4e0012a3b456",
  "name": "Living room lamp",
  "type": "light",
  "status": "online",
  "capabilities": { "power": "on", "brightness": 60 },
  "integration": {
    "protocol": "zigbee",
    "externalId": "0x00158d0004f2a1b3",
    "manufacturer": "IKEA"
  },
  "room": "living-room",
  "createdAt": "2026-06-01T10:15:00.000Z",
  "updatedAt": "2026-07-06T09:00:00.000Z"
}
```

- `400 Bad Request` — validation failure: empty body, invalid `power` value,
  `brightness` out of range/non-integer.
- `404 Not Found` — no device with this `id` exists.
- `409 Conflict` — device exists but `type !== 'light'` (e.g. calling this
  on a `sensor`). Rejecting by type, not silently ignoring, so a frontend bug
  (wrong id passed) fails loudly rather than corrupting an unrelated device's
  `capabilities`.
- `500 Internal Server Error` — unexpected error (e.g. DB unreachable).
- No `503`/device-unreachable-specific status in v1, because there is no real
  hardware round-trip yet (see section 1 non-goals) — `status` (connectivity)
  is not touched by this endpoint at all; it remains whatever the (not yet
  built) connectivity-monitoring mechanism last set it to.

### 3.2 No new read endpoint

`GET /devices?type=light` (already possible via ADR 0001's `type` filter) is
sufficient to list lights. No `GET /devices/:id` single-device read endpoint
exists yet and none is required to display the updated state after a
command, since section 3.1's `200` response already returns the full updated
device — the frontend does not need a separate fetch after a successful
command.

## 4. Control actions (frontend)

Two user-facing actions on a light's list item, both mapping to the same
endpoint with different bodies:

| UI action | Trigger | Request body | Notes |
|---|---|---|---|
| Toggle power | Tap/click a power on/off control on the light's list item | `{ "power": "on" }` or `{ "power": "off" }` | Only shown for `device.type === 'light'`. |
| Adjust brightness | Drag/set a brightness slider (only rendered if `capabilities.brightness` is already present on the device, i.e. the light is known to be dimmable) | `{ "brightness": <0-100> }` | Slider hidden entirely for a light with no `brightness` field — never rendered with a guessed/default value. |

- Both actions call one new `DeviceService` method, e.g.
  `sendLightCommand(id: string, command: LightCommandInput): Observable<Device>`,
  `PATCH`ing `${apiBaseUrl}/devices/${id}/light-command`. Reuses the existing
  `Device` model as the return type (section 3.1) — no new response type
  needed in the frontend.
- **No optimistic UI update.** Given no real-time channel and the small
  scale of the dashboard, the simplest correct behavior is: disable the
  control while the request is in flight, replace the item's device data
  with the response body on success, revert to the pre-command value and
  show an inline error on failure. Optimistic updates would require reverting
  logic on error for marginal perceived-latency benefit on a LAN — not
  justified for v1 (Pi-friendly: less client-side state to manage).
- Brightness slider should debounce/commit on release (or on a short idle
  timeout), not fire one request per intermediate drag value — avoids
  flooding the Pi-hosted API (and, eventually, the physical device) with
  requests. Exact debounce mechanism left to Frontend, but it must not send
  a request per pixel of drag movement.
- `DeviceListItem` stays presentational per ADR 0002; the command-sending
  responsibility (calling `DeviceService`, handling loading/error) belongs in
  the parent `DeviceList` (or a new light-specific container if the item
  grows complex — Frontend's call, but keep `DeviceListItem` free of
  `HttpClient`/service injection, consistent with ADR 0002 section 5.2).

## 5. Backend component breakdown

Following the existing `devices` module's domain / application /
infrastructure layering:

- `backend/src/devices/domain/light-capabilities.ts` (new) — the
  `LightCapabilities` interface (section 2.1). Pure type, no framework
  dependency, sibling of `domain/device.ts`.
- `backend/src/devices/application/dto/light-command.dto.ts` (new) —
  `LightCommandDto` with `class-validator` decorators (section 3.1) plus the
  "at least one field present" check.
- `backend/src/devices/application/send-light-command.use-case.ts` (new) —
  orchestrates: load device by id via the repository port, verify
  `type === 'light'` (else throw a domain error mapped to `409` by the
  controller), merge the validated command fields into `capabilities`,
  persist, return the updated `Device`.
- `backend/src/devices/application/ports/device-repository.port.ts`
  (modified) — add the two methods the use case needs:
  - `findById(id: string): Promise<Device | null>`
  - `updateCapabilities(id: string, capabilities: Record<string, unknown>): Promise<Device>`

  (Kept as two small, explicit methods rather than one generic
  `update(id, partial)` — mirrors the existing port's preference for
  narrow, purpose-named methods like `findPaginated` over a generic query
  builder.)
- `backend/src/devices/infrastructure/mongo-device-repository.adapter.ts`
  (modified) — implement the two new port methods (`findById` via
  `findById().lean()`; `updateCapabilities` via `findByIdAndUpdate` with
  `{ $set: { capabilities } }` and `{ new: true }` to get the post-update
  document back in one round trip).
- `backend/src/devices/infrastructure/devices.controller.ts` (modified) —
  add the `PATCH :id/light-command` handler; map "not found" → `404`,
  "wrong type" → `409`, validation errors are already turned into `400` by
  Nest's global `ValidationPipe` (confirm one is registered — see Risks,
  item 3).
- No change to `device.schema.ts`, `device-response.dto.ts`, or
  `list-devices.use-case.ts` — the read path is untouched.

## 6. Raspberry Pi / simplicity constraints

- **Single `findByIdAndUpdate` call, no read-then-write race window beyond
  what's unavoidable.** The use case does one `findById` (to check `type`)
  and one `updateCapabilities` (to persist) — two round trips, not more.
  Acceptable at this scale; do not add transactions/sessions for a
  single-document update (MongoDB single-document writes are already
  atomic).
- **No request queue/rate-limiting layer** for command endpoints in v1 — the
  debounced frontend slider (section 4) is the only guard against request
  floods. If multiple browser tabs/users send conflicting commands rapidly,
  last-write-wins (see non-goals) is accepted as simple and cheap.
- **Keep `LightCommandDto` validation synchronous and cheap** (`class-validator`
  decorators only, no async validators hitting the DB) — consistent with
  `ListDevicesQueryDto`.
- **No new dependencies.** Everything here is expressible with the
  `class-validator`/`class-transformer`/`@nestjs/mongoose` stack already in
  `package.json` — no new npm package needed for this feature.

## 7. Risks / open questions

1. **No physical adapter exists.** This ADR's endpoint updates MongoDB as the
   source of truth for "what the light should be doing," but nothing yet
   pushes that command to real hardware (Zigbee/MQTT/etc.), and nothing
   confirms the physical device actually changed state. This is a
   significant, explicitly-flagged gap: v1 of this feature is effectively a
   "the dashboard remembers what it told the light to do," not a verified
   round-trip. A future ADR must define the hardware-integration adapter
   (likely an async job/queue consuming command events) before this is a
   real smart-home control feature rather than a state-tracking UI.
2. **Dimmability inferred from field presence, not a explicit flag.** A light
   that has never received a `brightness` value is indistinguishable from a
   non-dimmable light until the first `brightness` command arrives — at
   which point the frontend slider would suddenly appear on next reload.
   Accepted as a v1 shortcut (section 2.2); revisit if this proves confusing,
   by adding an explicit `dimmable: boolean` alongside `integration` if a
   real integration needs to declare it upfront (e.g. from device discovery
   metadata) rather than inferring it.
3. **Global `ValidationPipe` registration must be confirmed.** `main.ts`
   should be checked for `app.useGlobalPipes(new ValidationPipe(...))`;
   `ListDevicesQueryDto` decorators only work if it's registered. If missing,
   this is a pre-existing gap (not introduced here) that must be fixed as a
   prerequisite, same category of risk as ADR 0002's "router not configured
   yet" finding.
4. **Type-specific endpoint (`light-command`) vs. a generic command
   endpoint.** Chosen deliberately for v1 simplicity and type safety (section
   3.1), but if `plug` (also on/off-controllable) is added next, we will have
   two near-identical endpoints (`light-command`, `plug-command`). Acceptable
   duplication for two types; if a third controllable type appears, revisit
   with a generic `PATCH /devices/:id/command` + discriminated body ADR
   rather than continuing to duplicate.
5. **`409` for wrong-type command is a judgment call.** Alternatives
   considered: `400` (treat as a bad request) or silently no-op. `409`
   (Conflict) was chosen because the resource exists but the request
   conflicts with its current state (its `type`) — closest standard HTTP
   semantics available; flagging in case Backend/reviewers prefer `400` for
   simplicity/consistency with other validation errors.
6. **No audit/history of commands sent.** Only the current `capabilities`
   state is stored; no log of "who/when/what command" is kept. Fine for a
   single-household dashboard with no auth (nothing to attribute a command
   to yet); would need revisiting if multi-user attribution ever matters.

## 8. Checklist — Backend

- [ ] Add `domain/light-capabilities.ts` with the `LightCapabilities` type
      exactly as specified in section 2.1 — do not add `colorTemperature`,
      `color`, or `transitionDuration` without a follow-up ADR.
- [ ] Add `application/dto/light-command.dto.ts` (`LightCommandDto`) with
      `power`/`brightness` both optional but validated, plus a check
      rejecting an empty body with `400`.
- [ ] Add `findById` and `updateCapabilities` to `DeviceRepositoryPort` and
      implement both in `MongoDeviceRepositoryAdapter` (section 5) — keep
      them as two narrow methods, not one generic `update`.
- [ ] Add `application/send-light-command.use-case.ts`: load by id, `404` if
      missing, `409` if `type !== 'light'`, merge fields into `capabilities`,
      persist, return updated `Device`.
- [ ] Add `PATCH /devices/:id/light-command` to `devices.controller.ts`,
      returning `DeviceResponseDto.fromDomain(...)` — reuse the existing DTO,
      do not create a new response shape.
- [ ] Confirm (or add) a global `ValidationPipe` in `main.ts` (Risks, item 3)
      before relying on `LightCommandDto` decorators to produce `400`s.
- [ ] Do not touch `status` (connectivity) in this endpoint — only
      `capabilities` and the Mongoose-managed `updatedAt` change.
- [ ] Do not modify `device.schema.ts`, `GET /devices`, or
      `list-devices.use-case.ts` — this feature is additive only.
- [ ] Write unit tests for the use case (`404`, `409`, success/merge
      behavior) and a controller test, following the existing
      `list-devices.use-case.spec.ts` / `devices.controller.spec.ts` patterns.
- [ ] Run `npm run lint` and `npm test` in `backend/` before considering the
      feature done.

## 9. Checklist — Frontend

- [ ] Add a `sendLightCommand(id: string, command: { power?: 'on' | 'off';
      brightness?: number }): Observable<Device>` method to `DeviceService`,
      `PATCH`ing `/devices/:id/light-command`, returning the existing
      `Device` model — no new response type needed.
- [ ] Add a power on/off control and a conditionally-rendered brightness
      slider to the light rendering path (currently the `switch
      (device().type)` capability summary in `DeviceListItem`, per ADR 0002
      section 5.2) — but move the actual command-sending/loading/error
      handling up to `DeviceList` (or a dedicated container), keeping
      `DeviceListItem` presentational per ADR 0002.
- [ ] Brightness slider must only render if `capabilities.brightness` is
      already present on the device (section 4) — never default/guess a
      value for a light that has never reported one.
- [ ] Debounce/commit-on-release the brightness slider — never send one
      request per intermediate drag value (section 4, section 6).
- [ ] No optimistic update: disable the control while in flight, apply the
      server response on success, revert and show an inline error on
      failure.
- [ ] Handle `404`/`409`/`400`/`500` from the command endpoint as a generic
      inline error on the affected list item — do not crash the whole list
      view for a single failed command.
- [ ] Write a `.spec.ts` for the new service method using
      `HttpTestingController`, following `device.service.spec.ts`'s existing
      pattern.
- [ ] Run `npm run lint` and `npm test` in `frontend/` before considering the
      feature done.
