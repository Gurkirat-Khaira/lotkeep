#!/bin/sh
# One-shot MinIO setup (runs in the minio-init service after MinIO is healthy). Idempotent.
# - bucket $S3_BUCKET with object lock (write-once records, 13 CCR 272.02) and versioning on;
# - an app user ($S3_ACCESS_KEY) limited to that bucket, with no delete or lock-bypass rights.
# Secret values are never printed.
set -eu

: "${S3_BUCKET:?}" "${S3_ACCESS_KEY:?}" "${S3_SECRET_KEY:?}" "${MC_HOST_local:?}"

i=0
until mc ready local >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -lt 30 ] || { echo "minio-init: MinIO did not become ready" >&2; exit 1; }
  sleep 1
done

# --with-lock enables object locking (and versioning) at creation; it cannot be added later.
mc mb --ignore-existing --with-lock "local/${S3_BUCKET}"
mc version enable "local/${S3_BUCKET}" >/dev/null
# The image has no grep: match the JSON with shell patterns.
case "$(mc retention info --default --json "local/${S3_BUCKET}")" in
  *'"enabled":"Enabled"'*) ;;
  *)
    echo "minio-init: object lock is not enabled on ${S3_BUCKET}." >&2
    echo "  The bucket existed without a lock. Run 'pnpm dev:reset' to recreate it." >&2
    exit 1
    ;;
esac

policy="$(mktemp)"
cat >"$policy" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketVersions", "s3:GetBucketObjectLockConfiguration", "s3:GetBucketVersioning"],
      "Resource": ["arn:aws:s3:::${S3_BUCKET}"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject", "s3:GetObjectRetention", "s3:PutObjectRetention", "s3:GetObjectLegalHold", "s3:PutObjectLegalHold"],
      "Resource": ["arn:aws:s3:::${S3_BUCKET}/*"]
    }
  ]
}
EOF
mc admin policy create local dms-records-app "$policy" >/dev/null
rm -f "$policy"

mc admin user add local "${S3_ACCESS_KEY}" "${S3_SECRET_KEY}" >/dev/null
case "$(mc admin user info --json local "${S3_ACCESS_KEY}")" in
  *'"policyName":"dms-records-app"'*) ;;
  *) mc admin policy attach local dms-records-app --user "${S3_ACCESS_KEY}" >/dev/null ;;
esac

# Self-check: the app user can write but cannot delete. Root then removes the probe.
host="${MC_HOST_local##*@}"
export MC_HOST_app="http://${S3_ACCESS_KEY}:${S3_SECRET_KEY}@${host}"
probe="_init-probe/$(date +%s)"
echo "probe" | mc pipe "app/${S3_BUCKET}/${probe}" >/dev/null
if rm_out="$(mc rm "app/${S3_BUCKET}/${probe}" 2>&1)"; then
  echo "minio-init: the app user can delete objects; the policy is too broad" >&2
  exit 1
fi
case "$rm_out" in
  *"Access Denied"* | *AccessDenied*) ;;
  *) echo "minio-init: delete probe failed for an unexpected reason: $rm_out" >&2; exit 1 ;;
esac
mc rm --versions --force "local/${S3_BUCKET}/${probe}" >/dev/null

echo "minio-init: bucket ${S3_BUCKET} (object lock + versioning) and app user ready"
