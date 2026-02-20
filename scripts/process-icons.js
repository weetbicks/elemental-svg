#!/usr/bin/env node

/**
 * Icon Processing Pipeline for Elemental SVG Icon Browser
 *
 * Processes SVGs from multiple icon libraries, categorizes them, and generates
 * a unified manifest JSON plus organized SVG files ready for R2 upload.
 *
 * Libraries: Lucide, Tabler, Heroicons, Phosphor, Bootstrap Icons, Iconoir
 *
 * Usage:
 *   node scripts/process-icons.js
 *
 * Outputs:
 *   build/icons/manifest.json              — Full icon manifest (for KV upload)
 *   build/icons/libraries.json             — Library metadata (for KV upload)
 *   build/icons/{library}/{style}/name.svg — SVGs organized by library/style (for R2)
 *   build/icons/report.json                — Processing stats
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────

const NODE_MODULES = path.join(__dirname, '..', 'node_modules');
const OUTPUT_DIR = path.join(__dirname, '..', 'build', 'icons');

// Lucide
const LUCIDE_ICONS_DIR = path.join(NODE_MODULES, 'lucide-static', 'icons');
const LUCIDE_TAGS_FILE = path.join(NODE_MODULES, 'lucide-static', 'tags.json');

// Tabler
const TABLER_OUTLINE_DIR = path.join(NODE_MODULES, '@tabler', 'icons', 'icons', 'outline');
const TABLER_FILLED_DIR = path.join(NODE_MODULES, '@tabler', 'icons', 'icons', 'filled');
const TABLER_CATEGORIES_DIR = path.join(NODE_MODULES, '@tabler', 'icons', 'categories', 'outline');
const TABLER_META_FILE = path.join(NODE_MODULES, '@tabler', 'icons', 'icons.json');

// Heroicons
const HEROICONS_OUTLINE_DIR = path.join(NODE_MODULES, 'heroicons', '24', 'outline');
const HEROICONS_SOLID_DIR = path.join(NODE_MODULES, 'heroicons', '24', 'solid');

// Phosphor
const PHOSPHOR_ASSETS_DIR = path.join(NODE_MODULES, '@phosphor-icons', 'core', 'assets');
const PHOSPHOR_META_FILE = path.join(NODE_MODULES, '@phosphor-icons', 'core', 'dist', 'index.umd.js');

// Bootstrap Icons
const BOOTSTRAP_ICONS_DIR = path.join(NODE_MODULES, 'bootstrap-icons', 'icons');

// Iconoir
const ICONOIR_REGULAR_DIR = path.join(NODE_MODULES, 'iconoir', 'icons', 'regular');
const ICONOIR_SOLID_DIR = path.join(NODE_MODULES, 'iconoir', 'icons', 'solid');

// ── Categories ──────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'arrows', label: 'Arrows & Chevrons' },
  { id: 'navigation', label: 'Navigation & Layout' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'files', label: 'Files & Folders' },
  { id: 'communication', label: 'Communication' },
  { id: 'media', label: 'Media & Audio' },
  { id: 'people', label: 'People & Users' },
  { id: 'commerce', label: 'Commerce & Finance' },
  { id: 'security', label: 'Security & Privacy' },
  { id: 'controls', label: 'Settings & Controls' },
  { id: 'infrastructure', label: 'Infrastructure & Data' },
  { id: 'actions', label: 'Actions & Favorites' },
  { id: 'notifications', label: 'Notifications & Alerts' },
  { id: 'location', label: 'Location & Maps' },
  { id: 'visual', label: 'Images & Video' },
  { id: 'development', label: 'Development & Code' },
  { id: 'weather', label: 'Weather & Nature' },
  { id: 'shapes', label: 'Shapes & Symbols' },
  { id: 'text', label: 'Text & Typography' },
  { id: 'misc', label: 'Miscellaneous' },
];

// Keywords that map to categories. Checked against icon filename and tags.
// Order matters — first match wins. More specific keywords come first.
const CATEGORY_KEYWORDS = {
  arrows: [
    'arrow', 'chevron', 'caret', 'move-', 'corner-', 'maximize', 'minimize',
    'expand', 'shrink', 'fold', 'unfold', 'between', 'iterate', 'repeat',
    'undo', 'redo', 'rotate', 'flip', 'refresh', 'replace', 'swap',
    'merge', 'split', 'return', 'forward', 'backward',
  ],
  navigation: [
    'home', 'house', 'menu', 'sidebar', 'layout', 'grid', 'list', 'panel',
    'columns', 'rows', 'table', 'kanban', 'dock', 'app-window', 'panel',
    'navigation', 'breadcrumb', 'pagination', 'tab', 'gallery', 'scroll',
    'separator', 'grip', 'between-', 'ellipsis', 'more-horizontal',
    'more-vertical', 'anchor', 'loader', 'layers', 'form-input',
  ],
  datetime: [
    'calendar', 'clock', 'timer', 'watch', 'hourglass', 'alarm',
    'schedule', 'stopwatch', 'history', 'time',
  ],
  files: [
    'file', 'folder', 'document', 'copy', 'clipboard', 'paste',
    'notebook', 'book', 'archive', 'package', 'box', 'save',
    'download', 'upload', 'import', 'export', 'attachment',
  ],
  communication: [
    'mail', 'message', 'phone', 'chat', 'send', 'inbox', 'contact',
    'at-sign', 'reply', 'voicemail', 'satellite', 'radio', 'rss',
    'share', 'megaphone', 'speech', 'conversation', 'comment',
  ],
  media: [
    'play', 'pause', 'stop', 'volume', 'music', 'mic', 'headphone',
    'speaker', 'audio', 'podcast', 'disc', 'vinyl', 'guitar',
    'drum', 'piano', 'amp', 'equalizer', 'fast-forward', 'rewind',
    'skip', 'shuffle', 'repeat', 'cassette', 'gamepad', 'joystick',
    'chess',
  ],
  people: [
    'user', 'users', 'person', 'baby', 'accessibility', 'hand',
    'thumbs', 'brain', 'head', 'footprints', 'figure', 'body',
    'bone', 'ear', 'eye-', 'glasses', 'smile', 'frown', 'meh',
    'angry', 'annoyed', 'laugh', 'drama',
  ],
  commerce: [
    'cart', 'bag', 'credit-card', 'dollar', 'wallet', 'receipt',
    'banknote', 'coin', 'currency', 'bitcoin', 'store', 'shop',
    'tag', 'barcode', 'price', 'percent', 'badge-', 'ticket',
    'gift', 'piggy', 'landmark', 'building', 'calculator', 'tally',
    'scale', 'school',
  ],
  security: [
    'lock', 'key', 'shield', 'scan', 'fingerprint', 'guard',
    'keyhole', 'unlock', 'vault',
  ],
  controls: [
    'settings', 'sliders', 'toggle', 'tool', 'wrench', 'hammer',
    'screwdriver', 'nut', 'bolt', 'cog', 'gear', 'filter',
    'sort', 'adjust', 'configure', 'switch', 'power',
    'plug', 'socket', 'cable', 'usb', 'bluetooth', 'wifi', 'nfc',
    'signal', 'antenna', 'gauge', 'touchpad', 'fan',
  ],
  infrastructure: [
    'cloud', 'database', 'server', 'hard-drive', 'cpu', 'memory',
    'network', 'container', 'blocks', 'workflow', 'circuit',
    'binary', 'ethernet', 'router', 'monitor', 'screen', 'laptop',
    'tablet', 'smartphone', 'desktop', 'printer', 'keyboard',
    'mouse', 'computer', 'display', 'chart', 'bar-chart', 'line-chart',
    'area-chart', 'pie-chart', 'gantt-chart', 'scatter-chart',
    'candlestick-chart', 'trending', 'tv',
  ],
  actions: [
    'heart', 'star', 'bookmark', 'thumb', 'flag', 'pin',
    'like', 'check', 'plus', 'minus', 'x', 'close', 'delete',
    'trash', 'remove', 'add', 'create', 'edit', 'pencil', 'pen',
    'eraser', 'scissors', 'crop', 'cut', 'zap', 'sparkle',
    'wand', 'magic', 'search', 'zoom', 'eye', 'lightbulb', 'lasso',
    'link', 'rocket', 'verified', 'medal', 'ribbon', 'inspect',
    'grab', 'crosshair', 'cross',
  ],
  notifications: [
    'alert', 'bell', 'info', 'warning', 'siren', 'megaphone',
    'help-circle', 'badge', 'notification', 'announce', 'circle-alert',
    'triangle-alert', 'octagon-alert',
  ],
  location: [
    'map', 'pin', 'globe', 'compass', 'navigation', 'route',
    'locate', 'gps', 'waypoint', 'milestone', 'sign-post', 'signpost',
    'mountain', 'tent', 'tree', 'flower', 'leaf',
    'train', 'bus', 'car', 'plane', 'bike', 'motorbike', 'scooter',
    'tractor', 'tram', 'ship', 'sail', 'rail', 'fuel', 'parking',
    'ferry', 'truck',
  ],
  visual: [
    'image', 'camera', 'video', 'film', 'photo', 'picture',
    'aperture', 'focus', 'frame', 'gallery', 'canvas',
    'projector', 'presentation', 'screenshot',
    'paintbrush', 'paint', 'palette', 'spray-can', 'sticker',
    'drone', 'feather',
  ],
  development: [
    'code', 'terminal', 'git', 'bug', 'bracket', 'braces',
    'regex', 'variable', 'function', 'webhook', 'api',
    'component', 'puzzle', 'block', 'atom', 'test-tube',
  ],
  weather: [
    'sun', 'moon', 'cloud-rain', 'cloud-snow', 'cloud-lightning',
    'cloud-drizzle', 'cloud-hail', 'cloud-fog', 'wind', 'rainbow',
    'snowflake', 'thermometer', 'umbrella', 'tornado', 'sunrise',
    'sunset', 'eclipse', 'droplet', 'wave', 'flame', 'fire',
    'haze', 'shrub',
  ],
  shapes: [
    'circle', 'square', 'triangle', 'hexagon', 'octagon', 'pentagon',
    'diamond', 'rectangle', 'oval', 'cylinder', 'cone', 'cube',
    'pyramid', 'sphere', 'torus', 'shape', 'infinity', 'sigma',
    'slash', 'scaling', 'origami',
  ],
  text: [
    'type', 'text', 'bold', 'italic', 'font', 'underline',
    'strikethrough', 'heading', 'paragraph', 'quote', 'list',
    'indent', 'align-', 'subscript', 'superscript', 'case',
    'spell', 'whole-word', 'pilcrow', 'baseline', 'wrap',
    'a-arrow', 'a-large', 'remove-formatting', 'languages',
    'subtitles', 'outdent',
  ],
};

// Some keywords appear in multiple categories. These overrides resolve
// ambiguity for specific icon name prefixes (checked before keyword matching).
const NAME_OVERRIDES = {
  // These start with "cloud" but aren't weather
  'cloud-download': 'infrastructure',
  'cloud-upload': 'infrastructure',
  'cloud-off': 'infrastructure',
  'cloud-cog': 'infrastructure',
  // "eye" could be people or actions
  'eye': 'actions',
  'eye-off': 'actions',
  // "scan" could be security or visual
  'scan-face': 'security',
  'scan-line': 'security',
  'scan-barcode': 'commerce',
  'scan-text': 'text',
  'scan-search': 'actions',
  'scan-eye': 'security',
  // navigation vs location
  'navigation': 'location',
  'navigation-2': 'location',
  'navigation-off': 'location',
  // share is communication
  'share': 'communication',
  'share-2': 'communication',
  // pin is location
  'pin': 'location',
  'pin-off': 'location',
  // monitor etc are infrastructure
  'monitor': 'infrastructure',
  'monitor-check': 'infrastructure',
  'monitor-dot': 'infrastructure',
  'monitor-down': 'infrastructure',
  'monitor-off': 'infrastructure',
  'monitor-pause': 'infrastructure',
  'monitor-play': 'infrastructure',
  'monitor-smartphone': 'infrastructure',
  'monitor-speaker': 'infrastructure',
  'monitor-stop': 'infrastructure',
  'monitor-up': 'infrastructure',
  'monitor-x': 'infrastructure',
  // cloud alone = infrastructure
  'cloud': 'infrastructure',
  // box → files not shapes
  'box': 'files',
  'boxes': 'files',
  // flag → actions not location
  'flag': 'actions',
  'flag-off': 'actions',
  'flag-triangle-left': 'actions',
  'flag-triangle-right': 'actions',
};

// Tabler's 41 categories → our 20 categories
const TABLER_CATEGORY_MAP = {
  'Animals': 'misc',
  'Arrows': 'arrows',
  'Badges': 'actions',
  'Brand': 'misc',
  'Buildings': 'commerce',
  'Charts': 'infrastructure',
  'Communication': 'communication',
  'Computers': 'infrastructure',
  'Currencies': 'commerce',
  'Database': 'infrastructure',
  'Design': 'visual',
  'Development': 'development',
  'Devices': 'infrastructure',
  'Document': 'files',
  'E-commerce': 'commerce',
  'Electrical': 'controls',
  'Extensions': 'development',
  'Food': 'misc',
  'Games': 'misc',
  'Gender': 'people',
  'Gestures': 'people',
  'Health': 'people',
  'Laundry': 'misc',
  'Letters': 'text',
  'Logic': 'development',
  'Map': 'location',
  'Math': 'shapes',
  'Media': 'media',
  'Mood': 'people',
  'Nature': 'weather',
  'Numbers': 'text',
  'Photography': 'visual',
  'Shapes': 'shapes',
  'Sport': 'misc',
  'Symbols': 'shapes',
  'System': 'controls',
  'Text': 'text',
  'Vehicles': 'location',
  'Version control': 'development',
  'Weather': 'weather',
  'Zodiac': 'misc',
};

// Phosphor's 18 categories → our 20 categories
const PHOSPHOR_CATEGORY_MAP = {
  'arrows': 'arrows',
  'brands': 'misc',
  'commerce': 'commerce',
  'communications': 'communication',
  'design': 'visual',
  'editor': 'text',
  'finances': 'commerce',
  'games': 'misc',
  'health & wellness': 'people',
  'maps & travel': 'location',
  'media': 'media',
  'nature': 'weather',
  'objects': 'misc',
  'office': 'files',
  'people': 'people',
  'system': 'controls',
  'technology & development': 'development',
  'weather': 'weather',
};

// ── Helpers ─────────────────────────────────────────────────────────

function toDisplayName(filename) {
  return filename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function cleanSvg(svgContent) {
  return svgContent.replace(/<!--[\s\S]*?-->\n?/g, '').trim();
}

function categorizeByKeywords(name, tags) {
  // 1. Check explicit name overrides
  if (NAME_OVERRIDES[name]) return NAME_OVERRIDES[name];

  // 2. Try keyword matching against icon name
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword) || name.startsWith(keyword.replace(/-$/, ''))) {
        return category;
      }
    }
  }

  // 3. Fallback: check tags
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const cleanKeyword = keyword.replace(/-$/, '');
      for (const tag of (tags || [])) {
        if (String(tag).toLowerCase().includes(cleanKeyword)) {
          return category;
        }
      }
    }
  }

  return 'misc';
}

function copySvgFiles(srcDir, destDir, fileList) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fileList) {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    fs.writeFileSync(path.join(destDir, file), cleanSvg(content));
  }
}

// ── Library Processors ──────────────────────────────────────────────

function processLucide() {
  console.log('\n── Lucide ──────────────────────────────────');

  if (!fs.existsSync(LUCIDE_ICONS_DIR)) {
    console.log('  SKIPPED: lucide-static not installed');
    return [];
  }

  const tagsData = JSON.parse(fs.readFileSync(LUCIDE_TAGS_FILE, 'utf8'));
  const svgFiles = fs.readdirSync(LUCIDE_ICONS_DIR).filter(f => f.endsWith('.svg')).sort();
  console.log(`  Found ${svgFiles.length} SVG files`);

  const outDir = path.join(OUTPUT_DIR, 'lucide');
  fs.mkdirSync(outDir, { recursive: true });

  const icons = [];
  for (const file of svgFiles) {
    const name = file.replace('.svg', '');
    const svgContent = fs.readFileSync(path.join(LUCIDE_ICONS_DIR, file), 'utf8');
    const tags = tagsData[name] || [];
    const category = categorizeByKeywords(name, tags);

    icons.push({
      id: `lucide/${name}`,
      name: toDisplayName(name),
      library: 'lucide',
      category,
      type: 'outline',
      tags,
    });

    fs.writeFileSync(path.join(outDir, file), cleanSvg(svgContent));
  }

  console.log(`  Processed ${icons.length} icons`);
  return icons;
}

function processTabler() {
  console.log('\n── Tabler ──────────────────────────────────');

  if (!fs.existsSync(TABLER_OUTLINE_DIR)) {
    console.log('  SKIPPED: @tabler/icons not installed');
    return [];
  }

  // Load metadata for tags and categories
  const tablerMeta = JSON.parse(fs.readFileSync(TABLER_META_FILE, 'utf8'));
  console.log(`  Loaded metadata for ${Object.keys(tablerMeta).length} icons`);

  // Build reverse category lookup from the categories/ folder structure
  const tablerCategoryLookup = {};
  if (fs.existsSync(TABLER_CATEGORIES_DIR)) {
    const catFolders = fs.readdirSync(TABLER_CATEGORIES_DIR).filter(f => {
      return fs.statSync(path.join(TABLER_CATEGORIES_DIR, f)).isDirectory();
    });
    for (const folder of catFolders) {
      const catSvgs = fs.readdirSync(path.join(TABLER_CATEGORIES_DIR, folder))
        .filter(f => f.endsWith('.svg'));
      for (const svg of catSvgs) {
        const iconName = svg.replace('.svg', '');
        tablerCategoryLookup[iconName] = folder;
      }
    }
    console.log(`  Built category lookup from ${catFolders.length} category folders`);
  }

  const icons = [];

  // Process outline icons
  const outlineFiles = fs.readdirSync(TABLER_OUTLINE_DIR).filter(f => f.endsWith('.svg')).sort();
  const outlineOutDir = path.join(OUTPUT_DIR, 'tabler', 'outline');
  fs.mkdirSync(outlineOutDir, { recursive: true });

  for (const file of outlineFiles) {
    const name = file.replace('.svg', '');
    const meta = tablerMeta[name];
    const tablerCat = tablerCategoryLookup[name] || (meta && meta.category) || '';
    const category = TABLER_CATEGORY_MAP[tablerCat] || categorizeByKeywords(name, meta?.tags);
    const tags = meta?.tags?.map(t => String(t)) || [];

    icons.push({
      id: `tabler/outline/${name}`,
      name: toDisplayName(name),
      library: 'tabler',
      category,
      type: 'outline',
      tags,
    });

    const svgContent = fs.readFileSync(path.join(TABLER_OUTLINE_DIR, file), 'utf8');
    fs.writeFileSync(path.join(outlineOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${outlineFiles.length} outline icons`);

  // Process filled icons
  const filledFiles = fs.readdirSync(TABLER_FILLED_DIR).filter(f => f.endsWith('.svg')).sort();
  const filledOutDir = path.join(OUTPUT_DIR, 'tabler', 'filled');
  fs.mkdirSync(filledOutDir, { recursive: true });

  for (const file of filledFiles) {
    const name = file.replace('.svg', '');
    const meta = tablerMeta[name];
    const tablerCat = tablerCategoryLookup[name] || (meta && meta.category) || '';
    const category = TABLER_CATEGORY_MAP[tablerCat] || categorizeByKeywords(name, meta?.tags);
    const tags = meta?.tags?.map(t => String(t)) || [];

    icons.push({
      id: `tabler/filled/${name}`,
      name: toDisplayName(name),
      library: 'tabler',
      category,
      type: 'filled',
      tags,
    });

    const svgContent = fs.readFileSync(path.join(TABLER_FILLED_DIR, file), 'utf8');
    fs.writeFileSync(path.join(filledOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${filledFiles.length} filled icons`);

  console.log(`  Total: ${icons.length} icons`);
  return icons;
}

function processHeroicons() {
  console.log('\n── Heroicons ───────────────────────────────');

  if (!fs.existsSync(HEROICONS_OUTLINE_DIR)) {
    console.log('  SKIPPED: heroicons not installed');
    return [];
  }

  const icons = [];

  // Process outline icons
  const outlineFiles = fs.readdirSync(HEROICONS_OUTLINE_DIR).filter(f => f.endsWith('.svg')).sort();
  const outlineOutDir = path.join(OUTPUT_DIR, 'heroicons', 'outline');
  fs.mkdirSync(outlineOutDir, { recursive: true });

  for (const file of outlineFiles) {
    const name = file.replace('.svg', '');
    const category = categorizeByKeywords(name, []);

    icons.push({
      id: `heroicons/outline/${name}`,
      name: toDisplayName(name),
      library: 'heroicons',
      category,
      type: 'outline',
      tags: [],
    });

    const svgContent = fs.readFileSync(path.join(HEROICONS_OUTLINE_DIR, file), 'utf8');
    fs.writeFileSync(path.join(outlineOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${outlineFiles.length} outline icons`);

  // Process solid icons
  const solidFiles = fs.readdirSync(HEROICONS_SOLID_DIR).filter(f => f.endsWith('.svg')).sort();
  const solidOutDir = path.join(OUTPUT_DIR, 'heroicons', 'solid');
  fs.mkdirSync(solidOutDir, { recursive: true });

  for (const file of solidFiles) {
    const name = file.replace('.svg', '');
    const category = categorizeByKeywords(name, []);

    icons.push({
      id: `heroicons/solid/${name}`,
      name: toDisplayName(name),
      library: 'heroicons',
      category,
      type: 'solid',
      tags: [],
    });

    const svgContent = fs.readFileSync(path.join(HEROICONS_SOLID_DIR, file), 'utf8');
    fs.writeFileSync(path.join(solidOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${solidFiles.length} solid icons`);

  console.log(`  Total: ${icons.length} icons`);
  return icons;
}

function processPhosphor() {
  console.log('\n── Phosphor ────────────────────────────────');

  if (!fs.existsSync(PHOSPHOR_ASSETS_DIR)) {
    console.log('  SKIPPED: @phosphor-icons/core not installed');
    return [];
  }

  // Load metadata (categories, tags)
  const phosphorModule = require(PHOSPHOR_META_FILE);
  const metaLookup = {};
  for (const entry of phosphorModule.icons) {
    metaLookup[entry.name] = entry;
  }
  console.log(`  Loaded metadata for ${phosphorModule.icons.length} icons`);

  const icons = [];

  // We include: regular (outline), bold, fill
  // Skip thin, light, duotone to keep size manageable
  const styles = [
    { dir: 'regular', type: 'outline', suffix: '' },
    { dir: 'bold', type: 'bold', suffix: '-bold' },
    { dir: 'fill', type: 'filled', suffix: '-fill' },
  ];

  for (const style of styles) {
    const srcDir = path.join(PHOSPHOR_ASSETS_DIR, style.dir);
    if (!fs.existsSync(srcDir)) continue;

    const svgFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.svg')).sort();
    const outDir = path.join(OUTPUT_DIR, 'phosphor', style.dir);
    fs.mkdirSync(outDir, { recursive: true });

    for (const file of svgFiles) {
      // Phosphor filenames: "acorn-bold.svg", "acorn-fill.svg", "acorn.svg"
      const name = file.replace('.svg', '').replace(style.suffix, '');
      const meta = metaLookup[name];
      const cats = meta?.categories || [];
      const tags = (meta?.tags || []).filter(t => t !== '*new*');

      // Map first Phosphor category to ours
      let category = 'misc';
      for (const c of cats) {
        if (PHOSPHOR_CATEGORY_MAP[c]) {
          category = PHOSPHOR_CATEGORY_MAP[c];
          break;
        }
      }
      // Fallback to keyword matching
      if (category === 'misc' && cats.length === 0) {
        category = categorizeByKeywords(name, tags);
      }

      icons.push({
        id: `phosphor/${style.dir}/${name}`,
        name: toDisplayName(name),
        library: 'phosphor',
        category,
        type: style.type,
        tags,
      });

      const svgContent = fs.readFileSync(path.join(srcDir, file), 'utf8');
      // Rename to match manifest ID: "acorn-bold.svg" → "acorn.svg"
      const outFile = name + '.svg';
      fs.writeFileSync(path.join(outDir, outFile), cleanSvg(svgContent));
    }
    console.log(`  Processed ${svgFiles.length} ${style.dir} icons`);
  }

  console.log(`  Total: ${icons.length} icons`);
  return icons;
}

function processBootstrap() {
  console.log('\n── Bootstrap Icons ─────────────────────────');

  if (!fs.existsSync(BOOTSTRAP_ICONS_DIR)) {
    console.log('  SKIPPED: bootstrap-icons not installed');
    return [];
  }

  const allFiles = fs.readdirSync(BOOTSTRAP_ICONS_DIR).filter(f => f.endsWith('.svg')).sort();
  console.log(`  Found ${allFiles.length} SVG files`);

  const icons = [];

  // Split into outline (no -fill suffix) and filled (-fill suffix)
  const outlineFiles = allFiles.filter(f => !f.endsWith('-fill.svg'));
  const fillFiles = allFiles.filter(f => f.endsWith('-fill.svg'));

  // Process outline
  const outlineOutDir = path.join(OUTPUT_DIR, 'bootstrap', 'outline');
  fs.mkdirSync(outlineOutDir, { recursive: true });

  for (const file of outlineFiles) {
    const name = file.replace('.svg', '');
    const category = categorizeByKeywords(name, []);

    icons.push({
      id: `bootstrap/outline/${name}`,
      name: toDisplayName(name),
      library: 'bootstrap',
      category,
      type: 'outline',
      tags: [],
    });

    const svgContent = fs.readFileSync(path.join(BOOTSTRAP_ICONS_DIR, file), 'utf8');
    fs.writeFileSync(path.join(outlineOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${outlineFiles.length} outline icons`);

  // Process filled
  const fillOutDir = path.join(OUTPUT_DIR, 'bootstrap', 'filled');
  fs.mkdirSync(fillOutDir, { recursive: true });

  for (const file of fillFiles) {
    const name = file.replace('.svg', '');
    // Strip -fill suffix for categorization
    const baseName = name.replace(/-fill$/, '');
    const category = categorizeByKeywords(baseName, []);

    icons.push({
      id: `bootstrap/filled/${name}`,
      name: toDisplayName(name),
      library: 'bootstrap',
      category,
      type: 'filled',
      tags: [],
    });

    const svgContent = fs.readFileSync(path.join(BOOTSTRAP_ICONS_DIR, file), 'utf8');
    fs.writeFileSync(path.join(fillOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${fillFiles.length} filled icons`);

  console.log(`  Total: ${icons.length} icons`);
  return icons;
}

function processIconoir() {
  console.log('\n── Iconoir ─────────────────────────────────');

  if (!fs.existsSync(ICONOIR_REGULAR_DIR)) {
    console.log('  SKIPPED: iconoir not installed');
    return [];
  }

  const icons = [];

  // Process regular (outline)
  const regularFiles = fs.readdirSync(ICONOIR_REGULAR_DIR).filter(f => f.endsWith('.svg')).sort();
  const regularOutDir = path.join(OUTPUT_DIR, 'iconoir', 'regular');
  fs.mkdirSync(regularOutDir, { recursive: true });

  for (const file of regularFiles) {
    const name = file.replace('.svg', '');
    const category = categorizeByKeywords(name, []);

    icons.push({
      id: `iconoir/regular/${name}`,
      name: toDisplayName(name),
      library: 'iconoir',
      category,
      type: 'outline',
      tags: [],
    });

    const svgContent = fs.readFileSync(path.join(ICONOIR_REGULAR_DIR, file), 'utf8');
    fs.writeFileSync(path.join(regularOutDir, file), cleanSvg(svgContent));
  }
  console.log(`  Processed ${regularFiles.length} regular icons`);

  // Process solid
  if (fs.existsSync(ICONOIR_SOLID_DIR)) {
    const solidFiles = fs.readdirSync(ICONOIR_SOLID_DIR).filter(f => f.endsWith('.svg')).sort();
    const solidOutDir = path.join(OUTPUT_DIR, 'iconoir', 'solid');
    fs.mkdirSync(solidOutDir, { recursive: true });

    for (const file of solidFiles) {
      const name = file.replace('.svg', '');
      const category = categorizeByKeywords(name, []);

      icons.push({
        id: `iconoir/solid/${name}`,
        name: toDisplayName(name),
        library: 'iconoir',
        category,
        type: 'solid',
        tags: [],
      });

      const svgContent = fs.readFileSync(path.join(ICONOIR_SOLID_DIR, file), 'utf8');
      fs.writeFileSync(path.join(solidOutDir, file), cleanSvg(svgContent));
    }
    console.log(`  Processed ${solidFiles.length} solid icons`);
  }

  console.log(`  Total: ${icons.length} icons`);
  return icons;
}

// ── Main Pipeline ───────────────────────────────────────────────────

function main() {
  console.log('Icon Processing Pipeline');
  console.log('========================');

  // Process all libraries
  const allIcons = [
    ...processLucide(),
    ...processTabler(),
    ...processHeroicons(),
    ...processPhosphor(),
    ...processBootstrap(),
    ...processIconoir(),
  ];

  // Calculate stats
  const categoryStats = {};
  const libraryStats = {};
  const typeStats = {};
  const uncategorized = [];

  for (const icon of allIcons) {
    categoryStats[icon.category] = (categoryStats[icon.category] || 0) + 1;
    libraryStats[icon.library] = (libraryStats[icon.library] || 0) + 1;
    typeStats[icon.type] = (typeStats[icon.type] || 0) + 1;
    if (icon.category === 'misc') {
      uncategorized.push({ id: icon.id, name: icon.name, tags: icon.tags });
    }
  }

  // Build manifest
  const manifest = {
    version: 3,
    generated: new Date().toISOString(),
    icons: allIcons,
    categories: CATEGORIES.map(cat => ({
      ...cat,
      count: categoryStats[cat.id] || 0,
    })),
    libraries: [
      {
        id: 'lucide',
        name: 'Lucide',
        version: '0.574.0',
        url: 'https://lucide.dev',
        license: 'ISC',
        licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
        attribution: 'Lucide Contributors',
        iconCount: libraryStats['lucide'] || 0,
        description: 'Beautiful & consistent icon toolkit made by the community',
      },
      {
        id: 'tabler',
        name: 'Tabler Icons',
        version: '3.36.1',
        url: 'https://tabler.io/icons',
        license: 'MIT',
        licenseUrl: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE',
        attribution: 'Tabler Icons Contributors',
        iconCount: libraryStats['tabler'] || 0,
        description: 'Free and open source icons designed for everyday use',
      },
      {
        id: 'heroicons',
        name: 'Heroicons',
        version: '2.2.0',
        url: 'https://heroicons.com',
        license: 'MIT',
        licenseUrl: 'https://github.com/tailwindlabs/heroicons/blob/master/LICENSE',
        attribution: 'Tailwind Labs',
        iconCount: libraryStats['heroicons'] || 0,
        description: 'Beautiful hand-crafted SVG icons by the makers of Tailwind CSS',
      },
      {
        id: 'phosphor',
        name: 'Phosphor Icons',
        version: '2.1.1',
        url: 'https://phosphoricons.com',
        license: 'MIT',
        licenseUrl: 'https://github.com/phosphor-icons/core/blob/main/LICENSE',
        attribution: 'Phosphor Icons Contributors',
        iconCount: libraryStats['phosphor'] || 0,
        description: 'A flexible icon family for interfaces, diagrams, and presentations',
      },
      {
        id: 'bootstrap',
        name: 'Bootstrap Icons',
        version: '1.13.1',
        url: 'https://icons.getbootstrap.com',
        license: 'MIT',
        licenseUrl: 'https://github.com/twbs/icons/blob/main/LICENSE',
        attribution: 'The Bootstrap Authors',
        iconCount: libraryStats['bootstrap'] || 0,
        description: 'Official open source SVG icon library for Bootstrap',
      },
      {
        id: 'iconoir',
        name: 'Iconoir',
        version: '7.11.0',
        url: 'https://iconoir.com',
        license: 'MIT',
        licenseUrl: 'https://github.com/iconoir-icons/iconoir/blob/main/LICENSE',
        attribution: 'Luca Burgio',
        iconCount: libraryStats['iconoir'] || 0,
        description: 'A high-quality selection of free icons with no premium options',
      },
    ],
  };

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Write libraries.json separately
  const libData = { libraries: manifest.libraries };
  const libPath = path.join(OUTPUT_DIR, 'libraries.json');
  fs.writeFileSync(libPath, JSON.stringify(libData, null, 2));

  // Write report
  const report = {
    totalIcons: allIcons.length,
    categorized: allIcons.length - uncategorized.length,
    uncategorized: uncategorized.length,
    libraryBreakdown: Object.entries(libraryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([lib, count]) => ({ library: lib, count })),
    typeBreakdown: Object.entries(typeStats)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count })),
    categoryBreakdown: Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ category: cat, count })),
    uncategorizedIcons: uncategorized,
  };
  const reportPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n\n════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('════════════════════════════════════════════\n');

  console.log('Libraries:');
  console.log('─'.repeat(40));
  for (const { library, count } of report.libraryBreakdown) {
    console.log(`  ${library.padEnd(20)} ${String(count).padStart(6)}`);
  }
  console.log('─'.repeat(40));
  console.log(`  ${'TOTAL'.padEnd(20)} ${String(allIcons.length).padStart(6)}`);

  console.log('\nTypes:');
  console.log('─'.repeat(40));
  for (const { type, count } of report.typeBreakdown) {
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(6)}`);
  }

  console.log('\nCategories:');
  console.log('─'.repeat(40));
  for (const { category, count } of report.categoryBreakdown) {
    const label = CATEGORIES.find(c => c.id === category)?.label || category;
    const bar = '█'.repeat(Math.ceil(count / 50));
    console.log(`  ${label.padEnd(25)} ${String(count).padStart(5)}  ${bar}`);
  }
  console.log('─'.repeat(40));

  console.log(`\nUncategorized (misc): ${uncategorized.length}`);
  console.log(`\nOutput:`);
  console.log(`  Manifest:  ${manifestPath}`);
  console.log(`  Libraries: ${libPath}`);
  console.log(`  Report:    ${reportPath}`);
}

main();
