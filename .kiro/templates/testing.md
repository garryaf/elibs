# TC-XXXX: [Test Suite Name]

## Status: [NOT_STARTED | WRITTEN | PASSING | FAILING]

## Type: [unit | property | integration | e2e]

## Target
- Module: [module name]
- File: `path/to/source.ts`
- Function/Class: [name]

## Test File
`path/to/source.spec.ts` or `path/to/source.property.spec.ts`

## Test Cases

### Unit Tests
| # | Description | Input | Expected Output |
|---|-------------|-------|-----------------|
| 1 | [behavior when condition] | [input] | [output] |
| 2 | [behavior when condition] | [input] | [output] |
| 3 | [edge case] | [input] | [output/error] |

### Property Tests
| # | Property | Generator | Assertion |
|---|----------|-----------|-----------|
| 1 | [property name] | `fc.string()` | [invariant] |
| 2 | [property name] | `fc.integer()` | [invariant] |

## Dependencies
- Mocks needed: [list services to mock]
- Test data: [describe fixtures]
- Environment: [env vars needed]

## Run Command
```bash
# Single file
npx jest path/to/test.spec.ts

# All tests in module
npx jest --testPathPattern=module-name

# Property tests only
npx jest --testPathPattern=property
```

## Related
- Requirement: FR-XXXX (acceptance criteria being verified)
- Design: DES-XXXX (properties being tested)
- Task: TASK-XXXX
