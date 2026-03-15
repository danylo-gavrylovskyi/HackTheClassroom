import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import * as express from 'express';

/** Public controller — no auth required */
@Controller('exams')
export class ExamsPublicController {
  constructor(private examsService: ExamsService) { }

  /** Returns only title and subject — safe for students */
  @Get(':id/public')
  async getPublic(@Param('id') id: string) {
    const exam = await this.examsService.findOnePublic(id);
    return { id: exam.id, title: exam.title, subject: exam.subject };
  }
}

@Controller('exams')
@UseGuards(SupabaseAuthGuard)
export class ExamsController {
  constructor(private examsService: ExamsService) { }

  @Post()
  create(@Req() req: express.Request, @Body() dto: CreateExamDto) {
    const teacher = req.user as { id: string };
    return this.examsService.create(teacher.id, dto);
  }

  @Get()
  findAll(@Req() req: express.Request) {
    const teacher = req.user as { id: string };
    return this.examsService.findAllByTeacher(teacher.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: express.Request) {
    const teacher = req.user as { id: string };
    return this.examsService.findOne(id, teacher.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: express.Request,
    @Body() dto: Partial<CreateExamDto>,
  ) {
    const teacher = req.user as { id: string };
    return this.examsService.update(id, teacher.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: express.Request) {
    const teacher = req.user as { id: string };
    return this.examsService.remove(id, teacher.id);
  }
}
