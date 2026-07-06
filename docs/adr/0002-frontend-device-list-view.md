# ADR 0002 — Frontend device list view

- **Status:** Proposed (implementation to be done by Frontend agent)
- **Date:** 2026-07-06
- **Context:** ADR 0001 defines and the backend already implements a read-only
  `GET /devices` endpoint (pagination + basic filtering). Home Hub's Angular
  frontend currently only has a health-check page (`pages/home`). This ADR
  specs the first real feature view: a list of the household's devices.
- **Relationship to ADR 0001:** this document does **not** redefine or modify
  the API contract. It consumes `GET /devices` exactly as specified in ADR
  0001, section 5. Any discrepancy found between this document and the real
  backend response must be resolved in favor of the actual backend code
  (`backend/src/devices/**`), and flagged back to the architect.

## 1. Goals and non-goals

**Goals**
- Display the list of devices returned by `GET /devices`, one page at a time,
  using the backend's existing pagination (`page`, `limit`, `meta`).
- Handle all UI states explicitly: loading, error, empty, populated.
- Follow existing frontend conventions exactly (standalone components,
  signals, `inject()`, discriminated-union view state, `@switch` control flow,
  environment-based API base URL) as established in `pages/home` and
  `core/services/health.service.ts`.

**Non-goals (out of scope for this iteration)**
- No device control/actuation (matches ADR 0001 non-goals — backend is
  read-only).
- No client-side filtering UI (`type`/`status`/`room` query params) or sort
  picker in v1 — only straightforward pagination (Previous/Next). Filtering
  can be added later without breaking this design, since the service already
  accepts optional query params.
- No client-side full list caching/state management library (NgRx, Akita,
  etc.) — a single component-local signal is enough at this scale and stays
  consistent with `Home`'s pattern. Revisit only if device list state needs to
  be shared across multiple sibling views.
- No real-time updates (no WebSocket/SSE, no polling interval) — matches ADR
  0001 section 6, risk 5 / checklist item "no real-time updates assumed".
- No routing changes are specified here beyond adding one route — this ADR
  assumes `provideRouter` is not yet configured in `app.config.ts` (confirmed:
  it currently has no router provider) and flags that as a prerequisite (see
  Risks).

## 2. Backend endpoint summary (as already implemented — not redefined here)

Source of truth: `backend/src/devices/infrastructure/devices.controller.ts`,
`backend/src/devices/application/dto/*.ts` (matches ADR 0001 exactly).

```
GET /devices?page=1&limit=20&type=light&status=online&room=kitchen&sort=name
```

- Method: `GET` only (read-only, no mutation endpoints exist).
- All query params optional; server defaults: `page=1`, `limit=20`, `sort=name`.
- `limit` is capped server-side at 100; values above return `400`, not a
  silent clamp.
- Response body (`200 OK`):

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
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

- Empty result set: `200 OK` with `data: []` and `meta.total: 0` — **not** a
  `404`. The frontend must treat this as the "empty" state, not an error.
- Error responses: `400` (invalid query param — e.g. malformed `page`/`limit`
  sent by a bug in the frontend) and `500` (unexpected server error, e.g. DB
  unreachable). Both must be handled generically as the "error" UI state in
  v1 — no need to special-case `400` in the UI yet, since this view will not
  expose filter controls that could produce one (see non-goals). Still,
  the HTTP layer must not throw an uncaught error if it happens.
- `status` = connectivity/reachability (`online`/`offline`/`unknown`), not
  on/off power state. On/off (or other per-type state) lives in
  `capabilities` and must be rendered from there, per `type`. Do not conflate
  the two (ADR 0001, section 6, risk 2 — repeated here because it is the most
  likely UI bug).

## 3. Data model (TypeScript, frontend side)

New file: `frontend/src/app/core/models/device.ts`

Mirrors `DeviceResponseDto` / `PaginatedDevicesResponseDto` from the backend
manually (no shared types package exists yet — matches ADR 0001, frontend
checklist item 1). Conceptual shape (not implementation):

