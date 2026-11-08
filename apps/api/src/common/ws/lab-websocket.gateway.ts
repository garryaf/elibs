import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

export interface CriticalValuePayload {
  id: string;
  orderId: string;
  orderDetailId?: string;
  testId: string;
  patientId: string;
  resultValue: string;
  clinicId?: string;
  clinicianId?: string;
  flaggedAt?: Date | string;
  escalatedAt?: Date | string;
}

export interface NotificationStatusPayload {
  notificationId: string;
  orderId?: string;
  status: string;
  channel?: string;
  lastError?: string;
  updatedAt?: Date | string;
}

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class LabWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LabWebSocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle new client connection.
   * Validates the JWT token from handshake auth and joins the user's personal room.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted connection without token`,
        );
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);

      // Attach user info to socket data for later use
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;
      client.data.clinicId = payload.clinicId;

      // Auto-join user's personal room for direct notifications
      await client.join(`user:${payload.sub}`);

      // Auto-join the user's clinic room if they have a clinicId
      if (payload.clinicId) {
        await client.join(`clinic:${payload.clinicId}`);
      }

      this.logger.log(
        `Client ${client.id} connected (user: ${payload.sub}, clinic: ${payload.clinicId || 'none'})`,
      );
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} authentication failed: ${error.message}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Handle client disconnect.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Handle `join-clinic` event — client joins a room scoped to their clinic.
   * Accepts a clinicId string. The room name is `clinic:{clinicId}`.
   */
  @SubscribeMessage('join-clinic')
  async handleJoinClinic(
    @ConnectedSocket() client: Socket,
    @MessageBody() clinicId: string,
  ): Promise<{ event: string; data: { joined: string } }> {
    const room = `clinic:${clinicId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'join-clinic', data: { joined: room } };
  }

  /**
   * Emit a `critical-value:new` event to all clients in the clinic's room.
   */
  emitCriticalValue(clinicId: string, payload: CriticalValuePayload): void {
    const room = `clinic:${clinicId}`;
    this.server.to(room).emit('critical-value:new', payload);
    this.logger.log(
      `Emitted critical-value:new to room ${room} (logId: ${payload.id})`,
    );
  }

  /**
   * Emit a `critical-value:escalated` event to all clients in the clinic's room.
   */
  emitCriticalValueEscalated(
    clinicId: string,
    payload: CriticalValuePayload,
  ): void {
    const room = `clinic:${clinicId}`;
    this.server.to(room).emit('critical-value:escalated', payload);
    this.logger.log(
      `Emitted critical-value:escalated to room ${room} (logId: ${payload.id})`,
    );
  }

  /**
   * Emit a `notification:status` event to a specific user's room.
   */
  emitNotificationStatus(
    userId: string,
    payload: NotificationStatusPayload,
  ): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification:status', payload);
    this.logger.log(
      `Emitted notification:status to room ${room} (notificationId: ${payload.notificationId})`,
    );
  }

  /**
   * Event listener: bridge EventEmitter2 `critical-value.new` to WebSocket.
   */
  @OnEvent('critical-value.new')
  handleCriticalValueNewEvent(payload: CriticalValuePayload): void {
    if (payload.clinicId) {
      this.emitCriticalValue(payload.clinicId, payload);
    }
  }

  /**
   * Event listener: bridge EventEmitter2 `critical-value.escalated` to WebSocket.
   */
  @OnEvent('critical-value.escalated')
  handleCriticalValueEscalatedEvent(payload: CriticalValuePayload): void {
    if (payload.clinicId) {
      this.emitCriticalValueEscalated(payload.clinicId, payload);
    }
  }

  /**
   * Event listener: bridge EventEmitter2 `notification.status` to WebSocket.
   */
  @OnEvent('notification.status')
  handleNotificationStatusEvent(
    payload: NotificationStatusPayload & { userId?: string },
  ): void {
    if (payload.userId) {
      this.emitNotificationStatus(payload.userId, payload);
    }
  }
}
