# Role & Permission Matrix

| Permission | Family Administrator | Family Member | Read-Only User |
|------------|:--------------------:|:-------------:|:--------------:|
| org.manage | ✓ | | |
| users.manage | ✓ | | |
| properties.read | ✓ all | ✓ all | ✓ assigned only |
| properties.write | ✓ | | |
| properties.delete | ✓ | | |
| financials.read | ✓ | ✓ | ✓ |
| maintenance.write | ✓ | ✓ | |
| documents.read | ✓ | ✓ | ✓ |
| documents.write | ✓ | ✓ | |
| documents.delete | ✓ | | |
| reminders.write | ✓ | ✓ | |
| notes.write | ✓ | ✓ | |
| integrations.manage | ✓ | | |
| audit.read | ✓ | | |
| settings.manage | ✓ | | |

New roles can be added by creating a `Role` row and attaching `Permission` keys without schema changes.
