import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromClient(client);
      
      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user to client for use in handlers
      client.data.user = payload;
      
      return true;
    } catch (err) {
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromClient(client: Socket): string | undefined {
    // Try to get token from handshake auth
    const token = client.handshake.auth?.token;
    
    if (token) {
      return token;
    }

    // Try to get token from handshake headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query params
    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return undefined;
  }
}
