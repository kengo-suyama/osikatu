# Data Retention Policy

## Account Deletion

When a user deletes their account:

1. **Soft Delete**: User record is marked with `deleted_at` timestamp
2. **Data Preserved**: All associated data (circles, posts, settlements) is preserved
3. **Access Blocked**: Soft-deleted users cannot authenticate or access the API

## Retention Period

- Soft-deleted accounts are retained for **90 days** for compliance and support purposes
- After 90 days, a scheduled job may permanently delete the data (not yet implemented)

## Related Data

Circle memberships, posts, and other user-generated content remain in the database
but are effectively orphaned. Circle owners should be notified to clean up if needed.
