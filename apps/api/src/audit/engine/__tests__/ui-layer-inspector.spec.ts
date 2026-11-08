import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { UILayerInspector } from '../inspectors/ui-layer.inspector';
import { InspectionTarget } from '../interfaces';

describe('UILayerInspector', () => {
  let inspector: UILayerInspector;
  let tmpDir: string;

  beforeEach(() => {
    inspector = new UILayerInspector();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-inspector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe('when no files match patterns', () => {
    it('should return ABSENT status', async () => {
      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient pages',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toBe('No files matched UI inspection patterns');
    });
  });

  describe('when files match but no required artifacts defined', () => {
    it('should return PRESENT status based on file existence', async () => {
      createFile(
        'apps/web/src/components/patients/PatientList.tsx',
        'export default function PatientList() { return <div />; }',
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient pages',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      expect(result.status).toBe('PRESENT');
      expect(result.filePath).toContain('PatientList.tsx');
      expect(result.evidence).toContain('1 UI file(s)');
    });
  });

  describe('when all required artifacts are found', () => {
    it('should return PRESENT status with evidence', async () => {
      createFile(
        'apps/web/src/components/patients/PatientForm.tsx',
        `
import { useForm } from 'react-hook-form';

export default function PatientForm() {
  const form = useForm();
  return (
    <form onSubmit={form.handleSubmit}>
      <input name="name" />
    </form>
  );
}
        `.trim(),
      );

      createFile(
        'apps/web/src/app/dashboard/patients/page.tsx',
        `
export default function PatientsPage() {
  return <div>Patients</div>;
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient components',
          },
          {
            glob: 'apps/web/src/app/dashboard/patients/**/*.tsx',
            purpose: 'Patient pages',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Form component',
            searchPattern: '<form|useForm|<Form',
            layer: 'UI',
          },
          {
            description: 'Page component',
            searchPattern: 'export default function',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      expect(result.status).toBe('PRESENT');
      expect(result.filePath).toBeDefined();
      expect(result.evidence).toContain(
        'Found: Form component, Page component',
      );
    });
  });

  describe('when some required artifacts are found', () => {
    it('should return PARTIAL status', async () => {
      createFile(
        'apps/web/src/app/dashboard/patients/page.tsx',
        `
export default function PatientsPage() {
  return <div>Patients</div>;
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/app/dashboard/patients/**/*.tsx',
            purpose: 'Patient pages',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Form component',
            searchPattern: '<form|useForm|<Form',
            layer: 'UI',
          },
          {
            description: 'Page component',
            searchPattern: 'export default function',
            layer: 'UI',
          },
          {
            description: 'Route definition',
            searchPattern: 'path:\\s*[\'"/]patients',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      expect(result.status).toBe('PARTIAL');
      expect(result.evidence).toContain('Found: Page component');
      expect(result.evidence).toContain(
        'Missing: Form component, Route definition',
      );
    });
  });

  describe('when no required artifacts are found in matched files', () => {
    it('should return ABSENT status', async () => {
      createFile(
        'apps/web/src/components/patients/utils.tsx',
        'export const formatName = (name: string) => name.trim();',
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient components',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Form component',
            searchPattern: '<form|useForm|<Form',
            layer: 'UI',
          },
          {
            description: 'Route definition',
            searchPattern: 'path:\\s*[\'"/]patients',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toContain(
        'Missing: Form component, Route definition',
      );
    });
  });

  describe('route definition detection', () => {
    it('should detect path-based route definitions', async () => {
      createFile(
        'apps/web/src/app/dashboard/patients/page.tsx',
        `
// Next.js file-based route at /dashboard/patients
export default function PatientsPage() {
  return <div>Patients</div>;
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/app/dashboard/patients/**/*.tsx',
            purpose: 'Patient pages',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Page export',
            searchPattern: 'export default function',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });

    it('should detect React Router style route definitions', async () => {
      createFile(
        'apps/web/src/routes.tsx',
        `
import { Route } from 'react-router-dom';
<Route path="/patients" element={<PatientsPage />} />
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [{ glob: 'apps/web/src/**/*.tsx', purpose: 'Route files' }],
        requiredArtifacts: [
          {
            description: 'Route definition',
            searchPattern: '<Route\\s+path=',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('form detection', () => {
    it('should detect useForm hook usage', async () => {
      createFile(
        'apps/web/src/components/patients/PatientForm.tsx',
        `
import { useForm } from 'react-hook-form';
export function PatientForm() { const form = useForm(); return null; }
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient forms',
          },
        ],
        requiredArtifacts: [
          { description: 'Form usage', searchPattern: 'useForm', layer: 'UI' },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('Found: Form usage');
    });

    it('should detect HTML form tags', async () => {
      createFile(
        'apps/web/src/components/patients/PatientForm.tsx',
        '<form onSubmit={handleSubmit}><input name="name" /></form>',
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Patient forms',
          },
        ],
        requiredArtifacts: [
          { description: 'HTML form', searchPattern: '<form', layer: 'UI' },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('error handling', () => {
    it('should handle invalid regex patterns gracefully', async () => {
      createFile(
        'apps/web/src/components/patients/page.tsx',
        'export default function() {}',
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Pages',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Bad pattern',
            searchPattern: '[invalid(regex',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('ABSENT');
      expect(result.issues).toBeDefined();
      expect(result.issues![0]).toContain('Invalid regex pattern');
    });

    it('should handle glob pattern errors gracefully', async () => {
      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [{ glob: '', purpose: 'Empty glob' }],
        requiredArtifacts: [],
      };

      // An empty glob may still produce no files rather than throwing
      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('UI');
      // Either ABSENT or produces an error — shouldn't throw
    });

    it('should report issues when files cannot be read', async () => {
      // Create a file then make it unreadable
      const filePath = path.join(
        tmpDir,
        'apps/web/src/components/patients/locked.tsx',
      );
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'content');
      fs.chmodSync(filePath, 0o000);

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Pages',
          },
        ],
        requiredArtifacts: [
          { description: 'Export', searchPattern: 'export', layer: 'UI' },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      // Restore permissions for cleanup
      fs.chmodSync(filePath, 0o644);

      expect(result.status).toBe('ABSENT');
      expect(result.issues).toBeDefined();
      expect(result.issues!.some((i) => i.includes('Error reading file'))).toBe(
        true,
      );
    });
  });

  describe('multiple patterns', () => {
    it('should aggregate files from multiple glob patterns', async () => {
      createFile(
        'apps/web/src/components/patients/PatientForm.tsx',
        'export function PatientForm() { return <form />; }',
      );
      createFile(
        'apps/web/src/app/dashboard/patients/page.tsx',
        'export default function PatientsPage() { return <div />; }',
      );

      const target: InspectionTarget = {
        layer: 'UI',
        patterns: [
          {
            glob: 'apps/web/src/components/patients/**/*.tsx',
            purpose: 'Components',
          },
          {
            glob: 'apps/web/src/app/dashboard/patients/**/*.tsx',
            purpose: 'Pages',
          },
        ],
        requiredArtifacts: [
          { description: 'Form tag', searchPattern: '<form', layer: 'UI' },
          {
            description: 'Page export',
            searchPattern: 'export default function',
            layer: 'UI',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('Found: Form tag, Page export');
    });
  });
});