```ts
type DeviceType = 'light' | 'plug' | 'sensor' | 'thermostat' | 'other';
type DeviceStatus = 'online' | 'offline' | 'unknown';

interface DeviceIntegration {
  protocol: string;
  externalId: string;
  manufacturer?: string;
}

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  capabilities: Record<string, unknown>;
  integration: DeviceIntegration;
  room?: string;
  createdAt: string; // ISO 8601, kept as string — format for display in the template, not in the model
  updatedAt: string;
}

interface PaginatedDevicesMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedDevicesResponse {
  data: Device[];
  meta: PaginatedDevicesMeta;
}
```

Query params type, for the service method's parameter (all optional, mirrors
`ListDevicesQueryDto`):

```ts
interface ListDevicesParams {
  page?: number;
  limit?: number;
  type?: DeviceType;
  status?: DeviceStatus;
  room?: string;
  sort?: 'name' | '-name' | 'createdAt' | '-createdAt';
}
```

## 4. Angular service

New file: `frontend/src/app/core/services/device.service.ts` (sibling of
existing `health.service.ts`, same conventions: `@Injectable({ providedIn:
'root' })`, `HttpClient` via `inject()`, returns `Observable`, base URL from
`environment.apiBaseUrl`).

```ts
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);

  listDevices(params?: ListDevicesParams): Observable<PaginatedDevicesResponse> {
    // build HttpParams from the optional params object (omit undefined keys)
    // GET `${environment.apiBaseUrl}/devices`
  }
}
```

- Only one public method needed in v1: `listDevices`.
- Use Angular's `HttpParams` to build the query string; do not hand-build a
  query string (avoids encoding bugs).
- No retry/backoff logic — a failed request surfaces immediately as an error
  state; the user can navigate away/back or use a manual "Retry" action (see
  section 6). Keeps the service simple and cheap, per Pi constraints.
- Test file `device.service.spec.ts` following the exact pattern of
  `health.service.spec.ts` (`HttpTestingController`, `httpMock.expectOne(...)`,
  assert method + params, `flush(...)`).

## 5. Component breakdown

Two components, kept deliberately small and shallow (no third-party UI
library — plain semantic HTML/CSS, consistent with `home.html`/`home.css`).

### 5.1 `DeviceList` (container/page component)

- Path: `frontend/src/app/pages/device-list/device-list.ts` (+ `.html`, `.css`,
  `.spec.ts`), mirroring the `pages/home` folder pattern.
- Selector: `app-device-list`.
- Standalone component, `imports: [DeviceListItem]` (no `CommonModule`
  needed — new control-flow syntax `@if`/`@for`/`@switch` is already used in
  `home.html` and does not require importing anything).
- Responsibility: fetch the current page of devices via `DeviceService`, hold
  the view state, expose pagination actions (previous/next page), pass each
  `Device` down to `DeviceListItem`.
- No `@Input()`/`@Output()` — this is a routed page component, self-contained,
  same as `Home`.
- Internal state (signal-based, discriminated union — same pattern as
  `HealthViewState` in `home.ts`):

```ts
type DeviceListViewState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'success'; devices: Device[]; meta: PaginatedDevicesMeta };
```

- Current page number kept in its own `signal<number>(1)`, separate from the
  view-state union, so "go to next/previous page" can update it and
  re-trigger a fetch without re-deriving it from response state.
- Behavior:
  - On init (constructor, same pattern as `Home`) and whenever the page
    signal changes, call `deviceService.listDevices({ page, limit: 20 })`.
  - `next()` / `previous()` methods: guard against going below page 1 or
    beyond `meta.totalPages`; disable the corresponding button in the
    template rather than allowing an invalid request.
  - Map an empty `data: []` response (regardless of HTTP status — it's a
    `200`) to the `'empty'` state, not `'success'` with an empty array, so the
    template has one obvious branch for "no devices yet".
  - Map any HTTP error (`subscribe({ error: ... })`) to the `'error'` state,
    `console.error` the raw error (same pattern as `Home`), and offer a
    "Retry" button that re-issues the same request (re-set the page signal to
    its current value, or expose a small `retry()` method that re-runs the
    fetch).

### 5.2 `DeviceListItem` (presentational component)

- Path: `frontend/src/app/pages/device-list/device-list-item/device-list-item.ts`
  (+ `.html`, `.css`, `.spec.ts`).
- Selector: `app-device-list-item`.
- Standalone, no dependencies on the service — pure presentational component.
- `input.required<Device>()` (Angular's modern signal-based `input()`, since
  the project targets Angular 21) — no `@Output()` needed in v1 (no
  interaction, read-only display).
