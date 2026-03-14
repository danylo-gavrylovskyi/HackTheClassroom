import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.slice(7);

    // Verify token via Supabase Auth API
    const { data: userData, error: authError } = await this.supabase
      .getClient()
      .auth.getUser(token);

    if (authError || !userData.user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Get teacher record from DB
    const { data: teacher, error: dbError } = await this.supabase
      .getServiceClient()
      .from('teachers')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (dbError || !teacher) {
      throw new UnauthorizedException('Teacher not found');
    }

    request.user = teacher;
    return true;
  }
}
