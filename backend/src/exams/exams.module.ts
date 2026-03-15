import { Module } from '@nestjs/common';
import { ExamsController, ExamsPublicController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  controllers: [ExamsPublicController, ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule { }
