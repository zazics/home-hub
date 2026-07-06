import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesController } from './infrastructure/devices.controller';
import { ListDevicesUseCase } from './application/list-devices.use-case';
import { MongoDeviceRepositoryAdapter } from './infrastructure/mongo-device-repository.adapter';
import { DEVICE_REPOSITORY_PORT } from './application/ports/device-repository.port';
import { DeviceMongo, DeviceSchema } from './infrastructure/device.schema';

// Module: wires together domain, application, and infrastructure layers.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceMongo.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [DevicesController],
  providers: [
    ListDevicesUseCase,
    {
      provide: DEVICE_REPOSITORY_PORT,
      useClass: MongoDeviceRepositoryAdapter,
    },
  ],
})
export class DevicesModule {}
