import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DeviceStatus, DeviceType } from '../domain/device';

export type DeviceDocument = HydratedDocument<DeviceMongo>;

// Nested integration metadata - not a separate collection (ADR 0001, section 4).
// Fields are populated by Mongoose/the driver at runtime, not by a TS
// constructor - `declare` opts them out of strictPropertyInitialization
// without weakening the field types.
@Schema({ _id: false })
export class DeviceIntegrationMongo {
  @Prop({ required: true })
  declare protocol: string;

  @Prop({ required: true })
  declare externalId: string;

  @Prop()
  declare manufacturer?: string;
}

// Mongoose schema for the `devices` collection.
// Field shape exactly matches ADR 0001, section 4 - no extra fields.
@Schema({ collection: 'devices', timestamps: true })
export class DeviceMongo {
  @Prop({ required: true, index: true })
  declare name: string;

  @Prop({ required: true, enum: ['light', 'plug', 'sensor', 'thermostat', 'other'], index: true })
  declare type: DeviceType;

  @Prop({ required: true, enum: ['online', 'offline', 'unknown'], index: true })
  declare status: DeviceStatus;

  @Prop({ type: Object, required: true, default: {} })
  declare capabilities: Record<string, unknown>;

  @Prop({ type: DeviceIntegrationMongo, required: true })
  declare integration: DeviceIntegrationMongo;

  @Prop()
  declare room?: string;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(DeviceMongo);