- Responsibility: render one device's name, room, connectivity `status` (as a
  simple colored badge/text — online/offline/unknown), and a **minimal,
  type-aware** summary of `capabilities`:
  - `light`/`plug` → show `capabilities.power` if present.
  - `sensor` → show `capabilities.temperature` + `capabilities.unit` if
    present.
  - `thermostat` → show `capabilities.targetTemperature` + `capabilities.mode`
    if present.
  - `other` / anything missing/unexpected → render nothing extra rather than
    dumping the raw object (per ADR 0001 frontend checklist item: no generic
    object dump, and no hardcoded assumptions beyond what's documented).
  - This mapping can be a small pure function/pipe-like helper method inside
    the component — not a generic "capability renderer" abstraction; keep it
    a simple `switch` on `device().type`. Avoid over-engineering given only 5
    known types.

## 6. State handling (template, `device-list.html`)

Same `@let` + `@switch` pattern as `home.html`:

```
@let currentState = state();
@switch (currentState.kind) {
  @case ('loading')  { loading indicator / skeleton text }
  @case ('error')    { error message + Retry button }
  @case ('empty')    { "No devices found." message }
  @case ('success')  {
    @for (device of currentState.devices; track device.id) {
      <app-device-list-item [device]="device" />
    }
    pagination controls (Previous / Next), using currentState.meta
  }
}
```

- `@for` tracked by `device.id` (stable Mongo id) — never track by index.
- Pagination controls only rendered in the `'success'` branch (they are
  meaningless in loading/error/empty states).
- "Previous" disabled when `meta.page <= 1`; "Next" disabled when
  `meta.page >= meta.totalPages`.

## 7. Routing

- **Prerequisite / risk:** `app.config.ts` currently has no `provideRouter(...)`
  and `App` hardcodes `<app-home />` in its template — there is no router at
  all yet. Introducing `DeviceList` as a *second* page requires adding
  `@angular/router` wiring first. This is a small but real prerequisite change
  outside this ADR's original scope; it must be called out explicitly to
  whoever implements this (see checklist).
- Minimal proposal (smallest change that keeps `Home` reachable too):
  - Add `provideRouter(routes)` to `app.config.ts`.
  - Add `frontend/src/app/app.routes.ts` with two routes: `''` → `Home`
    (or keep `Home` as-is and make `''` redirect to `/devices` — architect
    has no strong preference; Frontend agent should pick the simpler one and
    document the choice in the PR), and `'devices'` → `DeviceList`.
  - Replace `App`'s hardcoded `<app-home />` template with `<router-outlet />`.
- This routing change is a dependency of this feature, not a separate future
  ADR — flag it as a checklist item below rather than silently expanding
  scope elsewhere.

## 8. File layout summary

```
frontend/src/app/
  core/
    models/
      device.ts                          (new)
    services/
      device.service.ts                  (new)
      device.service.spec.ts             (new)
  pages/
    device-list/
      device-list.ts                     (new)
      device-list.html                   (new)
      device-list.css                    (new)
      device-list.spec.ts                (new)
      device-list-item/
        device-list-item.ts              (new)
        device-list-item.html            (new)
        device-list-item.css             (new)
        device-list-item.spec.ts         (new)
  app.routes.ts                          (new — see section 7)
  app.config.ts                          (modified — add provideRouter)
  app.ts                                 (modified — router-outlet)
```

## 9. Raspberry Pi / simplicity constraints

- **Pagination is mandatory in the UI, not just the API.** Never call
  `listDevices` with an unbounded `limit`; keep the default page size at 20
  (matches backend default) to bound both the DB query and the DOM node
  count rendered client-side.
- **No client-side sorting/filtering of the full dataset in memory.** All
  filtering/sorting must remain server-side query params if added later —
  never fetch all pages to filter/sort in the browser.
- **No heavy UI/component libraries** (Material, PrimeNG, etc.) for this
  view — plain HTML/CSS keeps bundle size and parse/CPU cost low on the Pi's
  own browser or on constrained client devices viewing the dashboard over
  LAN.
- **Avoid unnecessary change detection churn:** signals + `OnPush`-friendly
  standalone components (default in modern Angular CLI schematics) are
  sufficient; do not introduce `setInterval` polling for this view (no
  real-time requirement, per ADR 0001).
- **`.spec.ts` tests use `HttpTestingController`**, not a real backend call —
  keeps CI/dev-loop fast and avoids requiring MongoDB to run unit tests.
- **Keep `DeviceListItem` presentational and allocation-light** — no derived
  heavy computed state, just a small `switch` for the capability summary
  string.

## 10. Risks / open questions

1. **Router not yet configured** — see section 7. This is a real prerequisite
   and should not be silently bundled as an afterthought; Frontend should
   treat it as its own commit (`feat: add router and devices route`) before
   the list view commit, per the project's "one commit per validation point"
   convention.
2. **`capabilities` shape is backend-documented but not schema-enforced**
   (ADR 0001, risk 1). The per-type rendering in `DeviceListItem` must
   defensively check for field presence (`capabilities?.power`, etc.) rather
   than assume the field exists, since nothing guarantees it at the DB level.
3. **No visual design system exists yet** (only `home.css` ad hoc styles) —
   this ADR does not specify visual design, only structure/state/data. Visual
   consistency between `Home` and `DeviceList` is a Frontend/UX concern, not
   an architectural one, but flag if a shared stylesheet/design tokens file
   becomes worth introducing once a third page appears.
4. **Pagination UX for `total: 0`** — `totalPages` will be `0` when there are
   no devices at all; make sure the "Next" button guard (`page >=
   totalPages`) doesn't misfire before the `'empty'` state is even reached
   (the `'empty'` branch should intercept this case first and never render
   pagination controls at all).
5. **Manual type duplication risk** — the `Device`/`PaginatedDevicesResponse`
   TypeScript types in the frontend must be kept manually in sync with the
   backend DTOs (ADR 0001 already flags this). If backend's `DeviceType`
   enum changes, this frontend model silently goes stale (no build-time
   error) until a mismatched value renders as `'other'`-like fallback. Not
   solved here; a shared-types package would be a future ADR if this causes
   real bugs.

## 11. Checklist — Backend

- [ ] No backend changes required for this feature. If the Frontend agent
      finds the actual `GET /devices` response differs from ADR 0001/this
      document in any way, stop and flag the architect — do not let Frontend
      silently adapt to an undocumented backend behavior.

## 12. Checklist — Frontend

- [ ] Add `@angular/router`, `provideRouter` in `app.config.ts`, `app.routes.ts`,
      and switch `App`'s template to `<router-outlet />` (section 7) — as its
      own commit before the feature commit(s).
- [ ] Create `core/models/device.ts` with `Device`, `DeviceType`,
      `DeviceStatus`, `DeviceIntegration`, `PaginatedDevicesMeta`,
      `PaginatedDevicesResponse`, `ListDevicesParams` exactly mirroring
      section 3 — do not add fields not present in the backend DTO.
  - [ ] Create `core/services/device.service.ts` with a single `listDevices(params?)`
      method returning `Observable<PaginatedDevicesResponse>`, built with
      `HttpParams`, base URL from `environment.apiBaseUrl` (section 4).
- [ ] Write `device.service.spec.ts` following `health.service.spec.ts`'s
      exact `HttpTestingController` pattern.
- [ ] Create `pages/device-list/device-list.ts` (+ html/css/spec) as specified
      in section 5.1, with the 4-state `DeviceListViewState` union, a
      separate page signal, and previous/next pagination methods guarded
      against invalid page numbers.
- [ ] Create `pages/device-list/device-list-item/device-list-item.ts`
      (+ html/css/spec) as specified in section 5.2, using
      `input.required<Device>()`, with a small `switch (device().type)` for
      the capabilities summary — defensive on missing fields.
- [ ] Treat `status` strictly as connectivity, never as on/off power state —
      power/other state comes only from `capabilities` (ADR 0001, risk 2).
- [ ] Map empty `data: []` (still `200 OK`) to the `'empty'` UI state, never
      to `'error'`.
- [ ] Map any HTTP error to the generic `'error'` state with a `Retry` action;
      `console.error` the raw error for now (no logging service exists yet).
- [ ] Never request more than one page at a time; never raise `limit` beyond
      the backend default (20) without a documented reason.
- [ ] No third-party UI/component library; no polling/`setInterval`; no
      client-side aggregation across multiple fetched pages.
- [ ] Run `npm run lint` and `npm test` in `frontend/` before considering the
      feature done.
