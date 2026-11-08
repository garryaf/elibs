import * as fs from 'fs';
import * as path from 'path';
import { APILayerInspector } from '../api-layer.inspector';
import { InspectionTarget } from '../../interfaces';

// Create a temp directory structure for testing
const TEST_ROOT = path.join(__dirname, '__fixtures__', 'api-layer-test');

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

describe('APILayerInspector', () => {
  let inspector: APILayerInspector;

  beforeAll(() => {
    inspector = new APILayerInspector();
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
      layer: 'API',
      patterns: [{ glob: 'nonexistent/**/*.ts', purpose: 'Test' }],
      requiredArtifacts: [],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('API');
    expect(result.status).toBe('ABSENT');
    expect(result.evidence).toContain('No files matched');
  });

  it('should return PRESENT when HTTP decorators and all required artifacts are found', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'patient');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'patient.controller.ts'),
      `
import { Controller, Post, Get } from '@nestjs/common';

@Controller('api/v1/patients')
export class PatientController {
  @Post()
  create() {}

  @Get()
  findAll() {}

  @Get(':id')
  findOne() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'API',
      patterns: [
        { glob: 'src/patient/**/*.ts', purpose: 'Patient controller' },
      ],
      requiredArtifacts: [
        {
          description: 'POST endpoint',
          searchPattern: '@Post\\(',
          layer: 'API',
        },
        {
          description: 'GET endpoint',
          searchPattern: '@Get\\(',
          layer: 'API',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('API');
    expect(result.status).toBe('PRESENT');
    expect(result.filePath).toBeDefined();
    expect(result.lineReferences).toBeDefined();
    expect(result.lineReferences!.length).toBeGreaterThan(0);
    expect(result.evidence).toContain('HTTP decorators');
  });

  it('should return PARTIAL when decorators found but required artifacts missing', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'order');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'order.controller.ts'),
      `
import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/orders')
export class OrderController {
  @Get()
  findAll() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'API',
      patterns: [{ glob: 'src/order/**/*.ts', purpose: 'Order controller' }],
      requiredArtifacts: [
        {
          description: 'POST endpoint for order creation',
          searchPattern: '@Post\\(',
          layer: 'API',
        },
        {
          description: 'PUT endpoint for order update',
          searchPattern: '@Put\\(',
          layer: 'API',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('API');
    expect(result.status).toBe('PARTIAL');
    expect(result.evidence).toContain('0/2 required artifacts');
  });

  it('should detect route paths in decorators', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'lab');
    ensureDir(controllerDir);

    fs.writeFileSync(
      path.join(controllerDir, 'lab.controller.ts'),
      `
import { Controller, Post, Get, Put, Delete, Patch } from '@nestjs/common';

@Controller('api/v1/lab')
export class LabController {
  @Post('samples')
  collectSample() {}

  @Get(':orderId/results')
  getResults() {}

  @Put(':orderId/results')
  updateResults() {}

  @Delete(':orderId')
  cancelOrder() {}

  @Patch(':orderId/status')
  updateStatus() {}
}
`,
    );

    const target: InspectionTarget = {
      layer: 'API',
      patterns: [
        { glob: 'src/lab/**/*.ts', purpose: 'Lab workflow controller' },
      ],
      requiredArtifacts: [],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    expect(result.layer).toBe('API');
    expect(result.status).toBe('PRESENT');
    // 5 decorators: Post, Get, Put, Delete, Patch
    expect(result.evidence).toContain('5 HTTP decorators');
    expect(result.evidence).toContain('5 route paths');
  });

  it('should handle file read errors gracefully', async () => {
    const controllerDir = path.join(TEST_ROOT, 'src', 'broken');
    ensureDir(controllerDir);

    // Create a file then make it a directory to cause read error
    const filePath = path.join(controllerDir, 'broken.controller.ts');
    fs.writeFileSync(filePath, '@Get() test() {}');

    const target: InspectionTarget = {
      layer: 'API',
      patterns: [{ glob: 'src/broken/**/*.ts', purpose: 'Broken test' }],
      requiredArtifacts: [
        {
          description: 'Invalid regex artifact',
          searchPattern: '([invalid',
          layer: 'API',
        },
      ],
    };

    const result = await inspector.inspect(target, TEST_ROOT);

    // Should still work but report issues with the invalid regex
    expect(result.layer).toBe('API');
    expect(result.issues).toBeDefined();
    expect(result.issues!.some((i) => i.includes('Invalid regex'))).toBe(true);
  });
});
