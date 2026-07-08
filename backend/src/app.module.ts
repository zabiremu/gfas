import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PartiesModule } from './parties/parties.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { DocumentsModule } from './documents/documents.module';
import { WarehouseModule } from './warehouse/warehouse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      // Auto-discover every *.entity.ts (dev / ts-node) or *.entity.js (built
      // dist) under src/, so new entities are picked up without editing this
      // array. Covers: Tenant, User, Party, Shipment, ShipmentDocument,
      // TrackingEvent, WarehouseEntry.
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // WARNING: synchronize auto-alters the DB schema on every boot and can
      // silently drop columns/data. It is unsafe in production — use TypeORM
      // migrations there instead. Gated to non-production only.
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
    }),
    AuthModule,
    ShipmentsModule,
    PartiesModule,
    DocumentsModule,
    WarehouseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
