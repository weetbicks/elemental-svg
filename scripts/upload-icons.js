#!/usr/bin/env node

/**
 * Upload icons to Cloudflare R2 and manifest to KV.
 *
 * Prerequisites:
 *   - Run process-icons.js first to generate build/icons/
 *   - wrangler authenticated (npx wrangler login)
 *
 * Usage:
 *   node scripts/upload-icons.js              # Upload everything
 *   node scripts/upload-icons.js --manifest   # Only upload manifest to KV
 *   node scripts/upload-icons.js --svgs       # Only upload SVGs to R2
 *   node scripts/upload-icons.js --svgs --lib tabler   # Only upload one library
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build', 'icons');
const MANIFEST_FILE = path.join(BUILD_DIR, 'manifest.json');
const WORKER_DIR = path.join(__dirname, '..', '..', 'cloudflare-worker');
const KV_NAMESPACE_ID = '6f0078578b6e45cd9fe6460d04dba158';
const R2_BUCKET = 'elemental-icons';
const CONCURRENCY = 15; // parallel wrangler processes

const args = process.argv.slice(2);
const uploadManifest = args.length === 0 || args.includes('--manifest');
const uploadSvgs = args.length === 0 || args.includes('--svgs');
const libFilter = args.includes('--lib') ? args[args.indexOf('--lib') + 1] : null;

function runSync(cmd, label) {
  try {
    execSync(cmd, { stdio: 'pipe', cwd: WORKER_DIR });
    return true;
  } catch (e) {
    console.error(`  FAILED: ${label}`);
    console.error(`  ${e.stderr?.toString().trim() || e.message}`);
    return false;
  }
}

function runAsync(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: WORKER_DIR, maxBuffer: 1024 * 1024 }, (error) => {
      resolve(!error);
    });
  });
}

// Run tasks with concurrency limit
async function parallelMap(items, fn, concurrency) {
  let index = 0;
  let completed = 0;
  let failed = 0;
  const total = items.length;
  const startTime = Date.now();

  async function worker() {
    while (index < total) {
      const i = index++;
      const ok = await fn(items[i]);
      if (ok) completed++;
      else failed++;
      const done = completed + failed;
      if (done % 100 === 0 || done === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (done / (Date.now() - startTime) * 1000).toFixed(1);
        console.log(`   ... ${done}/${total} (${rate}/s, ${elapsed}s elapsed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { completed, failed };
}

// Recursively find all SVG files, preserving relative paths
function findSvgs(dir, baseDir) {
  let results = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findSvgs(fullPath, baseDir));
    } else if (entry.endsWith('.svg')) {
      results.push({
        localPath: fullPath,
        r2Key: path.relative(baseDir, fullPath),
      });
    }
  }
  return results;
}

async function main() {
  // Validate build exists
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error('Error: build/icons/manifest.json not found. Run process-icons.js first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  console.log(`Upload Pipeline — ${manifest.icons.length} icons, ${manifest.libraries.length} libraries`);
  console.log('═'.repeat(50));

  // Upload manifest to KV
  if (uploadManifest) {
    console.log('\n1. Uploading manifest to KV...');
    const ok = runSync(
      `npx wrangler kv key put --namespace-id=${KV_NAMESPACE_ID} --remote icon-manifest --path "${MANIFEST_FILE}"`,
      'manifest upload'
    );
    if (ok) console.log('   ✓ icon-manifest uploaded to KV');

    // Upload library metadata separately
    const libData = JSON.stringify({ libraries: manifest.libraries }, null, 2);
    const libFile = path.join(BUILD_DIR, 'libraries.json');
    fs.writeFileSync(libFile, libData);
    const ok2 = runSync(
      `npx wrangler kv key put --namespace-id=${KV_NAMESPACE_ID} --remote icon-libraries --path "${libFile}"`,
      'libraries upload'
    );
    if (ok2) console.log('   ✓ icon-libraries uploaded to KV');
  }

  // Upload SVGs to R2
  if (uploadSvgs) {
    console.log('\n2. Uploading SVGs to R2...');

    let allSvgs = findSvgs(BUILD_DIR, BUILD_DIR);

    // Filter to specific library if requested
    if (libFilter) {
      allSvgs = allSvgs.filter(s => s.r2Key.startsWith(libFilter + '/'));
      console.log(`   Filtered to ${libFilter}/ — ${allSvgs.length} files`);
    }

    console.log(`   Uploading ${allSvgs.length} SVG files (${CONCURRENCY} concurrent)...`);

    const { completed, failed } = await parallelMap(
      allSvgs,
      ({ localPath, r2Key }) => runAsync(
        `npx wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file "${localPath}" --remote --content-type "image/svg+xml"`
      ),
      CONCURRENCY
    );

    console.log(`\n   ✓ ${completed} SVGs uploaded to R2`);
    if (failed > 0) console.log(`   ✗ ${failed} failed`);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('Done.');
}

main();
