import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiration: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.refreshSecret = this.configService.get<string>('JWT_SECRET') + '-refresh';
    this.refreshExpiration = '7d';
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // TODO: NCR-01-02 — Add clinicId to JWT payload when User.clinicId column is added
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiration,
      } as any),
      user: payload,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshSecret,
      });

      // Verify user still exists and is active
      const user = await this.usersService.findByEmail(payload.email);
      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User no longer active');
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiration,
        } as any),
        user: newPayload,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
