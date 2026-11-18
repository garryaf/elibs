import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { extractCookie } from '../common/utils/cookie.util';

const ACCESS_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string,
  ): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('elis_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
    if (refreshToken) {
      res.cookie('elis_refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      });
    }
  }

  private clearAuthCookies(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('elis_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('elis_refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    res.clearCookie('elis_authenticated', { path: '/' });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access and refresh tokens',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      // Audit failed login attempt (non-blocking)
      const ipAddress = (req.headers?.['x-forwarded-for'] as string) || req.ip;
      this.authService.logFailedLogin(loginDto.email, ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }
    const ipAddress = (req.headers?.['x-forwarded-for'] as string) || req.ip;
    const result = await this.authService.login(user, ipAddress);
    if (result?.accessToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh per minute
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      body?.refreshToken ||
      extractCookie(req.headers?.cookie, 'elis_refresh_token');
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const result = await this.authService.refresh(refreshToken);
    if (result?.accessToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return {
      success: true,
      message: 'Token refreshed',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user returned' })
  async me(@Req() req: any) {
    return {
      success: true,
      data: { user: req.user },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate current token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = (req.headers?.['x-forwarded-for'] as string) || req.ip;
    const authHeader = req.headers?.authorization;
    const token =
      authHeader?.replace('Bearer ', '') ||
      extractCookie(req.headers?.cookie, 'elis_token');

    if (token) {
      try {
        const decoded = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        await this.authService.logout(
          decoded.sub,
          decoded.iat,
          decoded.exp,
          ipAddress,
        );
      } catch {
        // Ignore malformed token during logout
      }
    }
    this.clearAuthCookies(res);
    return { success: true, message: 'Logged out successfully' };
  }
}
