# Firebase & Supabase Security Rules Setup

## Overview
This directory contains Firebase Firestore security rules and Supabase RLS policies.

## Files

| File | Description | Deployment |
|------|-------------|------------|
| `firebase-rules.rules` | Firebase Firestore rules only | `firebase deploy --only firestore:rules` |
| `supabase-rules.sql` | Supabase RLS policies | Run in Supabase SQL Editor |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Firebase   │  │  Firestore  │  │   Supabase Storage  │  │
│  │    Auth     │  │ (Database)  │  │     (Files only)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                 │                    │
         ▼                 ▼                    ▼
┌─────────────────┐ ┌─────────────┐    ┌─────────────────┐
│firebase-rules.  │ │firebase-    │    │  RLS Policies   │
│rules            │ │rules        │    │  (Supabase)     │
│(Firestore)      │ │             │    │                 │
└─────────────────┘ └─────────────┘    └─────────────────┘
```

## Deployment

### Firebase Rules (Firestore only)
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### Supabase Rules (SQL)
Run `supabase-rules.sql` in the Supabase SQL Editor.

## Role-Based Permissions

### Firestore (Database)

| Action              | Admin | Artist | Guest |
|--------------------|-------|--------|-------|
| View Public Art    |   ✓   |   ✓    |   ✓   |
| View All Art       |   ✓   |   ✓    |   ✗   |
| Create Artwork     |   ✓   |   ✓    |   ✗   |
| Update Own Art     |   ✓   |   ✓    |   ✗   |
| Delete Own Art     |   ✓   |   ✓    |   ✗   |
| Update Any Art     |   ✓   |   ✗    |   ✗   |
| Delete Any Art     |   ✓   |   ✗    |   ✗   |
| View Profiles      |   ✓   |   ✓    |   ✓   |
| Edit Own Profile  |   ✓   |   ✓    |   ✓   |
| Edit Any Profile  |   ✓   |   ✗    |   ✗   |
| Delete Users      |   ✓   |   ✗    |   ✗   |
| Manage Reports    |   ✓   |   ✗    |   ✗   |

### Storage (Files via Supabase)

| Action              | Admin | Artist | Guest |
|--------------------|-------|--------|-------|
| View Images        |   ✓   |   ✓    |   ✓   |
| Upload Artwork     |   ✓   |   ✓    |   ✗   |
| Delete Artwork     |   ✓   |   ✓    |   ✗   |
| Upload Avatar      |   ✓   |   ✓    |   ✓   |
| Delete Avatar      |   ✓   |   ✓    |   ✓   |
| Upload Banner      |   ✓   |   ✓    |   ✓   |
| Delete Banner      |   ✓   |   ✓    |   ✓   |

## Current Architecture

| Component | Service | Security Rules |
|-----------|---------|----------------|
| Authentication | Firebase Auth | N/A |
| Database | Firestore | [`firebase-rules.rules`](firebase-rules.rules) |
| File Storage | Supabase Storage | [`supabase-rules.sql`](supabase-rules.sql) |

## Important Notes

1. **Firebase Storage is NOT used** - file storage uses Supabase Storage instead
2. **Firestore rules**: [`firebase-rules.rules`](firebase-rules.rules) (Firestore only, no Storage)
3. **Supabase RLS**: [`supabase-rules.sql`](supabase-rules.sql) for Supabase Storage policies
