import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { TokenBlocklistService } from './token-blocklist.service';
import { AuditService } from '../laboratory/audit/audit.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiration: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenBlocklist: TokenBlocklistService,
    private auditService: AuditService,
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

  async login(user: any, ipAddress?: string) {
    const payload = { email: user.email, sub: user.id, role: user.role, clinicId: user.clinicId ?? null };
    const result = {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiration,
      } as any),
      user: payload,
    };

    // Audit log login (non-blocking — don't fail login if audit write fails)
    this.auditService.log(user.id, 'LOGIN', 'User', user.id, null, { email: user.email, role: user.role }, ipAddress ?? null).catch(() => {});

    return result;
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

      const newPayload = { email: user.email, sub: user.id, role: user.role, clinicId: user.clinicId ?? null };
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

  /**
   * Logout: add the current access token to the blocklist.
   * The token will be rejected on subsequent requests until it expires naturally.
   */
  async logout(sub: string, iat: number, exp: number, ipAddress?: string): Promise<void> {
    this.tokenBlocklist.block(sub, iat, exp);

    // Audit log logout (non-blocking)
    this.auditService.log(sub, 'LOGOUT', 'User', sub, null, null, ipAddress ?? null).catch(() => {});
  }

  /**
   * Check if a token is blocked (called by JwtStrategy on every request).
   */
  isTokenBlocked(sub: string, iat: number): boolean {
    return this.tokenBlocklist.isBlocked(sub, iat);
  }
}
