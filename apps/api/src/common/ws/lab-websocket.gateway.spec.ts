import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  LabWebSocketGateway,
  CriticalValuePayload,
  NotificationStatusPayload,
} from './lab-websocket.gateway';

describe('LabWebSocketGateway', () => {
  let gateway: LabWebSocketGateway;
  let jwtService: JwtService;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        LabWebSocketGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<LabWebSocketGateway>(LabWebSocketGateway);
    jwtService = module.get<JwtService>(JwtService);

    // Assign mock server
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect client without token', async () => {
      const mockClient = {
        id: 'test-client-1',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should authenticate client with valid token from auth', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@test.com',
        role: 'ANALIS',
        clinicId: 'clinic-456',
      };

      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      const mockClient = {
        id: 'test-client-2',
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await gateway.handleConnection(mockClient as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockClient.data.userId).toBe('user-123');
      expect(mockClient.data.clinicId).toBe('clinic-456');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-123');
      expect(mockClient.join).toHaveBeenCalledWith('clinic:clinic-456');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate client with token from authorization header', async () => {
      const mockPayload = {
        sub: 'user-789',
        email: 'admin@test.com',
        role: 'ADMIN',
        clinicId: null,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      const mockClient = {
        id: 'test-client-3',
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await gateway.handleConnection(mockClient as any);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token');
      expect(mockClient.data.userId).toBe('user-789');
      expect(mockClient.join).toHaveBeenCalledWith('user:user-789');
      // Should not join a clinic room when clinicId is null
      expect(mockClient.join).not.toHaveBeenCalledWith(
        expect.stringContaining('clinic:'),
      );
    });

    it('should disconnect client with invalid token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const mockClient = {
        id: 'test-client-4',
        handshake: { auth: { token: 'expired-token' }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        data: {},
      };

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleJoinClinic', () => {
    it('should join the specified clinic room', async () => {
      const mockClient = {
        id: 'test-client-5',
        join: jest.fn(),
        data: { userId: 'user-1' },
      };

      const result = await gateway.handleJoinClinic(
        mockClient as any,
        'clinic-abc',
      );

      expect(mockClient.join).toHaveBeenCalledWith('clinic:clinic-abc');
      expect(result).toEqual({
        event: 'join-clinic',
        data: { joined: 'clinic:clinic-abc' },
      });
    });
  });

  describe('emitCriticalValue', () => {
    it('should emit critical-value:new to the clinic room', () => {
      const payload: CriticalValuePayload = {
        id: 'cv-1',
        orderId: 'order-1',
        testId: 'test-1',
        patientId: 'patient-1',
        resultValue: '200',
        clinicId: 'clinic-1',
      };

      gateway.emitCriticalValue('clinic-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith('clinic:clinic-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'critical-value:new',
        payload,
      );
    });
  });

  describe('emitCriticalValueEscalated', () => {
    it('should emit critical-value:escalated to the clinic room', () => {
      const payload: CriticalValuePayload = {
        id: 'cv-2',
        orderId: 'order-2',
        testId: 'test-2',
        patientId: 'patient-2',
        resultValue: '500',
        clinicId: 'clinic-2',
        escalatedAt: new Date().toISOString(),
      };

      gateway.emitCriticalValueEscalated('clinic-2', payload);

      expect(mockServer.to).toHaveBeenCalledWith('clinic:clinic-2');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'critical-value:escalated',
        payload,
      );
    });
  });

  describe('emitNotificationStatus', () => {
    it('should emit notification:status to the user room', () => {
      const payload: NotificationStatusPayload = {
        notificationId: 'notif-1',
        orderId: 'order-1',
        status: 'SENT',
        channel: 'WHATSAPP',
      };

      gateway.emitNotificationStatus('user-123', payload);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:status',
        payload,
      );
    });
  });

  describe('Event listeners (EventEmitter2 bridge)', () => {
    it('should forward critical-value.new events to WebSocket', () => {
      const payload: CriticalValuePayload = {
        id: 'cv-3',
        orderId: 'order-3',
        testId: 'test-3',
        patientId: 'patient-3',
        resultValue: '999',
        clinicId: 'clinic-3',
      };

      gateway.handleCriticalValueNewEvent(payload);

      expect(mockServer.to).toHaveBeenCalledWith('clinic:clinic-3');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'critical-value:new',
        payload,
      );
    });

    it('should not emit critical-value.new when clinicId is missing', () => {
      const payload: CriticalValuePayload = {
        id: 'cv-4',
        orderId: 'order-4',
        testId: 'test-4',
        patientId: 'patient-4',
        resultValue: '888',
      };

      gateway.handleCriticalValueNewEvent(payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });

    it('should forward critical-value.escalated events to WebSocket', () => {
      const payload: CriticalValuePayload = {
        id: 'cv-5',
        orderId: 'order-5',
        testId: 'test-5',
        patientId: 'patient-5',
        resultValue: '777',
        clinicId: 'clinic-5',
      };

      gateway.handleCriticalValueEscalatedEvent(payload);

      expect(mockServer.to).toHaveBeenCalledWith('clinic:clinic-5');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'critical-value:escalated',
        payload,
      );
    });

    it('should forward notification.status events to WebSocket', () => {
      const payload = {
        notificationId: 'notif-2',
        orderId: 'order-2',
        status: 'FAILED',
        channel: 'EMAIL',
        lastError: 'SMTP unavailable',
        userId: 'user-456',
      };

      gateway.handleNotificationStatusEvent(payload);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-456');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification:status',
        payload,
      );
    });

    it('should not emit notification.status when userId is missing', () => {
      const payload = {
        notificationId: 'notif-3',
        orderId: 'order-3',
        status: 'SENT',
        channel: 'WHATSAPP',
      };

      gateway.handleNotificationStatusEvent(payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
