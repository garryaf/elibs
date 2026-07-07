# Prompt: Performance Optimization

## Purpose
Mengidentifikasi dan memperbaiki masalah performa.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read target module source code
3. Read database queries (Prisma calls)
4. Read API response times (if available)
5. Read existing tests

## Execution Steps

1. **Profile** — Identify bottleneck (CPU, I/O, memory, network)
2. **Measure** — Establish baseline metrics
3. **Identify Root Cause** — N+1 queries, blocking calls, memory leaks
4. **Implement Fix** — Apply optimization
5. **Measure Again** — Verify improvement
6. **Ensure No Regression** — Run existing tests

## Common Performance Issues (NestJS + Prisma)

| Issue | Symptom | Fix |
|-------|---------|-----|
| N+1 Query | Slow list endpoints | Use `include` or batch queries |
| Missing Index | Slow WHERE/JOIN | Add database index |
| Blocking I/O | High latency | Use async/await properly |
| Large Payload | Slow response | Pagination, field selection |
| No Caching | Repeated expensive ops | Redis/in-memory cache |
| Memory Leak | Growing memory usage | Fix event listener cleanup |
| Unoptimized Regex | CPU spike | Simplify regex pattern |

## Optimization Patterns

### Database
```typescript
// ❌ N+1 query
const users = await prisma.user.findMany();
for (const user of users) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } });
}

// ✅ Single query with include
const users = await prisma.user.findMany({
  include: { orders: true },
});
```

### Pagination
```typescript
// ✅ Cursor-based pagination for large datasets
const results = await prisma.item.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId },
  orderBy: { id: 'asc' },
});
```

## Rules
- Optimize ONLY what is measurably slow
- Do NOT pre-optimize without evidence
- ALWAYS run tests after optimization
- Document before/after metrics

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
