import * as fs from 'fs';
import * as path from 'path';
import { ControllerLayerInspector } from '../controller-layer.inspector';
import { InspectionTarget } from '../../interfaces';

const TEST_ROOT = path.join(__dirname, '__fixtures__', 'controller-layer-test');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanup() {
  if (fs.existsSync(TEST_ROOT)) {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

describe('ControllerLayerInspector', () => {
  let inspector: ControllerLayerInspector;

  beforeAll(() => {
    inspector = new ControllerLayerInspector();
    ensureDir(TEST_ROOT);
  });

  afterAll(() => {
    cleanup();
  });

  beforeEach(() => {
    cleanup();
    ensureDir(TEST_ROOT);
  });

  it('should return ABSENT when no files match patterns', async () => {
    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'nonexistent/**/*.ts', purpose: 'Test' }],
      requiredArtifacts: [],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('ABSENT');
    expect(result.evidence).toContain('No files matched');
  });

  it('should return PRESENT when full controller structure is found', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'patient');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'patient.controller.ts'),
      `
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/v1/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create() {}

  @Get()
  findAll() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/patient/**/*.controller.ts', purpose: 'Patient controller' }],
      requiredArtifacts: [],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('PRESENT');
    expect(result.filePath).toBeDefined();
    expect(result.lineReferences).toBeDefined();
    expect(result.evidence).toContain('@Controller decorators');
    expect(result.evidence).toContain('guards:');
    expect(result.evidence).toContain('roles:');
  });

  it('should return PARTIAL when controller class exists but missing decorator', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'visit');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'visit.controller.ts'),
      `
// Missing @Controller decorator
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  findAll() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/visit/**/*.controller.ts', purpose: 'Visit controller' }],
      requiredArtifacts: [],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('PARTIAL');
  });

  it('should detect @UseGuards and @Roles decorators', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'order');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'order.controller.ts'),
      `
import { Controller, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'KASIR')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly tariffService: TariffResolverService,
  ) {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/order/**/*.controller.ts', purpose: 'Order controller' }],
      requiredArtifacts: [
        {
          description: 'UseGuards decorator',
          searchPattern: '@UseGuards\\(',
          layer: 'CONTROLLER',
        },
        {
          description: 'Roles decorator',
          searchPattern: '@Roles\\(',
          layer: 'CONTROLLER',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('PRESENT');
    expect(result.evidence).toContain('guards: 1');
    expect(result.evidence).toContain('roles: 1');
    expect(result.evidence).toContain('2/2 required artifacts');
  });

  it('should detect constructor injection pattern', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'lab');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'lab.controller.ts'),
      `
@Controller('api/v1/lab')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabWorkflowController {
  constructor(
    private readonly labService: LabWorkflowService,
    private readonly autoFlagging: AutoFlaggingService,
  ) {}

  @Post(':orderId/sample')
  collectSample() {}

  @Post(':orderId/verify')
  verify() {}

  @Post(':orderId/approve')
  approve() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/lab/**/*.controller.ts', purpose: 'Lab controller' }],
      requiredArtifacts: [
        {
          description: 'Constructor with service injection',
          searchPattern: 'constructor\\s*\\(',
          layer: 'CONTROLLER',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('PRESENT');
    expect(result.evidence).toContain('1 controller classes');
    expect(result.evidence).toContain('1/1 required artifacts');
  });

  it('should handle invalid regex patterns gracefully', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'test');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'test.controller.ts'),
      `
@Controller('api/v1/test')
export class TestController {
  constructor() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/test/**/*.controller.ts', purpose: 'Test' }],
      requiredArtifacts: [
        {
          description: 'Bad regex',
          searchPattern: '([invalid-regex',
          layer: 'CONTROLLER',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.issues).toBeDefined();
    expect(result.issues!.some((i) => i.includes('Invalid regex'))).toBe(true);
  });

  it('should report ABSENT when files exist but no controller patterns found', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'utils');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'helper.controller.ts'),
      `
// Just a utility file with no controller patterns
export function formatDate(d: Date): string {
  return d.toISOString();
}
`,
    );

    const target: InspectionTarget = {
      layer: 'CONTROLLER',
      patterns: [{ glob: 'src/utils/**/*.ts', purpose: 'Utils' }],
      requiredArtifacts: [
        {
          description: 'Controller decorator',
          searchPattern: '@Controller\\(',
          layer: 'CONTROLLER',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('CONTROLLER');
    expect(result.status).toBe('ABSENT');
  });
});
