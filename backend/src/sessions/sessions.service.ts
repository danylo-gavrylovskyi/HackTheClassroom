import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ExamsService } from '../exams/exams.service';
import { LivekitService } from '../livekit/livekit.service';
import { StartSessionDto } from './dto/start-session.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  constructor(
    private supabase: SupabaseService,
    private examsService: ExamsService,
    private livekitService: LivekitService,
    private config: ConfigService,
  ) {}

  async startSession(examId: string, dto: StartSessionDto) {
    const exam = await this.examsService.findOnePublic(examId);
    const callbackSecret = uuidv4();

    // Create exam session record
    const { data: session, error } = await this.supabase
      .getServiceClient()
      .from('exam_sessions')
      .insert({
        exam_id: examId,
        student_name: dto.student_name,
        status: 'in_progress',
        callback_secret: callbackSecret,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const roomName = `exam-${session.id}`;
    const backendUrl =
      this.config.get<string>('BACKEND_URL') || 'http://localhost:3001';

    // Room metadata for the agent
    const metadata = JSON.stringify({
      session_id: session.id,
      exam_title: exam.title,
      questions: exam.questions_json,
      callback_url: `${backendUrl}/api/sessions/${session.id}/complete`,
      callback_secret: callbackSecret,
    });

    await this.livekitService.createRoom(roomName, metadata);
    const token = await this.livekitService.createParticipantToken(
      roomName,
      `student-${dto.student_name}`,
    );

    return {
      token,
      session_id: session.id,
      room_name: roomName,
    };
  }

  async completeSession(
    sessionId: string,
    callbackSecret: string,
    dto: CompleteSessionDto,
  ) {
    // Verify callback secret
    const { data: session, error: fetchError } = await this.supabase
      .getServiceClient()
      .from('exam_sessions')
      .select('callback_secret')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) throw new NotFoundException('Session not found');
    if (session.callback_secret !== callbackSecret) {
      throw new ForbiddenException('Invalid callback secret');
    }

    const { error } = await this.supabase
      .getServiceClient()
      .from('exam_sessions')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        scores_json: dto.scores_json,
        summary_text: dto.summary_text,
        total_score: dto.total_score,
        max_score: dto.max_score,
        transcript_text: dto.transcript_text || null,
      })
      .eq('id', sessionId);

    if (error) throw new Error(error.message);
    return { completed: true };
  }

  async findByExam(examId: string, teacherId: string) {
    // Verify teacher owns this exam
    await this.examsService.findOne(examId, teacherId);

    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exam_sessions')
      .select('id, student_name, status, total_score, max_score, started_at, finished_at')
      .eq('exam_id', examId)
      .order('started_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(sessionId: string, teacherId: string) {
    const { data, error } = await this.supabase
      .getServiceClient()
      .from('exam_sessions')
      .select('*, exams!inner(teacher_id)')
      .eq('id', sessionId)
      .single();

    if (error || !data) throw new NotFoundException('Session not found');
    if (data.exams.teacher_id !== teacherId) {
      throw new ForbiddenException();
    }

    // Remove join data from response
    const { exams: _, ...session } = data;
    return session;
  }
}
