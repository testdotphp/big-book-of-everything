# Cloud Sync — Design Document

**Date:** 2026-03-12

## Goal

Sync the Big Book of Everything database between desktop and mobile devices via encrypted snapshots stored in S3-compatible cloud storage.

## Decisions

- **Storage:** S3-compatible cloud (AWS S3, Cloudflare R2, Backblaze B2)
- **Sync unit:** Entire SQLite database as a single encrypted blob
- **Trigger:** Automatic on app open + after every save, plus manual "Sync Now" button
- **Conflict resolution:** Prompt user to choose when two devices have diverged
- **Encryption:** AES-256-GCM client-side encryption before upload — cloud provider never sees plaintext
- **Bucket options:** Hosted sync for paying customers, BYO bucket for power users

## Architecture

### Sync Flow

```
Device A saves data
  → Encrypt SQLite DB with user's encryption password
  → Upload to S3 as encrypted blob
  → Store metadata: device ID, timestamp, checksum

Device B opens app
  → Check S3 for latest snapshot metadata
  → Compare remote timestamp vs local last-sync timestamp
  → If remote is newer → download, decrypt, replace local DB
  → If local is newer → upload local DB
  → If both changed since last sync → prompt user to choose
```

### S3 Object Structure

```
bucket/
└── {user-id}/
    ├── latest.enc              # Most recent encrypted DB snapshot
    ├── latest.meta.json        # Metadata (device ID, timestamp, checksum, schema version)
    └── backups/
        └── {timestamp}.enc     # Previous snapshots (retained for recovery)
```

### Metadata Format

```json
{
  "deviceId": "a1b2c3d4",
  "deviceName": "TJ's iPhone",
  "timestamp": "2026-03-12T14:30:00.000Z",
  "checksum": "sha256:abcdef...",
  "schemaVersion": 1,
  "appVersion": "1.7.1",
  "sizeBytes": 245760
}
```

### Encryption

1. User's encryption password derives a key via PBKDF2 (same as field-level encryption)
2. Entire SQLite file is encrypted with AES-256-GCM before upload
3. IV and auth tag are prepended to the encrypted blob
4. The cloud provider stores only ciphertext — zero-knowledge design
5. Without the encryption password, the snapshot is useless

### Conflict Resolution

When both local and remote have changed since the last sync:

1. App shows a dialog: "This device and [remote device name] both have changes"
2. Displays timestamps and device names for both versions
3. User picks which version to keep
4. The rejected version is saved to `backups/` in S3 for recovery
5. Selected version becomes the new `latest.enc`

No automatic merging — full snapshot replacement only. This avoids data corruption risks with field-level merge conflicts in sensitive family data.

### Sync Triggers

| Event | Action |
|-------|--------|
| App opens | Check S3 for newer snapshot, download if found |
| Data saved (field blur, record add/delete) | Debounced upload — wait 5 seconds after last change, then upload |
| User taps "Sync Now" | Immediate check + upload/download |
| App returns from background (mobile) | Check S3 for newer snapshot |

Debouncing prevents excessive uploads during rapid editing sessions.

## Bucket Configuration

### BYO Bucket (Power Users)

Settings page fields:
- S3 Endpoint URL (for non-AWS providers like R2, B2, MinIO)
- Bucket Name
- Access Key ID
- Secret Access Key
- Region (optional, defaults to `auto`)

Credentials stored encrypted in the local database using the same field-level encryption.

### Hosted Sync (Paid Customers)

- Users authenticate with an account (email/password or OAuth)
- Backend provisions a per-user prefix in a shared bucket
- Credentials are managed server-side — user never sees S3 keys
- Requires a lightweight auth/provisioning API (designed separately when monetization model is decided)

## Implementation Notes

### Existing Code

The project already has `@aws-sdk/client-s3` as a dependency. The sync module uses:
- `PutObjectCommand` — upload encrypted snapshot
- `GetObjectCommand` — download snapshot
- `HeadObjectCommand` — check metadata without downloading

### Sync Module Location

```
src/lib/sync/
├── client.ts          # S3 client initialization from stored credentials
├── upload.ts          # Encrypt DB + upload to S3
├── download.ts        # Download from S3 + decrypt + replace local DB
├── check.ts           # Compare local vs remote timestamps
└── config.ts          # Read/write sync settings (bucket, credentials)
```

### Desktop vs Mobile

- **Desktop (SvelteKit/Electron):** Uses Node.js `@aws-sdk/client-s3` and `fs` to read/write the SQLite file
- **Mobile (Capacitor):** Uses `@aws-sdk/client-s3` (works in browser context) and Capacitor Filesystem plugin to read/write the SQLite file

Same sync logic, different file I/O adapters.

### Backup Retention

- Keep last 10 snapshots in `backups/` prefix
- Older snapshots are deleted automatically on upload
- User can manually restore from any backup via settings UI

## Security Considerations

- Database is always encrypted before leaving the device
- S3 credentials for BYO buckets are stored encrypted locally
- No plaintext data is ever transmitted or stored in the cloud
- Device ID is a random UUID generated on first launch (not tied to hardware identifiers)
- Sync can be disabled entirely — the app works fully offline

## Future Considerations

- **Change-based sync:** If databases grow large (heavy file attachments), switch to delta sync with CRDTs or operational transforms
- **Real-time sync:** WebSocket-based push notifications when another device uploads — not needed initially
- **Shared books:** Multiple users editing the same book — would require a real sync server, not just S3
