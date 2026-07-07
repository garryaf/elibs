# Enterprise Prompt Framework for Kiro.dev

## Objective

Saya ingin membuat **Enterprise Prompt Framework** untuk **Kiro.dev**.

Framework ini **bukan bertujuan membuat aplikasi**, tetapi bertujuan
untuk:

-   Mengoptimalkan penggunaan **token**, **source context**, dan
    **credit** Kiro.
-   Membangun workflow yang reusable, modular, scalable, dan dapat
    digunakan pada seluruh repository.

## Initial Analysis Rules

Sebelum melakukan pekerjaan apa pun:

-   Jangan langsung membuat kode.
-   Lakukan analisa repository terlebih dahulu.
-   Gunakan seluruh repository sebagai referensi.

### Mandatory Reading Order

WAJIB membaca:

-   docs/\*\*
-   .kiro/\*\*
-   requirements/\*\*
-   design/\*\*
-   tasks/\*\*
-   architecture/\*\*
-   ADR/\*\*
-   API/\*\*
-   Database/\*\*
-   Functional Specification (FS)
-   BRD
-   SRS

## Goals

1.  Meminimalkan context yang dibaca Kiro.
2.  Memecah pekerjaan menjadi task kecil.
3.  Setiap task dapat dijalankan secara independen.
4.  Setiap task hanya membaca file yang dibutuhkan.
5.  Hindari membaca seluruh repository jika tidak diperlukan.
6.  Requirement memiliki ID konsisten.
7.  Design memiliki ID konsisten.
8.  Task memiliki ID konsisten.
9.  Task hanya membaca:
    -   Requirement terkait
    -   Design terkait
    -   API terkait
    -   Database terkait
    -   Source Code terkait
10. Tidak membaca requirement yang tidak memiliki dependency.
11. Mendukung incremental development.
12. Mendukung resume development apabila chat terputus.
13. Mendukung audit.
14. Mendukung bug fixing.
15. Mendukung feature implementation.
16. Mendukung refactoring.
17. Mendukung documentation update.
18. Membuat dependency graph antar task.
19. Membuat dependency graph antar requirement.
20. Menghasilkan reusable prompt.

------------------------------------------------------------------------

# Expected Output

-   Architecture Prompt Framework
-   Folder Structure
-   Prompt Template
-   Requirement Template
-   Design Template
-   Task Template
-   Dependency Matrix
-   Prompt Lifecycle
-   Context Loading Strategy
-   Token Optimization Strategy
-   Credit Optimization Strategy
-   Best Practice

------------------------------------------------------------------------

# Recommended Folder Structure

``` text
.kiro/
│
├── AGENT.md
│
├── framework/
│   ├── prompt-framework.md
│   ├── lifecycle.md
│   ├── context-loading.md
│   ├── token-strategy.md
│   ├── credit-strategy.md
│   ├── naming-standard.md
│   ├── dependency-rules.md
│   ├── workflow.md
│   └── task-priority.md
│
├── prompts/
│   ├── audit.md
│   ├── bug.md
│   ├── feature.md
│   ├── design.md
│   ├── review.md
│   ├── refactor.md
│   ├── testing.md
│   ├── documentation.md
│   ├── security.md
│   ├── performance.md
│   └── uiux.md
│
├── templates/
│   ├── requirement.md
│   ├── design.md
│   ├── task.md
│   ├── api.md
│   ├── database.md
│   ├── testing.md
│   ├── bug.md
│   └── feature.md
│
└── tasks/
    ├── TASK-0001
    ├── TASK-0002
    └── TASK-0003
```

------------------------------------------------------------------------

# Requirement Template

``` text
FR-0001

Title

Objective

Business Rules

Acceptance Criteria

Dependencies

API

Database

UI

Security

Performance

Testing

Documentation
```

------------------------------------------------------------------------

# Design Template

``` text
DES-0001

Overview

Architecture

Sequence

Flow

API

Database

Validation

Error Handling

Security

Performance

Testing

Dependencies
```

------------------------------------------------------------------------

# Task Template

``` text
TASK-0001

Title

Objective

Related Requirement

Related Design

Dependencies

Files to Read

Files to Ignore

Implementation Steps

Validation

Testing

Documentation Update

Acceptance Criteria

Done Definition
```

------------------------------------------------------------------------

# Context Loading Strategy

Selalu gunakan workflow berikut:

``` text
Step 1
Read AGENT.md
        ↓
Step 2
Read Requirement
        ↓
Step 3
Read Design
        ↓
Step 4
Read Related API
        ↓
Step 5
Read Related Database
        ↓
Step 6
Read Only Related Source Code
        ↓
Implement
        ↓
Update Docs
```

------------------------------------------------------------------------

# Framework Principles

-   Read minimum context.
-   Build reusable prompts.
-   Avoid duplicate context loading.
-   Isolate every task.
-   Maintain dependency graph.
-   Update documentation after every completed task.
-   Never modify unrelated modules.
-   Always validate implementation against Requirement, Design, API, and
    Database.

------------------------------------------------------------------------

# Success Criteria

Framework dianggap berhasil apabila:

-   Token usage minimum.
-   Credit usage minimum.
-   Prompt dapat digunakan ulang.
-   Task dapat dijalankan secara independen.
-   Mendukung audit, bug fixing, feature development, refactoring, dan
    dokumentasi.
-   Seluruh dependency dapat ditelusuri secara jelas.
