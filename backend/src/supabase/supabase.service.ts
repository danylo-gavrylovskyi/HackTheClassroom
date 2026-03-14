import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly serviceClient: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceKey = this.config.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.client = createClient(url, anonKey);
    this.serviceClient = createClient(url, serviceKey);
  }

  /** Anon client — respects RLS with user JWT */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Service role client — bypasses RLS, use for agent callbacks */
  getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }
}
