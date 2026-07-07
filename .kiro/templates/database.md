# DB-XXXX: [Migration/Schema Name]

## Status: [DRAFT | APPLIED | ROLLED_BACK]

## Overview
Deskripsi singkat perubahan database.

## Changes

### New Tables
```prisma
model TableName {
  id        String   @id @default(uuid())
  field1    String
  field2    Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  @@map("table_name")
}
```

### Modified Tables
```prisma
// Added fields to existing model
model ExistingTable {
  // ... existing fields ...
  newField String? // NEW: description of purpose
}
```

### New Indexes
```prisma
@@index([field1, field2])
@@unique([email])
```

### New Relations
```prisma
model Parent {
  id       String  @id @default(uuid())
  children Child[]
}

model Child {
  id       String @id @default(uuid())
  parentId String @map("parent_id")
  parent   Parent @relation(fields: [parentId], references: [id])
}
```

## Migration Command
```bash
npx prisma migrate dev --name migration_name
```

## Rollback Plan
```sql
-- Steps to reverse this migration
DROP TABLE IF EXISTS table_name;
ALTER TABLE existing_table DROP COLUMN new_field;
```

## Data Impact
- New records: None (schema only)
- Existing records affected: None
- Data migration needed: No

## Performance Impact
- Index added: [describe]
- Expected query improvement: [describe]

## Related
- Requirement: FR-XXXX
- Design: DES-XXXX
- Task: TASK-XXXX
