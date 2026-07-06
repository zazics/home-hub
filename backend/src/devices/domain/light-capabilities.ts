// Pure domain type - no NestJS, no Mongo, no HTTP dependencies.
// Documented shape of `Device.capabilities` when `type === 'light'` (ADR 0003, section 2.1).

export interface LightCapabilities {
  power: 'on' | 'off';
  brightness?: number; // 0-100, percentage. Present only if the light is dimmable.
}
