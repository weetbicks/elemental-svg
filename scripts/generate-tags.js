#!/usr/bin/env node

/**
 * Icon Tag Generator for Elemental SVG Icon Browser
 *
 * Generates semantic search tags for all icons using two strategies:
 *   1. Cross-reference: reuse tags from already-tagged icons with the same name
 *   2. AI generation: use Claude API to generate tags for remaining icons
 *
 * Resumable — re-run safely to pick up where it left off.
 *
 * Prerequisites:
 *   - Build manifest first: node scripts/process-icons.js
 *   - Set ANTHROPIC_API_KEY environment variable
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-tags.js
 *
 * Options:
 *   --dry-run       Show stats without calling API
 *   --batch-size N  Icons per API batch (default: 150)
 *
 * Output:
 *   scripts/icon-tags.json — { "icon-base-name": ["tag1", "tag2", ...], ... }
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'build', 'icons', 'manifest.json');
const OUTPUT_PATH = path.join(__dirname, 'icon-tags.json');
const DEFAULT_BATCH_SIZE = 150;
const DELAY_MS = 300;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, batchSize: DEFAULT_BATCH_SIZE };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    if (args[i] === '--batch-size' && args[i + 1]) opts.batchSize = parseInt(args[i + 1], 10);
  }
  return opts;
}

function extractBaseName(iconId) {
  // "lucide/arrow-left" → "arrow-left"
  // "tabler/outline/arrow-left" → "arrow-left"
  return iconId.split('/').pop();
}

async function main() {
  const opts = parseArgs();

  // 1. Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found. Run process-icons.js first.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Loaded manifest: ${manifest.icons.length} icons\n`);

  // 2. Load existing icon-tags.json for resumability
  let tagDict = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    tagDict = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`Loaded existing icon-tags.json: ${Object.keys(tagDict).length} entries`);
  }

  // 3. Build name→tags dictionary from already-tagged icons in the manifest
  const fromManifest = {};
  for (const icon of manifest.icons) {
    if (icon.tags && icon.tags.length > 0) {
      const baseName = extractBaseName(icon.id);
      if (!fromManifest[baseName]) {
        fromManifest[baseName] = new Set();
      }
      for (const tag of icon.tags) {
        fromManifest[baseName].add(tag.toLowerCase());
      }
    }
  }

  // Merge manifest tags into tagDict (don't overwrite existing AI-generated tags)
  let crossRefCount = 0;
  for (const [name, tagSet] of Object.entries(fromManifest)) {
    if (!tagDict[name]) {
      tagDict[name] = [...tagSet];
      crossRefCount++;
    }
  }
  console.log(`Cross-referenced ${crossRefCount} new names from manifest tags`);
  console.log(`Tag dictionary now has ${Object.keys(tagDict).length} entries\n`);

  // 4. Find all unique base names that still need tags
  const allBaseNames = new Set();
  const nameCategories = {};
  for (const icon of manifest.icons) {
    const baseName = extractBaseName(icon.id);
    allBaseNames.add(baseName);
    // Keep the first non-misc category we find for context
    if (!nameCategories[baseName] || nameCategories[baseName] === 'misc') {
      nameCategories[baseName] = icon.category;
    }
  }

  const needTags = [...allBaseNames].filter(name => !tagDict[name]).sort();

  console.log(`Total unique base names: ${allBaseNames.size}`);
  console.log(`Already tagged: ${allBaseNames.size - needTags.length}`);
  console.log(`Need AI-generated tags: ${needTags.length}\n`);

  if (needTags.length === 0) {
    console.log('All icons already have tags! Nothing to do.');
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tagDict, null, 2));
    console.log(`Saved ${Object.keys(tagDict).length} entries to ${OUTPUT_PATH}`);
    return;
  }

  if (opts.dryRun) {
    console.log('Dry run — not calling API. Sample of icons needing tags:');
    for (const name of needTags.slice(0, 30)) {
      console.log(`  ${name} (${nameCategories[name]})`);
    }
    if (needTags.length > 30) console.log(`  ... and ${needTags.length - 30} more`);
    return;
  }

  // 5. Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable not set.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-tags.js');
    process.exit(1);
  }

  const client = new Anthropic();

  // 6. Batch and call Claude API
  const batches = [];
  for (let i = 0; i < needTags.length; i += opts.batchSize) {
    batches.push(needTags.slice(i, i + opts.batchSize));
  }

  console.log(`Processing ${batches.length} batches of ~${opts.batchSize} icons each...\n`);

  let totalGenerated = 0;
  let failures = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    process.stdout.write(`Batch ${batchNum}/${batches.length} (${batch.length} icons)... `);

    const iconList = batch.map(name =>
      `${name} | ${nameCategories[name] || 'misc'}`
    ).join('\n');

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `You are generating search tags for a design icon library used by designers and developers. For each icon name below, generate 5-12 lowercase search tags.

Tags should include:
- Synonyms (e.g., "trash" → "delete", "remove", "bin", "garbage")
- Related concepts (e.g., "sun" → "weather", "bright", "day", "light")
- Use-case terms (e.g., "credit-card" → "payment", "checkout", "billing")
- Common search terms a designer would use to find this icon
- Do NOT include the icon's own name as a tag (it's already searchable by name)

The format is: icon-name | category-hint

Return ONLY a valid JSON object mapping each icon name to its tag array. No explanation, no markdown fences.

${iconList}`
        }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const batchTags = JSON.parse(jsonMatch[0]);
        let batchCount = 0;
        for (const [name, tags] of Object.entries(batchTags)) {
          if (Array.isArray(tags) && tags.length > 0) {
            tagDict[name] = tags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
            batchCount++;
          }
        }
        totalGenerated += batchCount;
        console.log(`${batchCount} tagged`);
      } else {
        console.log('FAILED (no JSON in response)');
        failures++;
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failures++;

      // On rate limit, wait longer and retry
      if (err.status === 429) {
        console.log('  Rate limited — waiting 10s before retry...');
        await new Promise(r => setTimeout(r, 10000));
        i--; // Retry this batch
        continue;
      }
    }

    // Save after every batch for resumability
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tagDict, null, 2));

    // Rate limit courtesy
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nDone!`);
  console.log(`  AI-generated tags for ${totalGenerated} new icon names`);
  console.log(`  Failures: ${failures}`);
  console.log(`  Total entries in tag dictionary: ${Object.keys(tagDict).length}`);
  console.log(`  Saved to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
