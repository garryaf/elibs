import { Module } from '@nestjs/common';
import { QCService } from './qc.service';
import { QCController } from './qc.controller';

@Module({
  imports: [],
  controllers: [QCController],
  providers: [QCService],
  exports: [QCService],
})
export class QCModule {}
