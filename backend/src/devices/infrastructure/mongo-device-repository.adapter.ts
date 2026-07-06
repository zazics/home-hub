import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Device } from '../domain/device';
import {
  DeviceFilter,
  DevicePagination,
  DeviceRepositoryPort,
  DeviceSort,
  PaginatedDevices,
} from '../application/ports/device-repository.port';
import { DeviceMongo, DeviceDocument } from './device.schema';

// Shape of a document returned by `.lean()`: a plain object, not a hydrated
// Mongoose document, but still carrying the native `_id`.
type LeanDevice = DeviceMongo & { _id: Types.ObjectId };

// Adapter (exit point) - implements the port.
// Uses .lean() for the list query and a separate countDocuments() with the
// same filter for meta.total, per ADR 0001 section 5 (no $facet aggregation,
// to keep CPU cost low on the Raspberry Pi).
@Injectable()
export class MongoDeviceRepositoryAdapter implements DeviceRepositoryPort {
  constructor(
    @InjectModel(DeviceMongo.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async findPaginated(
    filter: DeviceFilter,
    pagination: DevicePagination,
    sort: DeviceSort,
  ): Promise<PaginatedDevices> {
    const mongoFilter = this.toMongoFilter(filter);
    const mongoSort = this.toMongoSort(sort);
    const skip = (pagination.page - 1) * pagination.limit;

    const [documents, total] = await Promise.all([
      this.deviceModel
        .find(mongoFilter)
        .sort(mongoSort)
        .skip(skip)
        .limit(pagination.limit)
        .lean<LeanDevice[]>()
        .exec(),
      this.deviceModel.countDocuments(mongoFilter).exec(),
    ]);

    return {
      data: documents.map((document) => this.toDomain(document)),
      total,
    };
  }

  private toMongoFilter(filter: DeviceFilter): QueryFilter<DeviceMongo> {
    const mongoFilter: QueryFilter<DeviceMongo> = {};
    if (filter.type) {
      mongoFilter.type = filter.type;
    }
    if (filter.status) {
      mongoFilter.status = filter.status;
    }
    if (filter.room) {
      mongoFilter.room = filter.room;
    }
    return mongoFilter;
  }

  private toMongoSort(sort: DeviceSort): Record<string, 1 | -1> {
    const direction: 1 | -1 = sort.startsWith('-') ? -1 : 1;
    const field = sort.startsWith('-') ? sort.slice(1) : sort;
    return { [field]: direction };
  }

  private toDomain(document: LeanDevice): Device {
    return {
      id: String(document._id),
      name: document.name,
      type: document.type,
      status: document.status,
      capabilities: document.capabilities,
      integration: document.integration,
      room: document.room,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
