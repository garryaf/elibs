# Prompt: Testing

## Purpose
Menulis atau memperbaiki test cases (unit, property, integration).

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read source file yang akan di-test
3. Read existing test file (jika ada)
4. Read requirement (untuk acceptance criteria)
5. Read design (untuk correctness properties)

## Execution Steps

1. **Identify Test Type** — Unit / Property / Integration / E2E
2. **Identify Test Cases** — Based on requirement & design
3. **Write Tests** — Following existing patterns
4. **Run Tests** — Ensure they pass (or fail if testing a bug)
5. **Check Coverage** — Ensure critical paths covered

## Test Types

### Unit Test
- Tests a single function/method in isolation
- Mocks external dependencies
- Fast execution (< 100ms per test)
- File pattern: `*.spec.ts`

### Property Test (fast-check)
- Tests universal properties across many inputs
- Minimum 100 iterations
- File pattern: `*.property.spec.ts`
- Tag: `// Feature: X, Property Y: description`

### Integration Test
- Tests multiple components together
- May use real or mocked database
- File pattern: `*.e2e-spec.ts`
- Located in `test/` directory

## Test File Structure

```typescript
// Feature: [feature-name], Property N: [property description]
import * as fc from 'fast-check';

describe('[Component/Feature Name]', () => {
  // Setup (beforeEach, mocks, etc.)

  describe('[method/behavior]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Property Test Pattern

```typescript
it('should [property description]', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 100 }),
      async (input) => {
        const result = functionUnderTest(input);
        expect(result).toSatisfy(property);
      },
    ),
    { numRuns: 100 },
  );
});
```

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
