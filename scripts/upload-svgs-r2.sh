#!/bin/bash
# Bulk upload SVGs to R2 — parallel background jobs
# Usage: bash scripts/upload-svgs-r2.sh [concurrency]
# Run from elemental-svg/ directory

MAX_JOBS=${1:-10}
SVG_DIR="$(pwd)/build/icons/lucide"
BUCKET="elemental-icons"
WORKER_DIR="$(pwd)/../cloudflare-worker"
DONE=0
TOTAL=0

# Count total
for f in "$SVG_DIR"/*.svg; do
  [ -f "$f" ] && TOTAL=$((TOTAL + 1))
done

echo "Uploading $TOTAL SVGs to R2 (max $MAX_JOBS parallel)"
echo "═══════════════════════════════════════════"

for file in "$SVG_DIR"/*.svg; do
  [ -f "$file" ] || continue
  name=$(basename "$file")

  # Run upload in background
  (
    cd "$WORKER_DIR" && npx wrangler r2 object put "${BUCKET}/lucide/${name}" \
      --file "$file" --remote --content-type "image/svg+xml" > /dev/null 2>&1
  ) &

  # Limit concurrent jobs
  while [ $(jobs -rp | wc -l) -ge "$MAX_JOBS" ]; do
    sleep 0.2
  done

  DONE=$((DONE + 1))
  if [ $((DONE % 50)) -eq 0 ]; then
    echo "  $DONE / $TOTAL uploaded..."
  fi
done

# Wait for remaining jobs
wait

echo "═══════════════════════════════════════════"
echo "Done. $TOTAL SVGs uploaded."
