import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const client = this.supabase.getClient();

    const { data: authData, error: authError } = await client.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new BadRequestException('Failed to create user');
    }

    const { error: insertError } = await this.supabase
      .getServiceClient()
      .from('teachers')
      .insert({ id: userId, email: dto.email, name: dto.name });

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    return {
      access_token: authData.session?.access_token,
      user: { id: userId, email: dto.email, name: dto.name },
    };
  }

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      access_token: data.session?.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    };
  }
}
