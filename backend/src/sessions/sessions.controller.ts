import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import * as express from 'express';

@Controller()
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  /** Public — student starts an exam session */
  @Post('exams/:examId/start-session')
  startSession(
    @Param('examId') examId: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.sessionsService.startSession(examId, dto);
  }

  /** Agent callback — complete a session with results */
  @Post('sessions/:id/complete')
  completeSession(
    @Param('id') id: string,
    @Headers('x-callback-secret') callbackSecret: string,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.sessionsService.completeSession(id, callbackSecret, dto);
  }

  /** Teacher — list sessions for an exam */
  @Get('exams/:examId/sessions')
  @UseGuards(SupabaseAuthGuard)
  findByExam(@Param('examId') examId: string, @Req() req: express.Request) {
    const teacher = req.user as { id: string };
    return this.sessionsService.findByExam(examId, teacher.id);
  }

  /** Teacher — get session details */
  @Get('sessions/:id')
  @UseGuards(SupabaseAuthGuard)
  findOne(@Param('id') id: string, @Req() req: express.Request) {
    const teacher = req.user as { id: string };
    return this.sessionsService.findOne(id, teacher.id);
  }
}
