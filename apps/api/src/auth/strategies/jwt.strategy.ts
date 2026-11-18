import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { TokenBlocklistService } from '../token-blocklist.service';
import { extractCookie } from '../../common/utils/cookie.util';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  clinicId: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlocklist: TokenBlocklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => extractCookie(req?.headers?.cookie, 'elis_token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if token has been blocklisted (logout)
    if (
      payload.iat &&
      this.tokenBlocklist.isBlocked(payload.sub, payload.iat)
    ) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      sub: payload.sub,
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId ?? null,
    };
  }
}
