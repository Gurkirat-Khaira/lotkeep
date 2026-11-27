# 0004: MinIO image from Chainguard, pinned by digest

- **Status:** accepted
- **Date:** 2026-11-27
- **Deciders:** owner (chose this option), builder
- **Plan task:** Plan 1, Task 2

## Context
The spec (§5.1) and Plan 1 Task 2 use MinIO with object locking for write-once records
(13 CCR 272.02). MinIO stopped publishing free community images in October 2025, and in
September 2026 `minio/minio` and `minio/mc` were removed from Docker Hub. On 2026-11-27,
`docker manifest inspect` found neither image on Docker Hub nor on `quay.io/minio`.

Options considered:
1. Chainguard's MinIO build;
2. RustFS (Apache-2.0, S3-compatible with Object Lock);
3. building the last community release from source (upstream archived, so no security fixes).

## Decision
- Use `cgr.dev/chainguard/minio`, **pinned by digest** in `docker/compose.dev.yml`. On 2026-11-27
  it reported `RELEASE.2026-11-23T00-10-37Z`.
- The image contains `mc` and `/bin/sh`. The same pinned image runs:
  - the server;
  - the healthcheck (`mc ready local`);
  - the one-shot `minio-init` service (`docker/minio/init.sh`).

  There is one digest to maintain.
- The spec, plan and `CLAUDE.md` are unchanged: it is still MinIO.
- The app's S3 user (`dms-app`) gets the bucket-scoped policy `dms-records-app`: read, write,
  retention and legal hold. There is **no delete and no governance bypass**. `init.sh` proves this
  on every run with a write-then-delete probe.

## Consequences
- Chainguard's free tier publishes only `latest`, and Dependabot doesn't track it. Update the
  digest by hand: `docker buildx imagetools inspect cgr.dev/chainguard/minio:latest`.
- Later tasks that need to delete non-record objects (for example abandoned uploads) must add a
  separate prefix and policy; records stay undeletable by the app.
- The bucket has object lock enabled but **no default retention**. Write-once therefore depends on
  the app setting a retention period on each record, which fits the per-item retention clocks of
  spec §5.5. Plan 7 (Records) must set it, and must decide whether the app may remove legal holds
  (`PutObjectLegalHold` is granted today).
- **Revisit before the production-readiness gate:** hosted (S3 Object Lock) and self-host
  guidance; reconsider RustFS if Chainguard access changes.

## Alternatives considered
- RustFS: newer, less proven Object Lock behaviour, and the docs would change.
- Build from source: no upstream security fixes, and a Go build on every setup and CI run.
- `quay.io/minio/minio`: no longer available.
