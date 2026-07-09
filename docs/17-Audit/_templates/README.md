# Audit Templates & Configuration

This directory contains reusable templates and classification guides for the Enterprise Admin Architecture Audit.

## Template Files

| File | Purpose |
|------|---------|
| `enterprise-document-header.md` | Standard enterprise header template (Document ID, Version, Date, Author, Classification, Status) |
| `classification-guide.md` | Shared classification utilities: severity, priority, effort, finding structure |
| `README.md` | This file — templates index and output manifest |

## Usage

All audit output documents in `docs/17-Audit/` MUST:
1. Include the standard enterprise header from `enterprise-document-header.md`
2. Use severity, priority, and effort classifications from `classification-guide.md`
3. Follow the finding structure defined in `classification-guide.md`
4. Use cross-reference format `[Document ID]#[Finding ID]` for inter-document links
