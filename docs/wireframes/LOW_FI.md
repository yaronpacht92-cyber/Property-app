# Low-Fidelity Wireframes — Homefolio

ASCII wireframes for primary screens. Design notes: large type, high contrast, calm sage/slate palette, no dense charts, always show Back and primary actions.

## Home Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Homefolio          [Home] [Properties] [Reminders] [Docs] [Settings] │
├─────────────────────────────────────────────────────────────┤
│  Good morning, Pat                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Search properties, addresses, documents, or notes │   │
│  └─────────────────────────────────────────────────────┘   │
│  [ + Add Property ]                                         │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ Insurance│ │ Tax      │ │ Maint.   │      │
│  │ Props 5  │ │ Renewals │ │ Deadlines│ │ Due  2   │      │
│  │          │ │    2     │ │    1     │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  Needs Attention                                            │
│  • Oak Street — Insurance renews in 28 days   [View]       │
│  • Harbor Apt — Maintenance overdue           [View]       │
│                                                             │
│  Recently Updated                     Integrations          │
│  • Maple Vacant Land — today          QuickBooks: Connected │
│  • Pine Commercial — yesterday        Email: Not connected  │
└─────────────────────────────────────────────────────────────┘
```

## Properties List

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Home                                              │
│ Properties                              [ + Add Property ]  │
│ [All] [Residential] [Commercial] [Vacant Land] [Other]      │
│                                                             │
│ ┌──────── photo ────────┐  Oak Street Rental                │
│ │                       │  123 Oak St, Austin, TX           │
│ │                       │  Residential · Est. $485,000*     │
│ └───────────────────────┘  Manager: Jane Lee                │
│                            Reminder: Insurance in 28 days   │
│                            [ View Property ]                │
└─────────────────────────────────────────────────────────────┘
* Estimated values labeled clearly
```

## Add Property (Step indicator)

```
Step 1 of 5 — Basic Information
[Nickname] [Address] [City] [State] [ZIP]
[Property type buttons] [Ownership entity] [Dates] [Photo]
              [Back]  [Skip for now]  [Continue →]
```

## Property Profile

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Properties                                        │
│ Oak Street Rental                                           │
│ 123 Oak St · Residential · Owned by Pacht Family Trust      │
│ Est. value $485,000* · Taxes $9,200/yr · Manager Jane Lee   │
│                                                             │
│ [Edit] [Add Maintenance] [Upload Doc] [Add Reminder]        │
│ [Contact Manager] [View Emails] [Add Note]                  │
│                                                             │
│ [Overview] [Financials] [Maintenance] [Insurance]           │
│ [Documents] [Emails] [Contacts] [Notes]                     │
│                                                             │
│ Summary panels… upcoming deadlines, recent activity         │
└─────────────────────────────────────────────────────────────┘
```

## Contact Property Manager

```
┌──────────────────────────────┐
│ Contact Property Manager     │
│ Jane Lee · Harbor Mgmt       │
│ (512) 555-0142               │
│ jane@harbormgmt.example      │
│ Emergency: call after 6pm…   │
│ [Call] [Send Email]          │
│ [Copy Email] [Related Emails]│
│ [Close]                      │
└──────────────────────────────┘
```

## Reminders

```
Needs attention first, then upcoming.
Each row: title, property, due date, status badge (text+icon)
[Mark Complete] [Dismiss]
```
