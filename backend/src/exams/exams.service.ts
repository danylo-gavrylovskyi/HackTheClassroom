import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private supabase: SupabaseService) {}

  async create(teacherId: string, dto: CreateExamDto) {
    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .insert({
        teacher_id: teacherId,
        title: dto.title,
        subject: dto.subject,
        questions_json: dto.questions,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAllByTeacher(teacherId: string) {
    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string, teacherId?: string) {
    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Exam not found');
    if (teacherId && data.teacher_id !== teacherId) {
      throw new ForbiddenException();
    }
    return data;
  }

  /** Public — for start-session, no teacher check */
  async findOnePublic(id: string) {
    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .select('id, title, subject, questions_json')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Exam not found');
    return data;
  }

  async update(id: string, teacherId: string, dto: Partial<CreateExamDto>) {
    await this.findOne(id, teacherId);

    const updateData: Record<string, unknown> = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.subject) updateData.subject = dto.subject;
    if (dto.questions) updateData.questions_json = dto.questions;

    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, teacherId: string) {
    await this.findOne(id, teacherId);

    const { error } = await this.supabase
      .getServiceClient()
      .from('exams')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }
}
