# Sitemap — Homefolio

```
/ (redirect → /home or /login)
├── /login
├── /register (invite-only in production; enabled for demo seed)
├── /forgot-password
├── /mfa/setup
├── /mfa/verify
│
├── /home                          # Dashboard
├── /properties                    # Property cards + filters
│   ├── /properties/new            # Guided Add Property (steps 1–5)
│   └── /properties/[id]
│       ├── ?tab=overview          # Default
│       ├── ?tab=financials
│       ├── ?tab=maintenance
│       │   └── /properties/[id]/maintenance/new
│       ├── ?tab=insurance
│       ├── ?tab=documents
│       ├── ?tab=emails            # Phase 4 (stub with empty/mock state)
│       ├── ?tab=contacts
│       ├── ?tab=notes
│       ├── /properties/[id]/edit
│       ├── /properties/[id]/contact-manager
│       └── /properties/[id]/reminders/new
│
├── /reminders
│   └── /reminders/new
│
├── /documents
│   └── /documents/upload
│
├── /search?q=
│
└── /settings
    ├── /settings/users            # Admin
    ├── /settings/integrations     # Admin (stubs Phase 2–4)
    ├── /settings/reminders        # Admin defaults
    ├── /settings/security         # Password, MFA
    └── /settings/audit            # Admin audit log
```

## Navigation Map

| Nav item | Route | Visible to |
|----------|-------|------------|
| Home | `/home` | All roles |
| Properties | `/properties` | All roles |
| Reminders | `/reminders` | All roles |
| Documents | `/documents` | All roles |
| Settings | `/settings` | All roles (admin-only sections gated) |
| Add Property | `/properties/new` | Admin (button hidden for others) |
