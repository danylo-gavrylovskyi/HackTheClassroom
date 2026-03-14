import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly roomService: RoomServiceClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('LIVEKIT_URL');
    this.apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');

    // RoomServiceClient expects HTTP URL
    const httpUrl = url.replace('wss://', 'https://').replace('ws://', 'http://');
    this.roomService = new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
  }

  async createRoom(roomName: string, metadata: string): Promise<void> {
    await this.roomService.createRoom({
      name: roomName,
      metadata,
      emptyTimeout: 300, // 5 min
      maxParticipants: 2,
    });
  }

  async createParticipantToken(
    roomName: string,
    identity: string,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: '1h',
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    return await at.toJwt();
  }
}
