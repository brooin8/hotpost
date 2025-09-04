import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'sync',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove client from all user rooms
    this.userSockets.forEach((sockets, userId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });
  }

  @SubscribeMessage('subscribe')
  @UseGuards(WsJwtGuard)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;
    
    // Add client to user's room
    client.join(`user-${userId}`);
    
    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);
    
    client.emit('subscribed', { message: 'Successfully subscribed to updates' });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;
    
    // Remove client from user's room
    client.leave(`user-${userId}`);
    
    // Remove from tracking
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
    
    client.emit('unsubscribed', { message: 'Successfully unsubscribed from updates' });
  }

  // Emit sync status updates to specific user
  emitSyncUpdate(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('sync-update', data);
  }

  // Emit product updates to specific user
  emitProductUpdate(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('product-update', data);
  }

  // Emit listing updates to specific user
  emitListingUpdate(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('listing-update', data);
  }

  // Emit marketplace connection updates
  emitConnectionUpdate(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('connection-update', data);
  }

  // Emit general notifications
  emitNotification(userId: string, notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }) {
    this.server.to(`user-${userId}`).emit('notification', notification);
  }

  // Broadcast sync progress
  emitSyncProgress(userId: string, progress: {
    operation: string;
    current: number;
    total: number;
    marketplace?: string;
    productTitle?: string;
  }) {
    this.server.to(`user-${userId}`).emit('sync-progress', progress);
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  // Get number of connected clients for a user
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
