import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { ExamsModule } from '../exams/exams.module';
import { LivekitModule } from '../livekit/livekit.module';

@Module({
  imports: [ExamsModule, LivekitModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
