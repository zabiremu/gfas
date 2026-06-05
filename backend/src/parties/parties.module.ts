import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Party } from '../entities/party.entity';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Party])],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
