import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PartiesModule } from './parties/parties.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { DocumentsModule } from './documents/documents.module';

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
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    ShipmentsModule,
    PartiesModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
