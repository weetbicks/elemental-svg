#!/usr/bin/env node

/**
 * Local Icon Tag Generator for Elemental SVG Icon Browser
 *
 * Generates semantic search tags for all untagged icons using:
 *   1. Cross-reference from already-tagged icons (same base name)
 *   2. Word-level synonym dictionary (no API needed)
 *   3. Category-based bonus tags
 *
 * Usage:
 *   node scripts/generate-tags-local.js
 *   node scripts/generate-tags-local.js --dry-run
 *   node scripts/generate-tags-local.js --stats
 *
 * Output:
 *   scripts/icon-tags.json — { "icon-base-name": ["tag1", "tag2", ...], ... }
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'build', 'icons', 'manifest.json');
const OUTPUT_PATH = path.join(__dirname, 'icon-tags.json');

// ── Synonym Dictionary ─────────────────────────────────────────────
// Maps icon name words → related search terms a designer would use.
// Only includes words where synonyms/associations ADD value beyond the word itself.

const WORD_TAGS = {
  // ── People & Body ──
  person: ['user', 'profile', 'account', 'member', 'individual', 'human'],
  people: ['users', 'group', 'team', 'community', 'crowd', 'members'],
  user: ['person', 'profile', 'account', 'member', 'individual'],
  users: ['people', 'group', 'team', 'members', 'community'],
  group: ['team', 'people', 'community', 'organization', 'collective'],
  team: ['group', 'people', 'collaborate', 'organization', 'members'],
  admin: ['administrator', 'manager', 'superuser', 'root', 'authority'],
  account: ['user', 'profile', 'member', 'login', 'identity'],
  profile: ['user', 'account', 'biography', 'avatar', 'identity'],
  avatar: ['profile', 'user', 'picture', 'photo', 'identity'],
  baby: ['infant', 'child', 'newborn', 'toddler', 'kid'],
  child: ['kid', 'baby', 'minor', 'young', 'infant'],
  face: ['expression', 'emotion', 'smiley', 'head', 'portrait'],
  smile: ['happy', 'emotion', 'joy', 'expression', 'smiley', 'face'],
  emoji: ['emoticon', 'smiley', 'expression', 'face', 'reaction'],
  hand: ['gesture', 'palm', 'finger', 'touch', 'grip', 'pointer'],
  gesture: ['hand', 'swipe', 'touch', 'interaction', 'motion'],
  thumb: ['like', 'approve', 'finger', 'hand', 'gesture'],
  finger: ['hand', 'point', 'touch', 'tap', 'gesture'],
  eye: ['view', 'see', 'watch', 'look', 'visibility', 'observe'],
  eyes: ['view', 'see', 'watch', 'look', 'visibility', 'observe'],
  body: ['person', 'human', 'figure', 'torso', 'anatomy'],
  head: ['face', 'portrait', 'skull', 'mind', 'brain'],
  brain: ['mind', 'think', 'intelligence', 'cognitive', 'neural', 'smart'],
  skull: ['head', 'death', 'danger', 'skeleton', 'bone'],
  bone: ['skeleton', 'body', 'anatomy', 'medical'],
  arm: ['limb', 'body', 'flex', 'muscle', 'strength'],
  heart: ['love', 'like', 'favorite', 'health', 'romance', 'care', 'vital'],
  angry: ['mad', 'upset', 'emotion', 'frustrated', 'annoyed'],
  sad: ['unhappy', 'emotion', 'frown', 'depressed', 'down'],
  happy: ['joy', 'smile', 'emotion', 'cheerful', 'pleased'],
  emotion: ['feeling', 'expression', 'mood', 'sentiment', 'face'],
  aliens: ['extraterrestrial', 'ufo', 'space', 'sci-fi', 'creature'],

  // ── Animals ──
  animal: ['creature', 'pet', 'wildlife', 'fauna', 'beast'],
  cat: ['feline', 'pet', 'animal', 'kitten', 'kitty'],
  dog: ['canine', 'pet', 'animal', 'puppy', 'hound'],
  bird: ['avian', 'animal', 'fly', 'feather', 'wing'],
  fish: ['aquatic', 'animal', 'sea', 'ocean', 'marine', 'swim'],
  rabbit: ['bunny', 'pet', 'animal', 'hare'],
  turtle: ['tortoise', 'animal', 'slow', 'reptile', 'shell'],
  bug: ['insect', 'pest', 'beetle', 'debug', 'error'],
  spider: ['insect', 'web', 'arachnid', 'bug', 'crawl'],
  horse: ['equine', 'animal', 'stallion', 'pony', 'ride'],
  paw: ['pet', 'animal', 'foot', 'print', 'track'],

  // ── Home & Buildings ──
  home: ['house', 'residence', 'dwelling', 'main', 'dashboard', 'start'],
  house: ['home', 'residence', 'dwelling', 'building', 'property'],
  building: ['office', 'structure', 'architecture', 'property', 'tower', 'skyscraper'],
  office: ['work', 'business', 'workplace', 'corporate', 'building'],
  door: ['entrance', 'exit', 'gateway', 'portal', 'entry', 'access'],
  gate: ['entrance', 'door', 'entry', 'portal', 'barrier', 'access'],
  window: ['pane', 'glass', 'frame', 'view', 'opening'],
  room: ['space', 'chamber', 'area', 'interior'],
  bed: ['sleep', 'rest', 'bedroom', 'hotel', 'accommodation'],
  chair: ['seat', 'sit', 'furniture', 'desk', 'office'],
  seat: ['chair', 'sit', 'place', 'spot'],
  lamp: ['light', 'illuminate', 'desk', 'bulb', 'glow'],
  lightbulb: ['idea', 'light', 'illuminate', 'lamp', 'bright', 'innovation', 'creative'],
  tower: ['building', 'tall', 'structure', 'antenna', 'signal'],
  store: ['shop', 'retail', 'market', 'buy', 'commerce'],
  storefront: ['shop', 'store', 'retail', 'market', 'business', 'commercial'],
  shop: ['store', 'retail', 'market', 'buy', 'commerce', 'purchase'],
  warehouse: ['storage', 'depot', 'building', 'inventory', 'logistics'],
  factory: ['manufacturing', 'industry', 'production', 'building'],
  hospital: ['medical', 'health', 'emergency', 'clinic', 'healthcare'],
  church: ['religion', 'worship', 'building', 'faith'],
  school: ['education', 'learning', 'building', 'study', 'academic'],
  hotel: ['accommodation', 'stay', 'travel', 'lodging', 'building'],

  // ── Navigation & Arrows ──
  arrow: ['direction', 'navigate', 'pointer', 'move', 'indicator'],
  arrows: ['direction', 'navigate', 'pointer', 'move', 'indicator'],
  chevron: ['arrow', 'direction', 'caret', 'expand', 'navigate'],
  caret: ['arrow', 'chevron', 'direction', 'dropdown', 'indicator'],
  left: ['previous', 'back', 'west', 'backward'],
  right: ['next', 'forward', 'east', 'ahead'],
  up: ['above', 'top', 'north', 'ascend', 'rise', 'increase'],
  down: ['below', 'bottom', 'south', 'descend', 'lower', 'decrease'],
  forward: ['next', 'ahead', 'advance', 'proceed', 'right'],
  back: ['previous', 'return', 'behind', 'reverse', 'left', 'undo'],
  backward: ['back', 'reverse', 'previous', 'rewind', 'behind'],
  direction: ['navigate', 'compass', 'way', 'path', 'route', 'heading'],
  navigate: ['direction', 'route', 'path', 'way', 'browse'],
  compass: ['direction', 'navigate', 'north', 'orientation', 'heading'],
  return: ['back', 'undo', 'go back', 'previous'],
  enter: ['input', 'submit', 'go', 'return', 'accept'],
  exit: ['leave', 'close', 'quit', 'logout', 'escape', 'door'],
  path: ['route', 'way', 'trail', 'direction', 'road'],
  route: ['path', 'direction', 'way', 'navigate', 'road', 'journey'],
  cursor: ['pointer', 'mouse', 'click', 'select', 'arrow'],
  pointer: ['cursor', 'mouse', 'click', 'arrow', 'select'],

  // ── Actions ──
  add: ['create', 'new', 'plus', 'insert', 'append'],
  remove: ['delete', 'minus', 'clear', 'take away', 'discard'],
  delete: ['remove', 'trash', 'erase', 'destroy', 'discard'],
  dismiss: ['close', 'remove', 'cancel', 'reject', 'clear'],
  edit: ['modify', 'change', 'update', 'revise', 'write', 'pencil'],
  save: ['store', 'keep', 'preserve', 'disk', 'floppy', 'persist'],
  copy: ['duplicate', 'clone', 'replicate', 'clipboard'],
  paste: ['insert', 'clipboard', 'put', 'place'],
  cut: ['scissors', 'remove', 'clip', 'trim', 'snip'],
  undo: ['revert', 'back', 'cancel', 'reverse', 'rollback'],
  redo: ['repeat', 'forward', 'again', 'restore'],
  search: ['find', 'lookup', 'query', 'discover', 'magnify', 'seek'],
  filter: ['funnel', 'sort', 'refine', 'narrow', 'sieve', 'strain'],
  sort: ['order', 'arrange', 'organize', 'rank', 'sequence'],
  download: ['save', 'get', 'fetch', 'pull', 'receive', 'import'],
  upload: ['send', 'push', 'publish', 'export', 'share'],
  export: ['save', 'download', 'output', 'share', 'extract'],
  import: ['load', 'bring in', 'upload', 'input', 'insert'],
  share: ['send', 'distribute', 'social', 'forward', 'publish'],
  send: ['transmit', 'deliver', 'dispatch', 'mail', 'submit', 'share'],
  receive: ['get', 'accept', 'collect', 'incoming', 'download'],
  open: ['launch', 'start', 'access', 'expand', 'unfold'],
  close: ['shut', 'exit', 'dismiss', 'end', 'collapse'],
  lock: ['secure', 'protect', 'private', 'padlock', 'closed', 'restrict'],
  unlock: ['open', 'access', 'unsecure', 'free', 'release', 'padlock'],
  play: ['start', 'begin', 'media', 'run', 'video', 'audio', 'stream'],
  pause: ['wait', 'hold', 'stop', 'suspend', 'halt', 'media'],
  stop: ['end', 'halt', 'cease', 'terminate', 'cancel', 'media'],
  record: ['capture', 'save', 'log', 'media', 'microphone'],
  refresh: ['reload', 'update', 'renew', 'sync', 'restart'],
  sync: ['synchronize', 'refresh', 'update', 'match', 'cloud'],
  zoom: ['magnify', 'enlarge', 'scale', 'focus', 'inspect'],
  expand: ['enlarge', 'grow', 'maximize', 'fullscreen', 'open', 'bigger'],
  collapse: ['shrink', 'minimize', 'close', 'fold', 'smaller', 'compact'],
  resize: ['scale', 'adjust', 'size', 'dimension', 'transform'],
  move: ['drag', 'relocate', 'position', 'transfer', 'shift'],
  drag: ['move', 'grab', 'hold', 'relocate', 'reorder'],
  drop: ['release', 'place', 'put', 'deposit', 'drag'],
  select: ['choose', 'pick', 'highlight', 'mark', 'check'],
  check: ['verify', 'confirm', 'approve', 'done', 'complete', 'tick'],
  checkmark: ['verify', 'confirm', 'approve', 'done', 'complete', 'tick', 'success'],
  cancel: ['abort', 'stop', 'close', 'reject', 'undo'],
  confirm: ['approve', 'accept', 'verify', 'ok', 'yes', 'done'],
  submit: ['send', 'confirm', 'apply', 'complete', 'post'],
  reset: ['clear', 'restore', 'default', 'undo', 'revert'],
  swap: ['switch', 'exchange', 'trade', 'replace', 'flip'],
  switch: ['toggle', 'swap', 'change', 'flip', 'alternate'],
  toggle: ['switch', 'on off', 'flip', 'change', 'control'],
  merge: ['combine', 'join', 'unite', 'consolidate', 'blend'],
  split: ['divide', 'separate', 'break', 'partition', 'fork'],
  connect: ['link', 'join', 'attach', 'network', 'bridge'],
  disconnect: ['unlink', 'detach', 'separate', 'offline'],
  attach: ['connect', 'link', 'clip', 'fasten', 'paperclip'],
  rotate: ['spin', 'turn', 'revolve', 'twist', 'angle', 'orientation'],
  flip: ['mirror', 'reverse', 'invert', 'reflect', 'turn'],
  crop: ['trim', 'cut', 'clip', 'resize', 'frame'],
  scan: ['read', 'detect', 'capture', 'barcode', 'qr'],
  print: ['printer', 'output', 'document', 'paper', 'hard copy'],
  transfer: ['move', 'send', 'migrate', 'shift', 'exchange'],
  exchange: ['swap', 'trade', 'transfer', 'convert', 'replace'],
  translate: ['language', 'convert', 'interpret', 'localize', 'global'],
  increase: ['more', 'grow', 'up', 'raise', 'boost', 'expand'],
  decrease: ['less', 'reduce', 'down', 'lower', 'shrink'],
  click: ['tap', 'press', 'select', 'interact', 'mouse'],
  tap: ['click', 'press', 'touch', 'select', 'interact'],
  swipe: ['slide', 'gesture', 'scroll', 'drag', 'touch'],
  pinch: ['zoom', 'gesture', 'touch', 'scale', 'resize'],
  scroll: ['swipe', 'browse', 'navigate', 'page', 'list'],
  pan: ['move', 'drag', 'scroll', 'slide', 'hand'],
  unfold: ['expand', 'open', 'reveal', 'show', 'more'],
  fold: ['collapse', 'close', 'hide', 'compact', 'less'],
  adjust: ['modify', 'tune', 'configure', 'tweak', 'customize'],
  adjustment: ['modify', 'tune', 'configure', 'tweak', 'customize', 'settings'],
  reply: ['respond', 'answer', 'message', 'back', 'return'],
  distribute: ['spread', 'arrange', 'space', 'layout', 'align', 'share'],

  // ── Files & Documents ──
  file: ['document', 'page', 'paper', 'sheet', 'record'],
  files: ['documents', 'pages', 'papers', 'records', 'collection'],
  document: ['file', 'page', 'paper', 'text', 'record', 'doc'],
  doc: ['document', 'file', 'paper', 'text', 'page'],
  folder: ['directory', 'collection', 'organize', 'container', 'category'],
  archive: ['storage', 'backup', 'compress', 'zip', 'history', 'old'],
  clipboard: ['paste', 'copy', 'buffer', 'board', 'memo'],
  note: ['memo', 'sticky', 'reminder', 'annotation', 'jot'],
  notebook: ['journal', 'diary', 'notes', 'book', 'writing', 'log'],
  journal: ['diary', 'notebook', 'log', 'writing', 'record'],
  book: ['read', 'literature', 'manual', 'guide', 'publication', 'textbook'],
  page: ['document', 'sheet', 'paper', 'web', 'leaf'],
  paper: ['document', 'sheet', 'page', 'print', 'stationery'],
  receipt: ['invoice', 'bill', 'transaction', 'payment', 'record', 'purchase'],
  invoice: ['bill', 'receipt', 'payment', 'transaction', 'accounting'],
  contract: ['agreement', 'document', 'legal', 'deal', 'sign'],
  agreement: ['contract', 'document', 'legal', 'deal', 'terms'],
  certificate: ['diploma', 'award', 'credential', 'license', 'qualification'],
  diploma: ['certificate', 'degree', 'graduation', 'education', 'academic'],
  announcement: ['notice', 'broadcast', 'news', 'alert', 'megaphone'],
  report: ['document', 'analysis', 'summary', 'chart', 'data'],
  filetype: ['extension', 'format', 'type', 'document'],
  pdf: ['document', 'file', 'format', 'adobe', 'reader'],
  earmark: ['bookmark', 'mark', 'save', 'page', 'tag'],

  // ── Communication ──
  chat: ['message', 'conversation', 'talk', 'discuss', 'instant message', 'bubble'],
  message: ['chat', 'text', 'notification', 'communication', 'sms'],
  comment: ['feedback', 'note', 'remark', 'annotation', 'discussion', 'reply'],
  mail: ['email', 'letter', 'envelope', 'inbox', 'correspondence', 'post'],
  email: ['mail', 'letter', 'envelope', 'inbox', 'correspondence', 'message'],
  envelope: ['mail', 'email', 'letter', 'message', 'post'],
  inbox: ['mail', 'email', 'messages', 'receive', 'incoming'],
  phone: ['call', 'telephone', 'mobile', 'contact', 'dial', 'ring'],
  telephone: ['phone', 'call', 'dial', 'contact', 'ring', 'landline'],
  call: ['phone', 'dial', 'ring', 'contact', 'voice', 'telephone'],
  voice: ['speak', 'audio', 'sound', 'talk', 'speech', 'microphone'],
  microphone: ['mic', 'audio', 'record', 'voice', 'speak', 'sound'],
  mic: ['microphone', 'audio', 'record', 'voice', 'speak'],
  speaker: ['audio', 'sound', 'volume', 'music', 'output', 'loudspeaker'],
  megaphone: ['announce', 'broadcast', 'loud', 'speaker', 'promotion', 'amplify'],
  bubble: ['chat', 'speech', 'message', 'tooltip', 'conversation', 'balloon'],
  notification: ['alert', 'notice', 'bell', 'badge', 'remind', 'update'],
  alert: ['warning', 'notification', 'alarm', 'attention', 'danger'],
  warning: ['alert', 'caution', 'danger', 'attention', 'exclamation'],
  bell: ['notification', 'alert', 'alarm', 'ring', 'reminder'],
  alarm: ['alert', 'bell', 'warning', 'clock', 'wake', 'reminder', 'time'],
  sms: ['text', 'message', 'phone', 'mobile', 'chat'],
  forum: ['discussion', 'community', 'board', 'conversation', 'thread'],
  broadcast: ['announce', 'transmit', 'signal', 'radio', 'live', 'stream'],

  // ── Media & Entertainment ──
  video: ['film', 'movie', 'clip', 'recording', 'camera', 'stream', 'media'],
  camera: ['photo', 'picture', 'image', 'capture', 'lens', 'snapshot'],
  image: ['picture', 'photo', 'graphic', 'visual', 'illustration'],
  picture: ['image', 'photo', 'graphic', 'visual', 'illustration', 'snapshot'],
  photo: ['image', 'picture', 'camera', 'snapshot', 'photography'],
  gallery: ['images', 'photos', 'collection', 'album', 'portfolio'],
  album: ['collection', 'gallery', 'photos', 'music', 'portfolio'],
  music: ['audio', 'song', 'melody', 'sound', 'tune', 'rhythm', 'note'],
  audio: ['sound', 'music', 'listen', 'speaker', 'volume', 'hearing'],
  sound: ['audio', 'music', 'volume', 'noise', 'hear', 'speaker'],
  volume: ['sound', 'audio', 'loud', 'mute', 'speaker', 'level'],
  film: ['movie', 'video', 'cinema', 'reel', 'media', 'recording'],
  movie: ['film', 'video', 'cinema', 'entertainment', 'watch'],
  tv: ['television', 'screen', 'monitor', 'display', 'watch', 'broadcast'],
  radio: ['broadcast', 'audio', 'signal', 'frequency', 'listen', 'fm'],
  podcast: ['audio', 'listen', 'show', 'broadcast', 'episode', 'stream'],
  headset: ['headphones', 'audio', 'listen', 'music', 'support', 'call'],
  game: ['play', 'gaming', 'entertainment', 'controller', 'fun'],
  dice: ['game', 'random', 'chance', 'luck', 'roll'],
  puzzle: ['game', 'piece', 'solve', 'challenge', 'jigsaw'],
  trophy: ['award', 'winner', 'prize', 'achievement', 'competition', 'cup'],
  medal: ['award', 'achievement', 'prize', 'winner', 'badge'],
  crown: ['king', 'queen', 'royal', 'premium', 'vip', 'leader'],
  gift: ['present', 'surprise', 'reward', 'give', 'box', 'celebration'],
  celebration: ['party', 'event', 'festive', 'confetti', 'happy'],
  balloon: ['party', 'celebration', 'decoration', 'festive', 'fun'],
  cake: ['birthday', 'celebration', 'dessert', 'party', 'sweet', 'food'],
  newspaper: ['news', 'press', 'article', 'media', 'paper', 'journal', 'read'],
  record: ['save', 'capture', 'log', 'vinyl', 'disc', 'media'],
  rewind: ['backward', 'previous', 'replay', 'media', 'reverse'],
  animation: ['motion', 'animate', 'dynamic', 'video', 'transition'],

  // ── Commerce & Finance ──
  shopping: ['buy', 'purchase', 'store', 'retail', 'ecommerce', 'shop'],
  cart: ['shopping', 'basket', 'trolley', 'buy', 'checkout', 'ecommerce'],
  bag: ['shopping', 'tote', 'carry', 'purchase', 'retail', 'sack'],
  basket: ['shopping', 'cart', 'carry', 'collect', 'container'],
  money: ['cash', 'finance', 'currency', 'payment', 'dollar', 'funds'],
  dollar: ['money', 'currency', 'cash', 'price', 'usd', 'finance', 'payment'],
  pound: ['money', 'currency', 'gbp', 'sterling', 'finance', 'british'],
  currency: ['money', 'finance', 'exchange', 'cash', 'payment'],
  coin: ['money', 'currency', 'token', 'payment', 'cash'],
  wallet: ['money', 'payment', 'finance', 'purse', 'cash', 'billing'],
  bank: ['finance', 'money', 'savings', 'institution', 'deposit'],
  credit: ['card', 'payment', 'finance', 'bank', 'charge'],
  card: ['payment', 'credit', 'debit', 'identity', 'badge', 'pass'],
  payment: ['pay', 'transaction', 'purchase', 'billing', 'checkout'],
  price: ['cost', 'money', 'value', 'amount', 'fee', 'tag'],
  tag: ['label', 'price', 'category', 'mark', 'badge', 'identifier'],
  label: ['tag', 'name', 'category', 'mark', 'sticker', 'badge'],
  badge: ['label', 'tag', 'award', 'notification', 'indicator', 'emblem'],
  percent: ['discount', 'sale', 'ratio', 'proportion', 'off'],
  discount: ['sale', 'offer', 'percent', 'deal', 'savings', 'coupon'],
  ticket: ['pass', 'admission', 'event', 'coupon', 'entry', 'receipt'],
  barcode: ['scan', 'product', 'inventory', 'code', 'retail'],
  qr: ['code', 'scan', 'barcode', 'link', 'digital'],
  advertisement: ['ad', 'promotion', 'marketing', 'banner', 'commercial'],
  storefront: ['shop', 'store', 'retail', 'market', 'business', 'commercial'],

  // ── Technology & Devices ──
  computer: ['pc', 'desktop', 'machine', 'workstation', 'device'],
  desktop: ['computer', 'pc', 'monitor', 'screen', 'workstation'],
  laptop: ['computer', 'notebook', 'portable', 'device', 'macbook'],
  tablet: ['ipad', 'device', 'mobile', 'screen', 'portable'],
  mobile: ['phone', 'smartphone', 'device', 'portable', 'cellular'],
  screen: ['display', 'monitor', 'view', 'panel', 'canvas'],
  monitor: ['screen', 'display', 'desktop', 'tv', 'panel'],
  display: ['screen', 'monitor', 'show', 'view', 'panel'],
  keyboard: ['type', 'input', 'keys', 'text', 'device', 'hardware'],
  mouse: ['click', 'cursor', 'pointer', 'input', 'device'],
  printer: ['print', 'output', 'document', 'paper', 'device'],
  scanner: ['scan', 'capture', 'digitize', 'device', 'read'],
  battery: ['power', 'charge', 'energy', 'level', 'device'],
  power: ['energy', 'electricity', 'on', 'off', 'switch', 'button'],
  charge: ['battery', 'power', 'energy', 'plug', 'electric'],
  plug: ['connect', 'power', 'socket', 'outlet', 'electric'],
  cable: ['wire', 'cord', 'connect', 'usb', 'charging'],
  usb: ['port', 'connect', 'cable', 'drive', 'device', 'plug'],
  bluetooth: ['wireless', 'connect', 'pair', 'device', 'signal'],
  wifi: ['wireless', 'internet', 'signal', 'network', 'connect', 'connection'],
  signal: ['strength', 'wireless', 'antenna', 'reception', 'broadcast'],
  antenna: ['signal', 'broadcast', 'reception', 'wireless', 'tower', 'radio'],
  chip: ['processor', 'cpu', 'hardware', 'silicon', 'circuit'],
  cpu: ['processor', 'chip', 'hardware', 'computing', 'performance'],
  sim: ['card', 'mobile', 'phone', 'cellular', 'network'],
  sd: ['card', 'memory', 'storage', 'media', 'data'],
  hdd: ['hard drive', 'storage', 'disk', 'data', 'save'],
  disk: ['storage', 'drive', 'save', 'data', 'floppy', 'hard drive'],
  drive: ['storage', 'disk', 'hard drive', 'data', 'save'],
  ram: ['memory', 'hardware', 'performance', 'storage'],
  server: ['hosting', 'backend', 'infrastructure', 'database', 'network', 'rack'],
  database: ['data', 'storage', 'backend', 'sql', 'records', 'table'],
  cloud: ['hosting', 'storage', 'upload', 'sync', 'online', 'saas', 'internet'],
  network: ['internet', 'connection', 'web', 'infrastructure', 'nodes'],
  router: ['network', 'wifi', 'internet', 'gateway', 'device'],
  hub: ['central', 'network', 'connect', 'center', 'junction'],
  port: ['connection', 'socket', 'usb', 'network', 'interface'],
  terminal: ['command', 'console', 'cli', 'shell', 'prompt', 'code'],
  console: ['terminal', 'command', 'shell', 'cli', 'output'],
  code: ['programming', 'developer', 'source', 'script', 'syntax', 'brackets'],
  drone: ['aerial', 'fly', 'remote', 'camera', 'quadcopter', 'uav'],
  robot: ['automation', 'bot', 'machine', 'ai', 'android', 'mechanical'],
  ai: ['artificial intelligence', 'machine learning', 'smart', 'neural', 'bot', 'automation'],
  vr: ['virtual reality', 'headset', 'immersive', '3d', 'goggles'],
  headphones: ['audio', 'listen', 'music', 'headset', 'earphones'],
  airpods: ['earbuds', 'audio', 'wireless', 'headphones', 'bluetooth', 'listen'],

  // ── Security ──
  shield: ['protect', 'security', 'defense', 'guard', 'safe', 'firewall'],
  key: ['unlock', 'access', 'password', 'security', 'authentication', 'secret'],
  fingerprint: ['biometric', 'identity', 'security', 'authentication', 'touch'],
  password: ['secret', 'login', 'security', 'authentication', 'key'],
  security: ['protect', 'safe', 'guard', 'defense', 'shield'],
  safe: ['secure', 'vault', 'protect', 'lock', 'strongbox'],
  firewall: ['security', 'network', 'protect', 'block', 'filter'],
  encryption: ['secure', 'protect', 'cipher', 'encoded', 'privacy'],
  privacy: ['private', 'secure', 'hidden', 'confidential', 'incognito'],

  // ── Text & Formatting ──
  text: ['typography', 'font', 'write', 'content', 'string', 'words'],
  font: ['text', 'typography', 'typeface', 'letter', 'style'],
  bold: ['strong', 'thick', 'emphasis', 'text', 'weight', 'heavy'],
  italic: ['slant', 'emphasis', 'text', 'style', 'oblique'],
  underline: ['text', 'emphasis', 'decoration', 'style'],
  strikethrough: ['text', 'delete', 'remove', 'line through', 'correction'],
  align: ['arrangement', 'position', 'layout', 'justify', 'format', 'text'],
  alignment: ['arrange', 'position', 'layout', 'justify', 'format'],
  indent: ['tab', 'margin', 'spacing', 'offset', 'text'],
  paragraph: ['text', 'block', 'content', 'section', 'body'],
  quote: ['citation', 'blockquote', 'reference', 'text', 'quotation'],
  heading: ['title', 'header', 'h1', 'text', 'headline'],
  header: ['top', 'heading', 'title', 'banner', 'navigation'],
  footer: ['bottom', 'end', 'page', 'copyright', 'navigation'],
  title: ['heading', 'name', 'header', 'headline', 'caption'],
  format: ['style', 'layout', 'template', 'arrangement', 'design'],
  bullet: ['list', 'point', 'dot', 'item', 'unordered'],
  grammar: ['spell', 'language', 'writing', 'proofread', 'text', 'check'],
  translate: ['language', 'convert', 'interpret', 'localize', 'global'],
  alphabet: ['letters', 'abc', 'text', 'characters', 'language'],
  pencil: ['write', 'edit', 'draw', 'compose', 'pen'],
  pen: ['write', 'edit', 'draw', 'compose', 'pencil', 'ink'],
  eraser: ['delete', 'remove', 'clear', 'undo', 'rubber'],
  ruler: ['measure', 'guide', 'line', 'dimension', 'size', 'tool'],

  // ── Layout & UI ──
  layout: ['design', 'template', 'arrangement', 'structure', 'wireframe', 'grid'],
  grid: ['layout', 'table', 'matrix', 'cells', 'arrange', 'tile'],
  list: ['items', 'menu', 'catalog', 'rows', 'ordered', 'bullets'],
  table: ['grid', 'data', 'spreadsheet', 'rows', 'columns', 'tabular'],
  column: ['vertical', 'pillar', 'layout', 'grid', 'table'],
  columns: ['vertical', 'layout', 'grid', 'multi-column', 'table'],
  row: ['horizontal', 'line', 'layout', 'table', 'record'],
  menu: ['navigation', 'hamburger', 'options', 'sidebar', 'dropdown'],
  sidebar: ['panel', 'navigation', 'drawer', 'aside', 'menu'],
  panel: ['section', 'sidebar', 'area', 'pane', 'container'],
  tab: ['section', 'page', 'switch', 'navigation', 'panel'],
  modal: ['dialog', 'popup', 'overlay', 'window', 'prompt'],
  dialog: ['modal', 'popup', 'window', 'prompt', 'conversation'],
  tooltip: ['hint', 'help', 'info', 'hover', 'popup'],
  dropdown: ['select', 'menu', 'options', 'list', 'combo'],
  drawer: ['sidebar', 'panel', 'slide', 'navigation', 'menu'],
  card: ['tile', 'container', 'panel', 'content', 'widget'],
  stack: ['layers', 'pile', 'group', 'collection', 'z-index'],
  layer: ['level', 'stack', 'overlay', 'depth', 'z-index'],
  frame: ['border', 'container', 'window', 'box', 'bounds'],
  border: ['edge', 'outline', 'frame', 'boundary', 'line'],
  progress: ['loading', 'bar', 'status', 'completion', 'percentage'],
  spinner: ['loading', 'wait', 'progress', 'processing'],
  dashboard: ['overview', 'panel', 'analytics', 'monitor', 'home', 'control'],
  widget: ['component', 'element', 'module', 'control', 'ui'],
  app: ['application', 'program', 'software', 'mobile', 'platform'],
  apps: ['applications', 'programs', 'software', 'grid', 'launcher'],
  application: ['app', 'program', 'software', 'window', 'platform'],
  view: ['see', 'display', 'show', 'look', 'perspective', 'layout'],
  content: ['material', 'data', 'information', 'body', 'substance'],
  input: ['field', 'form', 'text', 'enter', 'type', 'textbox'],
  textbox: ['input', 'field', 'form', 'text', 'enter', 'type'],
  button: ['click', 'press', 'control', 'action', 'cta', 'submit'],
  checkbox: ['check', 'select', 'option', 'tick', 'form', 'toggle'],
  toggle: ['switch', 'on off', 'control', 'flip', 'boolean'],
  slider: ['range', 'control', 'adjust', 'value', 'input'],
  selection: ['select', 'choose', 'highlight', 'pick', 'mark'],
  breadcrumb: ['navigation', 'path', 'trail', 'hierarchy', 'location'],

  // ── Shapes & Geometry ──
  circle: ['round', 'dot', 'oval', 'ring', 'sphere', 'disk'],
  square: ['rectangle', 'box', 'block', 'tile', 'quadrilateral'],
  rectangle: ['square', 'box', 'block', 'oblong', 'shape'],
  triangle: ['delta', 'pyramid', 'shape', 'three', 'arrow'],
  diamond: ['rhombus', 'gem', 'jewel', 'shape', 'precious'],
  hexagon: ['six', 'shape', 'polygon', 'honeycomb', 'cell'],
  octagon: ['eight', 'stop', 'shape', 'polygon'],
  oval: ['ellipse', 'round', 'circle', 'egg', 'shape'],
  star: ['favorite', 'rating', 'bookmark', 'featured', 'highlight', 'important'],
  ring: ['circle', 'loop', 'round', 'band', 'hoop'],
  line: ['stroke', 'rule', 'divider', 'dash', 'bar'],
  curve: ['bend', 'arc', 'wave', 'path', 'smooth'],
  wave: ['water', 'sound', 'signal', 'curve', 'ocean', 'vibration'],
  spiral: ['twist', 'helix', 'coil', 'swirl', 'vortex'],
  cube: ['3d', 'box', 'block', 'three dimensional', 'solid'],
  sphere: ['ball', 'globe', '3d', 'round', 'orb'],
  shape: ['form', 'geometry', 'figure', 'outline', 'object'],
  cross: ['plus', 'medical', 'intersection', 'x', 'religion'],

  // ── Travel & Transport ──
  car: ['vehicle', 'automobile', 'drive', 'transport', 'auto'],
  vehicle: ['car', 'automobile', 'transport', 'drive', 'motor'],
  bus: ['transport', 'vehicle', 'public', 'transit', 'commute'],
  train: ['railway', 'transport', 'rail', 'metro', 'subway', 'commute'],
  airplane: ['flight', 'travel', 'plane', 'airport', 'fly', 'jet'],
  plane: ['airplane', 'flight', 'travel', 'airport', 'fly', 'jet'],
  ship: ['boat', 'vessel', 'marine', 'nautical', 'sail', 'cruise'],
  boat: ['ship', 'vessel', 'marine', 'sail', 'yacht', 'water'],
  bicycle: ['bike', 'cycle', 'pedal', 'ride', 'transport'],
  bike: ['bicycle', 'cycle', 'pedal', 'ride', 'motorcycle'],
  rocket: ['launch', 'space', 'startup', 'fast', 'boost', 'spacecraft'],
  truck: ['delivery', 'vehicle', 'transport', 'lorry', 'freight', 'cargo'],
  taxi: ['cab', 'ride', 'transport', 'uber', 'hire'],
  ambulance: ['emergency', 'medical', 'hospital', 'health', 'vehicle', 'rescue'],
  helicopter: ['aircraft', 'fly', 'aerial', 'chopper', 'transport'],
  map: ['location', 'navigate', 'geography', 'directions', 'atlas', 'place'],
  maps: ['location', 'navigate', 'geography', 'directions', 'atlas'],
  pin: ['location', 'marker', 'place', 'map', 'gps', 'point'],
  location: ['place', 'position', 'map', 'gps', 'pin', 'address'],
  globe: ['world', 'earth', 'international', 'global', 'planet', 'web'],
  flag: ['country', 'marker', 'report', 'nation', 'banner', 'milestone'],
  compass: ['direction', 'navigate', 'north', 'orientation', 'heading', 'explore'],
  parking: ['car', 'vehicle', 'park', 'lot', 'space', 'garage'],
  gas: ['fuel', 'petrol', 'station', 'vehicle', 'energy'],
  ev: ['electric vehicle', 'charging', 'car', 'green', 'sustainable'],
  passport: ['travel', 'identity', 'document', 'international', 'visa'],
  luggage: ['travel', 'suitcase', 'bag', 'trip', 'journey', 'baggage'],
  suitcase: ['luggage', 'travel', 'bag', 'trip', 'case'],

  // ── Weather & Nature ──
  sun: ['sunny', 'day', 'bright', 'light', 'weather', 'solar'],
  moon: ['night', 'dark', 'lunar', 'sleep', 'crescent', 'evening'],
  cloud: ['sky', 'weather', 'hosting', 'storage', 'overcast', 'fog'],
  cloudy: ['overcast', 'weather', 'sky', 'fog', 'haze', 'cloud'],
  rain: ['precipitation', 'weather', 'wet', 'drizzle', 'shower', 'water'],
  snow: ['winter', 'cold', 'weather', 'ice', 'frost', 'flake'],
  wind: ['breeze', 'weather', 'air', 'blow', 'gust'],
  storm: ['thunder', 'lightning', 'weather', 'severe', 'tempest'],
  lightning: ['thunder', 'storm', 'electric', 'fast', 'flash', 'bolt', 'power'],
  flash: ['lightning', 'camera', 'fast', 'instant', 'bright', 'bolt'],
  thunder: ['storm', 'lightning', 'weather', 'loud', 'bolt'],
  temperature: ['heat', 'cold', 'thermometer', 'degree', 'weather', 'warm'],
  thermometer: ['temperature', 'heat', 'measure', 'medical', 'fever'],
  fire: ['flame', 'hot', 'burn', 'heat', 'trending', 'popular'],
  flame: ['fire', 'hot', 'burn', 'heat', 'energy', 'trending'],
  water: ['liquid', 'drop', 'ocean', 'sea', 'hydrate', 'aqua'],
  tree: ['nature', 'plant', 'forest', 'wood', 'environment', 'green', 'leaf'],
  leaf: ['nature', 'plant', 'green', 'eco', 'organic', 'environment'],
  flower: ['plant', 'nature', 'bloom', 'garden', 'floral', 'blossom'],
  mountain: ['hill', 'peak', 'nature', 'landscape', 'terrain', 'outdoor'],
  landscape: ['scenery', 'nature', 'view', 'outdoor', 'terrain', 'photo'],
  planet: ['space', 'earth', 'globe', 'world', 'astronomy', 'orbit'],
  earth: ['globe', 'world', 'planet', 'international', 'nature'],
  sparkle: ['shine', 'glitter', 'magic', 'star', 'ai', 'new', 'special', 'clean'],
  energy: ['power', 'electric', 'force', 'strength', 'charge'],
  sunrise: ['dawn', 'morning', 'sun', 'day', 'weather', 'begin'],
  sunset: ['dusk', 'evening', 'sun', 'day', 'weather', 'end'],

  // ── Food & Drink ──
  food: ['eat', 'meal', 'cuisine', 'restaurant', 'dining', 'nutrition'],
  drink: ['beverage', 'liquid', 'cup', 'glass', 'refreshment'],
  cup: ['mug', 'drink', 'coffee', 'tea', 'beverage', 'glass'],
  coffee: ['drink', 'cafe', 'cup', 'espresso', 'beverage', 'hot'],
  tea: ['drink', 'cup', 'beverage', 'hot', 'herbal'],
  bottle: ['container', 'drink', 'liquid', 'water', 'beverage'],
  glass: ['drink', 'cup', 'transparent', 'beverage', 'wine'],
  wine: ['drink', 'alcohol', 'glass', 'beverage', 'grape'],
  beer: ['drink', 'alcohol', 'beverage', 'mug', 'pint'],
  pizza: ['food', 'eat', 'slice', 'italian', 'meal', 'fast food'],
  apple: ['fruit', 'food', 'health', 'nutrition', 'education'],
  egg: ['food', 'breakfast', 'nutrition', 'protein', 'oval'],

  // ── Health & Medical ──
  medical: ['health', 'hospital', 'doctor', 'medicine', 'clinical', 'healthcare'],
  health: ['medical', 'wellness', 'fitness', 'care', 'vital'],
  medicine: ['drug', 'pharmaceutical', 'health', 'treatment', 'pill'],
  pill: ['medicine', 'drug', 'tablet', 'capsule', 'health', 'pharmaceutical'],
  stethoscope: ['doctor', 'medical', 'health', 'diagnose', 'hospital'],
  syringe: ['injection', 'medical', 'vaccine', 'needle', 'health'],
  bandage: ['medical', 'wound', 'heal', 'first aid', 'injury'],
  wheelchair: ['accessibility', 'disability', 'mobility', 'medical'],
  accessibility: ['disability', 'inclusive', 'a11y', 'universal', 'wheelchair'],
  aed: ['defibrillator', 'emergency', 'medical', 'heart', 'resuscitation', 'life saving'],
  pulse: ['heartbeat', 'vital', 'health', 'monitor', 'rhythm', 'medical'],

  // ── Sports & Fitness ──
  sport: ['athletics', 'exercise', 'game', 'fitness', 'competition'],
  fitness: ['exercise', 'health', 'workout', 'gym', 'sport'],
  football: ['soccer', 'sport', 'ball', 'game', 'kick'],
  basketball: ['sport', 'ball', 'game', 'hoop', 'court'],
  baseball: ['sport', 'ball', 'bat', 'game', 'pitch'],
  tennis: ['sport', 'racket', 'ball', 'game', 'court'],
  golf: ['sport', 'club', 'ball', 'game', 'course', 'tee'],
  swimming: ['pool', 'water', 'sport', 'exercise', 'swim'],
  archery: ['bow', 'target', 'sport', 'aim', 'shoot'],
  skiing: ['snow', 'winter', 'sport', 'mountain', 'slope'],

  // ── Tools & Work ──
  tool: ['utility', 'instrument', 'hardware', 'wrench', 'equipment'],
  toolbox: ['toolkit', 'tools', 'utility', 'repair', 'maintenance', 'equipment'],
  wrench: ['tool', 'fix', 'repair', 'settings', 'spanner', 'maintenance'],
  hammer: ['tool', 'build', 'construct', 'fix', 'nail', 'hit'],
  screwdriver: ['tool', 'fix', 'repair', 'screw', 'hardware'],
  gear: ['settings', 'cog', 'configure', 'mechanical', 'options', 'preferences'],
  cog: ['gear', 'settings', 'configure', 'options', 'mechanical'],
  settings: ['preferences', 'configure', 'options', 'gear', 'control', 'customize'],
  briefcase: ['work', 'business', 'professional', 'portfolio', 'career', 'job'],
  calculator: ['math', 'compute', 'calculate', 'numbers', 'arithmetic'],
  clipboard: ['paste', 'copy', 'buffer', 'board', 'tasks', 'checklist'],
  scissors: ['cut', 'trim', 'clip', 'snip', 'craft'],
  magnet: ['attract', 'pull', 'magnetic', 'attach'],
  brush: ['paint', 'art', 'draw', 'design', 'style', 'creative'],
  palette: ['color', 'art', 'design', 'paint', 'creative'],
  paint: ['color', 'art', 'brush', 'design', 'creative', 'draw'],
  lens: ['magnify', 'zoom', 'camera', 'focus', 'optic'],
  flask: ['science', 'experiment', 'chemistry', 'lab', 'research', 'test'],
  beaker: ['science', 'experiment', 'chemistry', 'lab', 'research'],
  microscope: ['science', 'zoom', 'research', 'lab', 'magnify', 'examine'],
  telescope: ['astronomy', 'space', 'zoom', 'observe', 'far', 'look'],

  // ── Calendar & Time ──
  calendar: ['date', 'schedule', 'event', 'plan', 'appointment', 'day'],
  clock: ['time', 'hour', 'watch', 'schedule', 'timer', 'deadline'],
  time: ['clock', 'hour', 'schedule', 'duration', 'watch', 'period'],
  timer: ['countdown', 'clock', 'stopwatch', 'duration', 'time'],
  hourglass: ['wait', 'time', 'loading', 'patience', 'timer', 'sand'],
  watch: ['time', 'clock', 'wristwatch', 'wearable', 'schedule'],
  schedule: ['calendar', 'plan', 'timetable', 'event', 'agenda', 'appointment'],
  event: ['calendar', 'schedule', 'occasion', 'appointment', 'meeting'],
  date: ['calendar', 'day', 'schedule', 'time', 'appointment'],
  day: ['date', 'calendar', 'daily', 'sun', 'daytime'],
  week: ['calendar', 'days', 'schedule', 'weekly', 'period'],
  history: ['past', 'log', 'record', 'timeline', 'previous', 'undo'],
  timeline: ['history', 'schedule', 'progress', 'sequence', 'events', 'chronology'],

  // ── Development ──
  git: ['version control', 'repository', 'branch', 'commit', 'source'],
  branch: ['git', 'tree', 'fork', 'diverge', 'version'],
  commit: ['git', 'save', 'version', 'submit', 'push'],
  bug: ['error', 'defect', 'issue', 'debug', 'fix', 'problem', 'insect'],
  debug: ['fix', 'troubleshoot', 'error', 'bug', 'inspect'],
  error: ['bug', 'issue', 'problem', 'fail', 'warning', 'exception'],
  api: ['interface', 'endpoint', 'rest', 'service', 'integration'],
  script: ['code', 'program', 'automate', 'run', 'execute'],
  data: ['information', 'database', 'records', 'content', 'analytics'],
  json: ['data', 'format', 'api', 'object', 'config'],
  xml: ['data', 'format', 'markup', 'config', 'document'],
  html: ['web', 'markup', 'page', 'code', 'document'],
  css: ['style', 'design', 'web', 'layout', 'theme'],
  variable: ['parameter', 'value', 'data', 'config', 'setting'],
  function: ['method', 'procedure', 'action', 'code', 'routine'],
  node: ['point', 'connection', 'network', 'server', 'vertex'],
  intersection: ['overlap', 'cross', 'merge', 'junction', 'combine'],
  union: ['merge', 'combine', 'join', 'set', 'unite'],

  // ── Miscellaneous Objects ──
  bookmark: ['save', 'favorite', 'mark', 'remember', 'tag', 'flag'],
  link: ['url', 'chain', 'connect', 'hyperlink', 'reference', 'anchor'],
  chain: ['link', 'connect', 'blockchain', 'sequence', 'bond'],
  clip: ['attach', 'paperclip', 'fastener', 'hold', 'bind'],
  paperclip: ['attach', 'clip', 'fastener', 'hold', 'bind', 'email'],
  magnet: ['attract', 'pull', 'magnetic', 'attach', 'force'],
  sticker: ['label', 'tag', 'badge', 'decal', 'adhesive'],
  ribbon: ['award', 'decoration', 'badge', 'banner', 'bow'],
  trash: ['delete', 'remove', 'bin', 'garbage', 'discard', 'waste'],
  bin: ['trash', 'delete', 'garbage', 'recycle', 'waste', 'discard'],
  recycle: ['reuse', 'green', 'environment', 'eco', 'sustainable'],
  box: ['container', 'package', 'crate', 'square', 'storage'],
  package: ['box', 'parcel', 'delivery', 'ship', 'bundle', 'npm'],
  container: ['box', 'vessel', 'holder', 'docker', 'storage'],
  basket: ['container', 'shopping', 'collect', 'carry', 'bin'],
  bucket: ['container', 'pail', 'vessel', 'storage', 's3'],
  pail: ['bucket', 'container', 'vessel', 'bin'],
  bottle: ['container', 'drink', 'liquid', 'vessel', 'flask'],
  lamp: ['light', 'illuminate', 'glow', 'bulb', 'desk'],
  candle: ['light', 'flame', 'wax', 'birthday', 'romantic'],
  torch: ['flashlight', 'light', 'illuminate', 'search'],
  umbrella: ['rain', 'weather', 'protection', 'shelter', 'cover'],
  mask: ['face', 'cover', 'hide', 'disguise', 'protection', 'costume'],
  glasses: ['eyewear', 'vision', 'reading', 'spectacles', 'optic'],
  hat: ['cap', 'head', 'clothing', 'wear', 'accessory'],
  cap: ['hat', 'head', 'cover', 'lid', 'top'],
  clothes: ['clothing', 'garment', 'wear', 'apparel', 'fashion', 'outfit'],
  shirt: ['clothing', 'wear', 'garment', 'top', 'apparel'],
  pants: ['clothing', 'trousers', 'wear', 'garment', 'bottom'],
  suit: ['clothing', 'formal', 'business', 'professional', 'outfit'],
  shoe: ['footwear', 'boot', 'sneaker', 'wear', 'walk'],
  watch: ['time', 'clock', 'wristwatch', 'wearable', 'accessory'],
  ring: ['jewelry', 'circle', 'band', 'accessory', 'wedding'],
  gift: ['present', 'surprise', 'reward', 'give', 'box', 'wrap'],
  toy: ['play', 'game', 'child', 'fun', 'entertainment'],
  tent: ['camp', 'outdoor', 'shelter', 'nature', 'adventure'],
  flag: ['banner', 'marker', 'country', 'report', 'signal', 'milestone'],
  anchor: ['marine', 'nautical', 'link', 'stable', 'port', 'dock'],
  compass: ['direction', 'navigate', 'north', 'orientation', 'explore'],
  trophy: ['award', 'winner', 'prize', 'achievement', 'cup'],
  medal: ['award', 'achievement', 'prize', 'winner', 'honor'],
  crown: ['king', 'queen', 'royal', 'premium', 'vip', 'top'],
  zodiac: ['astrology', 'horoscope', 'constellation', 'sign', 'star'],

  // ── Actions/States (miscellaneous) ──
  focus: ['target', 'center', 'aim', 'concentrate', 'attention', 'crosshair'],
  target: ['aim', 'goal', 'focus', 'bullseye', 'objective'],
  prohibited: ['forbidden', 'blocked', 'banned', 'restricted', 'not allowed', 'stop'],
  success: ['complete', 'done', 'pass', 'achieve', 'check', 'approve'],
  info: ['information', 'about', 'help', 'details', 'tooltip'],
  information: ['info', 'about', 'help', 'details', 'notice'],
  help: ['support', 'question', 'assist', 'faq', 'guide', 'info'],
  question: ['ask', 'help', 'faq', 'inquiry', 'unknown', 'support'],
  task: ['todo', 'action', 'item', 'work', 'job', 'assignment'],
  process: ['workflow', 'pipeline', 'steps', 'procedure', 'flow'],
  flow: ['process', 'stream', 'sequence', 'pipeline', 'workflow'],
  collection: ['group', 'set', 'gather', 'library', 'bundle'],
  empty: ['blank', 'void', 'clear', 'none', 'zero', 'placeholder'],
  full: ['complete', 'filled', 'maximum', 'entire', 'whole'],
  new: ['create', 'fresh', 'add', 'recent', 'latest'],
  old: ['previous', 'legacy', 'archive', 'history', 'past'],
  mode: ['state', 'setting', 'option', 'view', 'style'],
  speed: ['fast', 'velocity', 'performance', 'quick', 'rate'],
  strength: ['power', 'strong', 'force', 'intensity', 'level'],

  // ── Brand/Software (common ones worth tagging) ──
  google: ['search', 'alphabet', 'tech', 'platform'],
  github: ['code', 'repository', 'git', 'open source', 'developer'],
  apple: ['mac', 'ios', 'iphone', 'tech', 'fruit'],
  android: ['mobile', 'google', 'phone', 'os', 'app'],
  amazon: ['aws', 'ecommerce', 'shopping', 'cloud'],
  microsoft: ['windows', 'office', 'tech', 'azure'],
  adobe: ['creative', 'design', 'photoshop', 'software'],
  slack: ['messaging', 'team', 'chat', 'communication', 'workspace'],
  discord: ['chat', 'voice', 'gaming', 'community', 'messaging'],
  spotify: ['music', 'streaming', 'audio', 'playlist'],
  instagram: ['social', 'photo', 'image', 'stories', 'meta'],
  facebook: ['social', 'meta', 'community', 'network'],
  twitter: ['social', 'tweet', 'x', 'microblog', 'post'],
  youtube: ['video', 'streaming', 'watch', 'channel', 'media'],
  linkedin: ['professional', 'network', 'career', 'job', 'social'],
  whatsapp: ['messaging', 'chat', 'phone', 'communication'],
  telegram: ['messaging', 'chat', 'communication', 'channel'],
  tiktok: ['video', 'social', 'short', 'entertainment'],
  pinterest: ['inspiration', 'pin', 'board', 'visual', 'ideas'],
  snapchat: ['social', 'photo', 'message', 'snap', 'stories'],
  reddit: ['forum', 'community', 'discussion', 'social', 'thread'],
  stripe: ['payment', 'billing', 'fintech', 'commerce', 'transaction'],
  paypal: ['payment', 'money', 'transaction', 'online', 'finance'],
  shopify: ['ecommerce', 'store', 'shop', 'retail', 'commerce'],
  wordpress: ['cms', 'blog', 'website', 'publishing', 'content'],
  figma: ['design', 'ui', 'prototype', 'collaborate', 'vector'],
  sketch: ['design', 'ui', 'prototype', 'vector', 'mac'],
  notion: ['notes', 'workspace', 'organize', 'wiki', 'documentation'],
  trello: ['kanban', 'board', 'tasks', 'project', 'organize'],
  jira: ['project', 'tasks', 'agile', 'tickets', 'issues', 'sprint'],
  npm: ['package', 'node', 'javascript', 'dependency', 'module'],
  docker: ['container', 'deploy', 'devops', 'infrastructure', 'virtualize'],
  kubernetes: ['container', 'orchestration', 'deploy', 'k8s', 'devops'],
  aws: ['cloud', 'amazon', 'hosting', 'infrastructure', 'services'],
  azure: ['cloud', 'microsoft', 'hosting', 'infrastructure'],
  angular: ['framework', 'web', 'javascript', 'spa', 'frontend'],
  react: ['framework', 'web', 'javascript', 'component', 'frontend'],
  vue: ['framework', 'web', 'javascript', 'component', 'frontend'],
  python: ['programming', 'language', 'script', 'code', 'snake'],
  java: ['programming', 'language', 'code', 'enterprise'],
  swift: ['programming', 'language', 'apple', 'ios', 'code'],
  rust: ['programming', 'language', 'systems', 'code', 'performance'],
  angularjs: ['framework', 'web', 'javascript', 'spa', 'frontend'],

  // ── Food & Drink (extended) ──
  avocado: ['fruit', 'food', 'healthy', 'green', 'nutrition'],
  barbecue: ['grill', 'bbq', 'cook', 'food', 'outdoor', 'meat'],
  bbq: ['barbecue', 'grill', 'cook', 'food', 'outdoor', 'meat'],
  bread: ['food', 'bakery', 'loaf', 'wheat', 'toast', 'bake'],
  cafe: ['coffee', 'restaurant', 'drink', 'shop', 'espresso'],
  chicken: ['poultry', 'food', 'meat', 'bird', 'animal', 'farm'],
  chocolate: ['candy', 'sweet', 'dessert', 'food', 'treat', 'cocoa'],
  cola: ['soda', 'drink', 'beverage', 'soft drink', 'pop'],
  cook: ['chef', 'kitchen', 'food', 'prepare', 'recipe', 'meal'],
  cooking: ['chef', 'kitchen', 'food', 'prepare', 'recipe', 'meal'],
  cookies: ['biscuit', 'sweet', 'food', 'bake', 'treat', 'web'],
  doughnut: ['donut', 'pastry', 'sweet', 'food', 'dessert', 'bakery'],
  eggplant: ['vegetable', 'food', 'aubergine', 'produce', 'purple'],
  garlic: ['spice', 'food', 'vegetable', 'cooking', 'ingredient'],
  honey: ['sweet', 'bee', 'food', 'golden', 'natural', 'syrup'],
  icecream: ['dessert', 'sweet', 'cold', 'treat', 'frozen', 'cone'],
  juice: ['drink', 'beverage', 'fruit', 'liquid', 'fresh', 'smoothie'],
  liqueur: ['alcohol', 'drink', 'spirit', 'beverage', 'cocktail'],
  milk: ['dairy', 'drink', 'beverage', 'nutrition', 'white'],
  orange: ['fruit', 'food', 'citrus', 'color', 'juice', 'vitamin'],
  peach: ['fruit', 'food', 'sweet', 'soft', 'summer'],
  pear: ['fruit', 'food', 'green', 'nutrition', 'produce'],
  peas: ['vegetable', 'food', 'green', 'pod', 'legume'],
  pineapple: ['fruit', 'food', 'tropical', 'sweet', 'exotic'],
  popcorn: ['snack', 'food', 'cinema', 'movie', 'corn'],
  radish: ['vegetable', 'food', 'root', 'produce', 'red'],
  restaurant: ['dining', 'food', 'eat', 'meal', 'cafe', 'kitchen'],
  salad: ['food', 'healthy', 'vegetable', 'green', 'meal', 'diet'],
  sandwich: ['food', 'meal', 'bread', 'lunch', 'snack'],
  snacks: ['food', 'treats', 'nibbles', 'munchies', 'bite'],
  spoon: ['utensil', 'cutlery', 'eat', 'kitchen', 'silverware'],
  tomato: ['vegetable', 'food', 'red', 'produce', 'ketchup'],
  watermelon: ['fruit', 'food', 'summer', 'melon', 'sweet', 'juicy'],

  // ── Sports & Activities (extended) ──
  boxing: ['fight', 'sport', 'gloves', 'punch', 'ring', 'martial arts'],
  cycling: ['bicycle', 'bike', 'ride', 'sport', 'exercise', 'pedal'],
  gymnastics: ['sport', 'exercise', 'acrobatics', 'flexibility', 'athletic'],
  jump: ['leap', 'hop', 'bounce', 'skip', 'spring'],
  kick: ['foot', 'strike', 'sport', 'soccer', 'martial arts'],
  kitesurfing: ['sport', 'water', 'wind', 'kite', 'surf', 'extreme'],
  running: ['jog', 'sprint', 'exercise', 'fitness', 'race', 'run'],
  rugby: ['sport', 'ball', 'football', 'tackle', 'game'],
  skating: ['ice', 'sport', 'skate', 'rink', 'winter', 'roller'],
  skiing: ['snow', 'winter', 'sport', 'mountain', 'slope', 'ski'],
  soccer: ['football', 'sport', 'ball', 'game', 'kick', 'goal'],
  softball: ['sport', 'ball', 'baseball', 'game', 'pitch'],
  surfing: ['wave', 'ocean', 'sport', 'water', 'beach', 'surf'],
  swimming: ['pool', 'water', 'sport', 'exercise', 'swim', 'aquatic'],
  walking: ['walk', 'pedestrian', 'stroll', 'hike', 'step', 'exercise'],
  weightlifting: ['gym', 'exercise', 'strength', 'fitness', 'barbell', 'sport'],
  wrestling: ['sport', 'fight', 'grapple', 'martial arts', 'combat'],

  // ── Clothing & Accessories (extended) ──
  boots: ['footwear', 'shoe', 'clothing', 'hiking', 'winter', 'fashion'],
  comb: ['hair', 'groom', 'brush', 'styling', 'accessory'],
  glove: ['hand', 'wear', 'protection', 'clothing', 'winter'],
  jacket: ['coat', 'clothing', 'outerwear', 'wear', 'fashion'],
  mustache: ['facial hair', 'moustache', 'face', 'grooming', 'style'],
  necktie: ['tie', 'formal', 'business', 'clothing', 'professional'],
  shorts: ['clothing', 'pants', 'wear', 'summer', 'casual', 'sport'],
  skirt: ['clothing', 'wear', 'dress', 'fashion', 'garment'],
  socks: ['footwear', 'clothing', 'feet', 'wear', 'hosiery'],
  slippers: ['footwear', 'comfort', 'home', 'indoor', 'casual'],
  sweater: ['clothing', 'warm', 'knit', 'pullover', 'winter', 'jumper'],
  swimsuit: ['clothing', 'swim', 'beach', 'pool', 'bathing suit'],
  vest: ['clothing', 'waistcoat', 'layer', 'wear', 'garment'],
  panties: ['underwear', 'clothing', 'garment', 'intimate', 'lingerie'],

  // ── Animals (extended) ──
  bear: ['animal', 'wildlife', 'mammal', 'teddy', 'grizzly', 'nature'],
  cattle: ['cow', 'livestock', 'farm', 'animal', 'bovine', 'agriculture'],
  crab: ['seafood', 'animal', 'ocean', 'marine', 'crustacean', 'beach'],
  eagle: ['bird', 'animal', 'fly', 'predator', 'freedom', 'soar'],
  frog: ['amphibian', 'animal', 'pond', 'nature', 'jump', 'ribbit'],
  hippo: ['hippopotamus', 'animal', 'wildlife', 'africa', 'mammal'],
  koala: ['animal', 'australia', 'wildlife', 'bear', 'cute', 'marsupial'],
  monkey: ['primate', 'animal', 'ape', 'jungle', 'wildlife', 'playful'],
  pigeon: ['bird', 'animal', 'dove', 'fly', 'city', 'messenger'],
  whale: ['marine', 'ocean', 'animal', 'mammal', 'sea', 'large'],
  wolf: ['animal', 'canine', 'wildlife', 'predator', 'pack', 'howl'],

  // ── Buildings & Places (extended) ──
  arena: ['stadium', 'venue', 'sports', 'amphitheater', 'event'],
  bathroom: ['toilet', 'restroom', 'washroom', 'lavatory', 'bath'],
  bench: ['seat', 'park', 'sit', 'furniture', 'outdoor', 'rest'],
  billboard: ['advertisement', 'sign', 'display', 'outdoor', 'marketing'],
  court: ['legal', 'justice', 'sports', 'law', 'judge', 'tennis'],
  gym: ['fitness', 'exercise', 'workout', 'health', 'training', 'sport'],
  kiosk: ['booth', 'stand', 'terminal', 'retail', 'information'],
  market: ['shop', 'store', 'retail', 'trade', 'bazaar', 'commerce'],
  metro: ['subway', 'underground', 'train', 'transport', 'transit', 'urban'],
  shore: ['beach', 'coast', 'seaside', 'waterfront', 'ocean'],
  summit: ['peak', 'mountain', 'top', 'conference', 'meeting', 'apex'],
  terrace: ['patio', 'balcony', 'outdoor', 'deck', 'garden'],
  yurt: ['tent', 'dwelling', 'nomadic', 'shelter', 'camping'],

  // ── Tools & Objects (extended) ──
  balance: ['scale', 'weigh', 'equal', 'equilibrium', 'justice', 'measure'],
  ballot: ['vote', 'election', 'poll', 'choose', 'democracy', 'politics'],
  bandaid: ['bandage', 'medical', 'wound', 'first aid', 'heal', 'plaster'],
  blackboard: ['chalkboard', 'teach', 'school', 'education', 'write'],
  boiler: ['heat', 'water', 'furnace', 'appliance', 'steam'],
  easel: ['art', 'paint', 'canvas', 'stand', 'drawing', 'display'],
  floppy: ['disk', 'save', 'storage', 'retro', 'vintage', 'data'],
  hook: ['hang', 'catch', 'attach', 'fastener', 'hanger', 'connect'],
  iron: ['press', 'clothes', 'appliance', 'metal', 'smooth', 'laundry'],
  knife: ['cut', 'blade', 'sharp', 'kitchen', 'tool', 'slice'],
  mortar: ['grind', 'pestle', 'pharmacy', 'kitchen', 'crush', 'mix'],
  oar: ['row', 'paddle', 'boat', 'water', 'canoe'],
  oven: ['bake', 'cook', 'kitchen', 'heat', 'appliance', 'roast'],
  pillow: ['sleep', 'bed', 'rest', 'comfort', 'cushion', 'soft'],
  rope: ['tie', 'bind', 'cord', 'string', 'climb', 'knot'],
  shovel: ['dig', 'tool', 'garden', 'construction', 'spade'],
  stroller: ['baby', 'pram', 'pushchair', 'child', 'carriage', 'walk'],
  tub: ['bath', 'container', 'basin', 'wash', 'soak'],
  washer: ['laundry', 'wash', 'machine', 'appliance', 'clean', 'clothes'],
  whiteboard: ['board', 'write', 'teach', 'present', 'marker', 'meeting'],
  toolkit: ['tools', 'utility', 'kit', 'repair', 'equipment', 'set'],

  // ── Technology (extended) ──
  dns: ['domain', 'network', 'server', 'internet', 'resolve', 'hosting'],
  hdmi: ['cable', 'video', 'display', 'port', 'connect', 'tv'],
  internet: ['web', 'online', 'network', 'global', 'www', 'connection'],
  modem: ['network', 'internet', 'connect', 'router', 'broadband'],
  motherboard: ['hardware', 'circuit', 'computer', 'board', 'component'],
  nvme: ['storage', 'ssd', 'fast', 'disk', 'drive', 'data'],
  pc: ['computer', 'desktop', 'personal', 'windows', 'machine', 'workstation'],
  responsive: ['adaptive', 'mobile', 'screen', 'layout', 'design', 'web'],
  ssh: ['terminal', 'remote', 'secure', 'shell', 'connect', 'server'],
  stream: ['live', 'broadcast', 'media', 'flow', 'video', 'content'],
  trackpad: ['touchpad', 'input', 'laptop', 'gesture', 'mouse', 'cursor'],
  transmission: ['transfer', 'send', 'data', 'broadcast', 'signal', 'network'],
  webcam: ['camera', 'video', 'call', 'conference', 'stream', 'face'],
  cellular: ['mobile', 'phone', 'signal', 'network', 'data', 'wireless'],
  ipod: ['music', 'apple', 'player', 'audio', 'portable', 'device'],

  // ── Brands (extended — common recognizable ones) ──
  chrome: ['browser', 'google', 'web', 'internet', 'navigate'],
  firefox: ['browser', 'mozilla', 'web', 'internet', 'navigate'],
  safari: ['browser', 'apple', 'web', 'internet', 'navigate'],
  opera: ['browser', 'web', 'internet', 'navigate', 'software'],
  edge: ['browser', 'microsoft', 'web', 'internet', 'navigate'],
  bluesky: ['social', 'microblog', 'post', 'network', 'feed'],
  behance: ['design', 'portfolio', 'creative', 'adobe', 'showcase'],
  dribbble: ['design', 'portfolio', 'creative', 'showcase', 'ui'],
  mastodon: ['social', 'fediverse', 'microblog', 'decentralized', 'network'],
  messenger: ['chat', 'message', 'facebook', 'meta', 'communication'],
  netflix: ['streaming', 'video', 'entertainment', 'watch', 'movie', 'tv'],
  visa: ['payment', 'credit card', 'finance', 'bank', 'transaction'],
  mastercard: ['payment', 'credit card', 'finance', 'bank', 'transaction'],

  // ── Misc concepts (extended) ──
  assistant: ['help', 'support', 'aide', 'guide', 'helper', 'ai'],
  audit: ['review', 'inspect', 'check', 'compliance', 'verify', 'examine'],
  build: ['construct', 'create', 'compile', 'make', 'develop', 'assemble'],
  compose: ['write', 'create', 'draft', 'author', 'new', 'message'],
  compress: ['shrink', 'zip', 'reduce', 'compact', 'squeeze', 'archive'],
  creative: ['design', 'art', 'imagination', 'innovative', 'artistic'],
  developer: ['programmer', 'coder', 'engineer', 'software', 'build', 'tech'],
  diversity: ['inclusion', 'variety', 'multicultural', 'different', 'equal'],
  donate: ['give', 'charity', 'contribute', 'gift', 'support', 'generous'],
  duplicate: ['copy', 'clone', 'replicate', 'double', 'twin'],
  enlarge: ['expand', 'bigger', 'grow', 'zoom', 'magnify', 'maximize'],
  escape: ['exit', 'close', 'cancel', 'leave', 'back', 'esc'],
  feed: ['news', 'rss', 'stream', 'content', 'updates', 'timeline'],
  fluid: ['liquid', 'water', 'flow', 'dynamic', 'smooth'],
  front: ['forward', 'face', 'ahead', 'foreground', 'before'],
  geo: ['geographic', 'location', 'map', 'earth', 'coordinate', 'gps'],
  industry: ['factory', 'manufacturing', 'industrial', 'production', 'business'],
  launch: ['start', 'begin', 'rocket', 'release', 'deploy', 'open'],
  mention: ['tag', 'reference', 'at', 'notify', 'cite', 'call out'],
  motion: ['movement', 'animate', 'dynamic', 'action', 'kinetic'],
  premium: ['paid', 'vip', 'exclusive', 'pro', 'upgrade', 'quality'],
  production: ['manufacturing', 'create', 'output', 'build', 'deploy'],
  publish: ['release', 'deploy', 'post', 'share', 'distribute', 'launch'],
  push: ['send', 'notification', 'force', 'move', 'deploy', 'forward'],
  status: ['state', 'indicator', 'condition', 'online', 'availability'],
  theme: ['appearance', 'style', 'design', 'skin', 'look', 'customize'],
  transition: ['change', 'animation', 'transform', 'morph', 'fade', 'switch'],
  storage: ['save', 'data', 'disk', 'warehouse', 'keep', 'persist'],
  board: ['panel', 'kanban', 'surface', 'game', 'dashboard', 'bulletin'],
  compare: ['diff', 'contrast', 'versus', 'match', 'evaluate', 'side by side'],
  consolidate: ['merge', 'combine', 'unify', 'gather', 'integrate'],
  contain: ['hold', 'include', 'enclose', 'wrap', 'boundary'],
  identify: ['recognize', 'detect', 'verify', 'authenticate', 'find'],
  identification: ['id', 'identity', 'badge', 'card', 'verify', 'credential'],
  offer: ['deal', 'discount', 'proposal', 'promotion', 'price'],
  organization: ['company', 'business', 'group', 'team', 'structure', 'org'],
  orientation: ['direction', 'rotate', 'landscape', 'portrait', 'position'],
  pivot: ['rotate', 'turn', 'table', 'change', 'transform', 'switch'],
  segment: ['section', 'part', 'divide', 'piece', 'slice', 'portion'],
  sticker: ['label', 'tag', 'badge', 'decal', 'adhesive', 'emoji'],
  trace: ['follow', 'track', 'path', 'outline', 'debug', 'log'],
  read: ['view', 'book', 'text', 'article', 'document', 'study'],
  reward: ['prize', 'bonus', 'award', 'incentive', 'earn', 'gift'],
  savings: ['save', 'money', 'bank', 'piggy', 'deposit', 'finance'],
  medium: ['blog', 'article', 'platform', 'publish', 'writing'],
  light: ['bright', 'illuminate', 'lamp', 'glow', 'sun', 'on'],
  dash: ['line', 'stroke', 'run', 'sprint', 'divider', 'hyphen'],
  position: ['location', 'place', 'coordinate', 'spot', 'layout', 'arrange'],
  cc: ['closed captions', 'subtitles', 'accessibility', 'creative commons'],
  channel: ['stream', 'broadcast', 'tube', 'media', 'communication'],
  muscle: ['strength', 'fitness', 'body', 'exercise', 'flex', 'gym'],
  foot: ['step', 'walk', 'leg', 'body', 'sole', 'print'],
  jump: ['leap', 'hop', 'bounce', 'skip', 'spring', 'exercise'],
  previous: ['back', 'before', 'prior', 'last', 'rewind', 'return'],
  justify: ['align', 'text', 'format', 'even', 'distribute'],

  // ── Zodiac & Astrology ──
  aquarius: ['zodiac', 'astrology', 'horoscope', 'sign', 'water bearer'],
  aries: ['zodiac', 'astrology', 'horoscope', 'sign', 'ram'],
  cancer: ['zodiac', 'astrology', 'horoscope', 'sign', 'crab'],
  capricornus: ['zodiac', 'astrology', 'horoscope', 'sign', 'capricorn', 'goat'],
  gemini: ['zodiac', 'astrology', 'horoscope', 'sign', 'twins'],
  leo: ['zodiac', 'astrology', 'horoscope', 'sign', 'lion'],
  libra: ['zodiac', 'astrology', 'horoscope', 'sign', 'scales', 'balance'],
  pisces: ['zodiac', 'astrology', 'horoscope', 'sign', 'fish'],
  sagittarius: ['zodiac', 'astrology', 'horoscope', 'sign', 'archer'],
  scorpio: ['zodiac', 'astrology', 'horoscope', 'sign', 'scorpion'],
  taurus: ['zodiac', 'astrology', 'horoscope', 'sign', 'bull'],
  virgo: ['zodiac', 'astrology', 'horoscope', 'sign', 'maiden'],

  // ── More objects/concepts ──
  advertisements: ['ad', 'promotion', 'marketing', 'banner', 'commercial'],
  arcade: ['game', 'play', 'entertainment', 'retro', 'fun', 'machine'],
  atm: ['cash', 'bank', 'money', 'withdraw', 'machine', 'finance'],
  ammunition: ['ammo', 'bullet', 'military', 'weapon', 'shell'],
  binocular: ['see', 'look', 'observe', 'distant', 'lens', 'scout'],
  bezier: ['curve', 'path', 'vector', 'design', 'anchor', 'pen tool'],
  bricks: ['build', 'wall', 'construction', 'block', 'masonry', 'lego'],
  bridge: ['connect', 'crossing', 'span', 'structure', 'link', 'overpass'],
  cast: ['broadcast', 'stream', 'screen', 'mirror', 'display', 'chromecast'],
  cellar: ['basement', 'underground', 'storage', 'wine', 'room'],
  chess: ['game', 'strategy', 'board', 'piece', 'play', 'checkmate'],
  chili: ['pepper', 'spicy', 'hot', 'food', 'red', 'seasoning'],
  cinema: ['movie', 'film', 'theater', 'entertainment', 'watch', 'screen'],
  class: ['category', 'type', 'group', 'object', 'oop', 'education'],
  classification: ['category', 'sort', 'organize', 'label', 'taxonomy', 'group'],
  collections: ['group', 'set', 'gather', 'library', 'bundle', 'album'],
  comma: ['punctuation', 'text', 'separator', 'grammar', 'syntax'],
  conditioner: ['hair', 'air', 'ac', 'cooling', 'climate', 'care'],
  construct: ['build', 'create', 'assemble', 'make', 'develop', 'erect'],
  convert: ['transform', 'change', 'translate', 'switch', 'format'],
  dentist: ['tooth', 'dental', 'medical', 'health', 'oral', 'care'],
  depth: ['deep', 'layer', 'dimension', '3d', 'distance', 'z-index'],
  divider: ['separator', 'line', 'split', 'partition', 'rule', 'hr'],
  donate: ['give', 'charity', 'contribute', 'gift', 'support', 'generous'],
  drafts: ['draft', 'document', 'edit', 'write', 'work in progress', 'note'],
  duffle: ['bag', 'travel', 'gym', 'carry', 'duffel', 'luggage'],
  duplicate: ['copy', 'clone', 'replicate', 'double', 'twin'],
  encryption: ['secure', 'protect', 'cipher', 'encoded', 'privacy', 'key'],
  express: ['fast', 'delivery', 'quick', 'rapid', 'shipping', 'speed'],
  fireworks: ['celebration', 'party', 'festive', 'sparkle', 'explosion', 'event'],
  floppy: ['disk', 'save', 'storage', 'retro', 'vintage', 'data'],
  fluid: ['liquid', 'water', 'flow', 'dynamic', 'smooth'],
  forums: ['discussion', 'community', 'board', 'conversation', 'thread'],
  foundation: ['base', 'makeup', 'cosmetics', 'beauty', 'bottom', 'framework'],
  glance: ['look', 'view', 'quick', 'overview', 'peek', 'glimpse'],
  gold: ['precious', 'metal', 'wealth', 'luxury', 'premium', 'yellow'],
  guest: ['visitor', 'user', 'person', 'anonymous', 'temporary', 'welcome'],
  handheld: ['portable', 'mobile', 'device', 'game', 'carry'],
  handwashing: ['hygiene', 'clean', 'wash', 'soap', 'health', 'sanitize'],
  highlights: ['featured', 'best', 'important', 'top', 'emphasis', 'key'],
  immersive: ['fullscreen', 'vr', 'experience', 'deep', 'engaging', 'reader'],
  inclination: ['slope', 'angle', 'tilt', 'lean', 'gradient', 'incline'],
  infinite: ['infinity', 'endless', 'loop', 'forever', 'unlimited'],
  journals: ['diary', 'notebook', 'log', 'writing', 'record', 'publication'],
  leaderboard: ['ranking', 'score', 'top', 'competition', 'chart', 'standings'],
  lottery: ['luck', 'chance', 'random', 'prize', 'draw', 'gamble'],
  makeups: ['cosmetics', 'beauty', 'face', 'lipstick', 'foundation'],
  mascara: ['makeup', 'cosmetics', 'beauty', 'eyelash', 'eye'],
  medkit: ['medical', 'first aid', 'health', 'emergency', 'kit', 'supplies'],
  midi: ['music', 'audio', 'instrument', 'digital', 'synthesizer', 'keyboard'],
  mine: ['excavate', 'dig', 'mineral', 'resource', 'bomb', 'extract'],
  modem: ['network', 'internet', 'connect', 'router', 'broadband', 'device'],
  moisture: ['water', 'humid', 'damp', 'wet', 'hydrate', 'skin'],
  ninja: ['stealth', 'warrior', 'martial arts', 'fast', 'shadow', 'hidden'],
  null: ['empty', 'none', 'void', 'zero', 'nothing', 'undefined'],
  options: ['settings', 'preferences', 'configure', 'menu', 'choices', 'more'],
  pair: ['two', 'match', 'couple', 'connect', 'link', 'bluetooth'],
  patch: ['fix', 'update', 'repair', 'modify', 'band-aid', 'sticker'],
  patient: ['medical', 'health', 'hospital', 'person', 'care', 'doctor'],
  pillar: ['column', 'support', 'structure', 'architecture', 'strength'],
  pipeline: ['process', 'flow', 'ci cd', 'workflow', 'deploy', 'automation'],
  pirate: ['skull', 'crossbones', 'ship', 'treasure', 'eye patch', 'flag'],
  pistol: ['gun', 'weapon', 'shoot', 'firearm', 'handgun'],
  poker: ['card', 'game', 'gamble', 'casino', 'play', 'chips'],
  potion: ['magic', 'bottle', 'brew', 'elixir', 'alchemy', 'witch'],
  predictions: ['forecast', 'estimate', 'analytics', 'future', 'trend'],
  presenter: ['speaker', 'present', 'talk', 'person', 'lecture', 'pitch'],
  prohibition: ['ban', 'forbidden', 'restrict', 'stop', 'not allowed'],
  purse: ['handbag', 'bag', 'wallet', 'money', 'carry', 'fashion'],
  quiz: ['question', 'test', 'exam', 'trivia', 'assessment', 'challenge'],
  reel: ['film', 'video', 'spool', 'tape', 'media', 'instagram'],
  reminder: ['alert', 'notification', 'remember', 'note', 'todo', 'alarm'],
  repository: ['repo', 'git', 'code', 'storage', 'project', 'source'],
  reserved: ['booked', 'saved', 'held', 'occupied', 'taken'],
  robber: ['thief', 'criminal', 'steal', 'mask', 'burglar', 'heist'],
  rollerskates: ['skating', 'sport', 'wheels', 'fun', 'ride', 'retro'],
  rook: ['chess', 'castle', 'game', 'piece', 'tower', 'strategy'],
  sanitize: ['clean', 'disinfect', 'hygiene', 'wash', 'sterilize'],
  scent: ['smell', 'fragrance', 'aroma', 'perfume', 'odor'],
  slot: ['machine', 'gamble', 'casino', 'insert', 'game', 'spin'],
  soap: ['clean', 'wash', 'hygiene', 'bubble', 'bath', 'hand'],
  soil: ['earth', 'dirt', 'ground', 'garden', 'plant', 'agriculture'],
  spark: ['light', 'flash', 'electric', 'ignite', 'bright', 'energy'],
  sparks: ['light', 'flash', 'electric', 'firework', 'bright', 'magic'],
  spectrum: ['color', 'rainbow', 'range', 'frequency', 'gradient', 'band'],
  sticky: ['note', 'adhesive', 'pin', 'attach', 'memo', 'post-it'],
  stickies: ['notes', 'adhesive', 'pin', 'memo', 'post-it', 'remind'],
  submarine: ['underwater', 'vessel', 'navy', 'deep', 'ocean', 'military'],
  suggestion: ['recommend', 'idea', 'hint', 'propose', 'feedback', 'tip'],
  symbols: ['icon', 'character', 'glyph', 'sign', 'mark', 'symbol'],
  teddy: ['bear', 'toy', 'stuffed', 'plush', 'child', 'cute'],
  teaching: ['education', 'learn', 'instruct', 'school', 'lesson', 'train'],
  thinking: ['thought', 'brain', 'mind', 'idea', 'cognitive', 'wonder'],
  threads: ['social', 'meta', 'discussion', 'post', 'conversation'],
  today: ['now', 'current', 'date', 'calendar', 'present', 'daily'],
  trace: ['follow', 'track', 'path', 'outline', 'debug', 'log'],
  valentines: ['love', 'heart', 'romance', 'february', 'couple', 'date'],
  valentine: ['love', 'heart', 'romance', 'february', 'couple', 'date'],
  vanish: ['disappear', 'hide', 'fade', 'remove', 'invisible', 'gone'],
  vegetables: ['food', 'produce', 'healthy', 'green', 'garden', 'nutrition'],
  vials: ['test tube', 'science', 'lab', 'sample', 'medical', 'chemistry'],
  waist: ['body', 'torso', 'middle', 'hip', 'belt'],
  watermark: ['overlay', 'copyright', 'brand', 'protect', 'stamp', 'image'],
  widgets: ['component', 'module', 'control', 'ui', 'element', 'gadget'],
  www: ['web', 'internet', 'website', 'url', 'domain', 'online'],
  yen: ['currency', 'money', 'japanese', 'finance', 'jpy', 'payment'],

  // ── Final batch — remaining common words ──
  agents: ['bot', 'ai', 'assistant', 'automation', 'helper', 'delegate'],
  albums: ['collection', 'gallery', 'photos', 'music', 'portfolio'],
  auto: ['automatic', 'self', 'smart', 'detect', 'machine'],
  autocorrect: ['spell', 'fix', 'text', 'auto', 'correct', 'grammar'],
  autosum: ['calculate', 'total', 'sum', 'formula', 'math', 'spreadsheet'],
  bedside: ['table', 'nightstand', 'bedroom', 'furniture', 'lamp'],
  bio: ['biography', 'profile', 'about', 'person', 'life', 'text'],
  block: ['prevent', 'restrict', 'stop', 'barrier', 'cube', 'deny'],
  blur: ['defocus', 'soft', 'effect', 'photo', 'gaussian', 'privacy'],
  bottom: ['below', 'lower', 'base', 'footer', 'end'],
  bowl: ['dish', 'food', 'container', 'soup', 'round', 'kitchen'],
  brilliance: ['bright', 'shine', 'glow', 'quality', 'photo', 'adjust'],
  character: ['letter', 'text', 'person', 'font', 'symbol', 'glyph'],
  chromecast: ['cast', 'stream', 'tv', 'google', 'mirror', 'display'],
  cigar: ['smoke', 'tobacco', 'lounge', 'cigarillo'],
  clippy: ['paperclip', 'assistant', 'help', 'microsoft', 'attach'],
  coat: ['jacket', 'clothing', 'outerwear', 'warm', 'wear'],
  connected: ['online', 'linked', 'network', 'active', 'paired'],
  consumable: ['supply', 'use', 'resource', 'material', 'expendable'],
  cooperative: ['teamwork', 'collaborate', 'together', 'mutual', 'joint'],
  crane: ['construction', 'lift', 'heavy', 'machinery', 'build'],
  customer: ['client', 'buyer', 'user', 'patron', 'consumer', 'shopper'],
  design: ['create', 'art', 'layout', 'visual', 'creative', 'plan'],
  desk: ['table', 'workspace', 'office', 'furniture', 'work'],
  device: ['hardware', 'gadget', 'machine', 'equipment', 'tool'],
  dew: ['moisture', 'water', 'drop', 'morning', 'weather', 'condensation'],
  diapers: ['baby', 'infant', 'child', 'nappy', 'care'],
  directions: ['navigate', 'route', 'way', 'map', 'guide', 'path'],
  diving: ['swim', 'underwater', 'scuba', 'water', 'sport', 'deep'],
  domain: ['website', 'url', 'web', 'internet', 'address', 'hostname'],
  dumbbell: ['weight', 'gym', 'exercise', 'fitness', 'strength', 'workout'],
  dumbbel: ['weight', 'gym', 'exercise', 'fitness', 'strength', 'workout'],
  dust: ['particle', 'clean', 'dirt', 'sweep', 'allergy', 'air'],
  electronics: ['circuit', 'device', 'hardware', 'component', 'tech'],
  elevation: ['height', 'altitude', 'rise', 'slope', 'terrain', 'level'],
  ellipse: ['oval', 'circle', 'shape', 'round', 'form', 'curve'],
  equal: ['same', 'match', 'balance', 'identical', 'math', 'equivalent'],
  estate: ['property', 'house', 'real estate', 'land', 'building', 'housing'],
  eyebrow: ['face', 'expression', 'beauty', 'grooming', 'cosmetic'],
  facial: ['face', 'skin', 'beauty', 'cosmetic', 'care', 'treatment'],
  faq: ['help', 'question', 'support', 'information', 'guide'],
  floor: ['ground', 'surface', 'tile', 'level', 'base'],
  footsteps: ['walk', 'step', 'track', 'path', 'print', 'follow'],
  formula: ['math', 'equation', 'calculate', 'science', 'expression'],
  fraction: ['math', 'number', 'divide', 'ratio', 'portion'],
  fps: ['framerate', 'video', 'speed', 'performance', 'animation', 'camera'],
  frequently: ['often', 'common', 'regular', 'recurring', 'popular'],
  games: ['play', 'gaming', 'entertainment', 'fun', 'controller'],
  gender: ['sex', 'identity', 'male', 'female', 'nonbinary', 'inclusive'],
  goblet: ['cup', 'chalice', 'drink', 'wine', 'glass', 'medieval'],
  hamburger: ['menu', 'burger', 'food', 'navigation', 'sandwich'],
  handle: ['grip', 'control', 'grab', 'hold', 'lever', 'knob'],
  hanger: ['clothes', 'closet', 'hang', 'wardrobe', 'hook', 'rack'],
  haptic: ['touch', 'feedback', 'vibration', 'tactile', 'feel'],
  harddisk: ['storage', 'drive', 'data', 'hdd', 'save', 'disk'],
  hd: ['high definition', 'quality', 'resolution', 'video', 'display'],
  hdr: ['photo', 'dynamic range', 'camera', 'quality', 'image'],
  headwear: ['hat', 'cap', 'helmet', 'head', 'accessory', 'clothing'],
  heeled: ['shoe', 'heel', 'fashion', 'women', 'footwear'],
  helmet: ['head', 'protection', 'safety', 'sport', 'construction'],
  holy: ['sacred', 'religious', 'divine', 'spiritual', 'blessed'],
  horn: ['sound', 'alarm', 'music', 'loud', 'instrument', 'honk'],
  hot: ['heat', 'fire', 'warm', 'popular', 'trending', 'temperature'],
  hypnotize: ['trance', 'spiral', 'mesmerize', 'mind', 'swirl'],
  ink: ['pen', 'write', 'draw', 'calligraphy', 'fluid', 'print'],
  iot: ['internet of things', 'smart', 'connected', 'device', 'sensor'],
  ip: ['address', 'network', 'internet', 'protocol', 'server'],
  island: ['land', 'tropical', 'beach', 'ocean', 'paradise'],
  kettle: ['boil', 'water', 'tea', 'hot', 'kitchen', 'appliance'],
  language: ['translate', 'speech', 'text', 'locale', 'i18n', 'global'],
  library: ['books', 'collection', 'reference', 'shelves', 'resource'],
  lifebelt: ['rescue', 'safety', 'swim', 'life saver', 'float', 'help'],
  lip: ['mouth', 'kiss', 'beauty', 'cosmetic', 'lipstick'],
  lipstick: ['makeup', 'cosmetics', 'beauty', 'lip', 'color'],
  live: ['broadcast', 'stream', 'real-time', 'on air', 'active'],
  local: ['nearby', 'location', 'area', 'regional', 'domestic'],
  login: ['sign in', 'access', 'authenticate', 'enter', 'account'],
  logout: ['sign out', 'exit', 'leave', 'session', 'disconnect'],
  lot: ['many', 'parking', 'batch', 'group', 'quantity'],
  lullaby: ['sleep', 'baby', 'music', 'night', 'calm', 'soothe'],
  luminous: ['bright', 'glow', 'light', 'shine', 'radiant'],
  magazine: ['publication', 'read', 'article', 'news', 'media'],
  male: ['man', 'boy', 'gender', 'masculine', 'person'],
  female: ['woman', 'girl', 'gender', 'feminine', 'person'],
  marker: ['highlight', 'pen', 'map', 'pin', 'point', 'annotate'],
  math: ['calculate', 'arithmetic', 'number', 'equation', 'formula'],
  meet: ['meeting', 'gather', 'conference', 'video call', 'join'],
  messages: ['chat', 'text', 'sms', 'conversation', 'communication'],
  mirror: ['reflect', 'flip', 'glass', 'reverse', 'symmetry'],
  mold: ['shape', 'form', 'cast', 'template', 'fungus'],
  more: ['menu', 'options', 'additional', 'expand', 'dots', 'overflow'],
  mouth: ['lips', 'speak', 'face', 'eat', 'talk', 'expression'],
  nail: ['manicure', 'beauty', 'fastener', 'hammer', 'finger'],
  noise: ['sound', 'static', 'audio', 'interference', 'unwanted'],
  number: ['digit', 'count', 'numeral', 'quantity', 'math'],
  pages: ['document', 'sheet', 'paper', 'multiple', 'collection'],
  panorama: ['wide', 'landscape', 'photo', 'view', 'scene', '360'],
  pass: ['ticket', 'entry', 'permit', 'allow', 'access', 'approve'],
  piano: ['music', 'instrument', 'keyboard', 'keys', 'play', 'melody'],
  pipe: ['tube', 'plumbing', 'flow', 'conduit', 'pipeline', 'channel'],
  plant: ['nature', 'green', 'grow', 'garden', 'leaf', 'botany'],
  point: ['dot', 'marker', 'location', 'position', 'sale', 'tip'],
  poll: ['vote', 'survey', 'election', 'chart', 'opinion', 'feedback'],
  post: ['publish', 'message', 'article', 'mail', 'social', 'send'],
  priority: ['important', 'urgent', 'rank', 'level', 'high', 'first'],
  propane: ['gas', 'fuel', 'tank', 'grill', 'energy', 'heating'],
  quality: ['standard', 'grade', 'level', 'excellence', 'rating'],
  queue: ['line', 'wait', 'order', 'sequence', 'fifo', 'list'],
  radar: ['detect', 'scan', 'signal', 'map', 'locate', 'track'],
  rating: ['rate', 'star', 'review', 'score', 'evaluate', 'rank'],
  ratio: ['proportion', 'aspect', 'fraction', 'comparison', 'scale'],
  reader: ['read', 'view', 'document', 'text', 'book', 'viewer'],
  reception: ['signal', 'bars', 'wireless', 'strength', 'cellular'],
  recording: ['record', 'capture', 'audio', 'video', 'media'],
  reflect: ['mirror', 'flip', 'reverse', 'symmetry', 'image'],
  registered: ['trademark', 'legal', 'brand', 'symbol', 'copyright'],
  reorder: ['rearrange', 'sort', 'organize', 'drag', 'move', 'sequence'],
  reports: ['document', 'analysis', 'summary', 'chart', 'data'],
  resistor: ['electronic', 'circuit', 'component', 'ohm', 'hardware'],
  rounded: ['round', 'corner', 'smooth', 'circular', 'soft'],
  rulers: ['measure', 'guide', 'line', 'dimension', 'tools'],
  sale: ['discount', 'deal', 'offer', 'price', 'shopping', 'promotion'],
  scatter: ['plot', 'chart', 'data', 'graph', 'points', 'distribute'],
  scissor: ['cut', 'trim', 'clip', 'snip', 'scissors', 'craft'],
  scratchpad: ['note', 'draft', 'write', 'memo', 'sketch', 'pad'],
  shake: ['vibrate', 'tremble', 'jolt', 'move', 'gesture'],
  shaver: ['razor', 'shave', 'grooming', 'electric', 'face'],
  shaving: ['razor', 'groom', 'face', 'trim', 'barber'],
  shift: ['move', 'keyboard', 'change', 'transition', 'uppercase'],
  shifts: ['schedule', 'work', 'roster', 'timetable', 'rotation'],
  sign: ['signage', 'marker', 'display', 'notice', 'symbol', 'indicator'],
  size: ['dimension', 'scale', 'measure', 'resize', 'large', 'small'],
  skates: ['skating', 'ice', 'roller', 'sport', 'wheels', 'blade'],
  sleep: ['rest', 'night', 'bed', 'zzz', 'moon', 'snooze', 'inactive'],
  slide: ['presentation', 'slideshow', 'swipe', 'carousel', 'move'],
  slips: ['fall', 'error', 'paper', 'receipt', 'slide'],
  slope: ['incline', 'hill', 'angle', 'gradient', 'mountain', 'terrain'],
  smog: ['pollution', 'haze', 'air', 'fog', 'weather', 'city'],
  smoking: ['cigarette', 'tobacco', 'smoke', 'no smoking', 'habit'],
  snooze: ['sleep', 'alarm', 'rest', 'delay', 'nap', 'dismiss'],
  sofa: ['couch', 'furniture', 'seat', 'living room', 'lounge', 'comfort'],
  spacebar: ['keyboard', 'key', 'space', 'type', 'input'],
  spades: ['card', 'suit', 'game', 'poker', 'play'],
  spinning: ['rotate', 'spin', 'turn', 'loading', 'top'],
  squeegee: ['clean', 'window', 'wipe', 'wash', 'tool'],
  state: ['status', 'condition', 'mode', 'phase', 'stage'],
  straight: ['line', 'direct', 'forward', 'flat', 'even'],
  stretching: ['exercise', 'flexible', 'fitness', 'yoga', 'warm up'],
  subtract: ['minus', 'remove', 'decrease', 'reduce', 'take away'],
  symmetry: ['mirror', 'balance', 'reflect', 'equal', 'proportion'],
  system: ['settings', 'operating', 'machine', 'computer', 'platform'],
  treadmill: ['exercise', 'gym', 'fitness', 'run', 'cardio', 'machine'],
  trunk: ['tree', 'car', 'storage', 'luggage', 'elephant', 'torso'],
  turnstile: ['gate', 'entry', 'access', 'security', 'barrier', 'rotate'],
  universal: ['global', 'all', 'inclusive', 'standard', 'access'],
  walkie: ['radio', 'talk', 'communication', 'portable', 'two-way'],
  talkie: ['radio', 'talk', 'communication', 'portable', 'voice'],
  weather: ['climate', 'forecast', 'outdoor', 'temperature', 'sky'],
  web: ['internet', 'website', 'online', 'browser', 'page'],
  webcam: ['camera', 'video', 'call', 'conference', 'stream'],
  weight: ['heavy', 'mass', 'measure', 'gym', 'scale', 'balance'],
  whistle: ['blow', 'sport', 'referee', 'sound', 'alert', 'signal'],
  whistling: ['blow', 'sound', 'music', 'tune', 'lips'],
  wingsuit: ['fly', 'extreme', 'sport', 'skydive', 'glide', 'adventure'],
  women: ['female', 'woman', 'lady', 'feminine', 'girl'],

  // ── Miscellaneous concepts ──
  agile: ['sprint', 'scrum', 'kanban', 'project', 'methodology'],
  analytics: ['data', 'statistics', 'metrics', 'insights', 'report', 'dashboard'],
  chart: ['graph', 'diagram', 'analytics', 'visualization', 'data', 'report'],
  graph: ['chart', 'diagram', 'data', 'visualization', 'plot', 'network'],
  pie: ['chart', 'graph', 'percentage', 'proportion', 'data'],
  diagram: ['chart', 'schematic', 'flowchart', 'visual', 'plan'],
  statistics: ['data', 'analytics', 'numbers', 'metrics', 'math'],
  trend: ['trending', 'popular', 'direction', 'growth', 'analytics'],
  trending: ['popular', 'rising', 'growth', 'hot', 'viral'],
  chart: ['graph', 'data', 'analytics', 'visualization', 'report'],
  area: ['region', 'zone', 'space', 'section', 'territory'],
  connection: ['link', 'network', 'join', 'bridge', 'bond'],
  cycle: ['loop', 'repeat', 'circle', 'recycle', 'lifecycle'],
  infinity: ['endless', 'loop', 'forever', 'unlimited', 'eternal'],
  magic: ['wand', 'sparkle', 'auto', 'enchant', 'wizard'],
  wand: ['magic', 'tool', 'auto', 'wizard', 'enchant'],
  education: ['learn', 'school', 'study', 'teach', 'academic', 'knowledge'],
  academic: ['education', 'school', 'university', 'study', 'graduation'],
  graduation: ['education', 'diploma', 'cap', 'ceremony', 'degree'],
  color: ['colour', 'palette', 'hue', 'tint', 'shade', 'design'],
  brightness: ['light', 'contrast', 'luminosity', 'intensity', 'adjust'],
  contrast: ['brightness', 'difference', 'compare', 'adjust', 'visual'],
  shadow: ['shade', 'dark', 'depth', 'elevation', 'effect'],
  opacity: ['transparency', 'alpha', 'fade', 'translucent', 'visibility'],
  crop: ['trim', 'cut', 'resize', 'frame', 'photo'],
  gallery: ['images', 'photos', 'collection', 'portfolio', 'album'],
  starburst: ['explosion', 'badge', 'highlight', 'new', 'sale', 'special'],
  ticket: ['pass', 'admission', 'event', 'coupon', 'entry'],
  receipt: ['invoice', 'bill', 'transaction', 'purchase', 'record'],
  qr: ['code', 'scan', 'barcode', 'link', 'mobile'],
  chart: ['graph', 'data', 'visualization', 'analytics', 'report'],
  presence: ['status', 'online', 'available', 'active', 'indicator'],
};

// ── Category Bonus Tags ────────────────────────────────────────────
// Extra tags applied based on the icon's assigned category

const CATEGORY_TAGS = {
  arrows: ['direction', 'navigate', 'move', 'indicator'],
  navigation: ['menu', 'route', 'browse', 'wayfinding'],
  datetime: ['time', 'date', 'schedule', 'calendar'],
  files: ['document', 'storage', 'save', 'organize'],
  communication: ['message', 'contact', 'talk', 'connect'],
  media: ['play', 'audio', 'video', 'content'],
  people: ['user', 'person', 'profile', 'social'],
  commerce: ['business', 'money', 'shop', 'transaction'],
  security: ['protect', 'lock', 'safe', 'privacy'],
  controls: ['settings', 'configure', 'adjust', 'manage'],
  infrastructure: ['system', 'network', 'server', 'technical'],
  actions: ['do', 'perform', 'execute', 'interact'],
  notifications: ['alert', 'notify', 'update', 'attention'],
  location: ['place', 'map', 'position', 'travel'],
  visual: ['design', 'image', 'graphic', 'display'],
  development: ['code', 'programming', 'build', 'technical'],
  weather: ['climate', 'forecast', 'outdoor', 'nature'],
  shapes: ['geometry', 'form', 'figure', 'symbol'],
  text: ['typography', 'font', 'write', 'content'],
  misc: [],
};

// ── Suffixes to strip for base name matching ───────────────────────
const STRIP_SUFFIXES = [
  '-fill', '-filled', '-outline', '-solid', '-sharp', '-regular', '-bold',
  '-line', '-thin', '-light', '-duotone',
  '-2', '-3', '-4', '-5',
  '-alt', '-new', '-old', '-copy',
  '-ltr', '-rtl',
  '-sm', '-md', '-lg', '-xl',
  '-mini', '-small', '-large',
];

function extractBaseName(iconId) {
  return iconId.split('/').pop();
}

function stripVariantSuffix(name) {
  let stripped = name;
  // Strip known suffixes
  for (const suffix of STRIP_SUFFIXES) {
    if (stripped.endsWith(suffix) && stripped.length > suffix.length) {
      stripped = stripped.slice(0, -suffix.length);
    }
  }
  // Strip trailing numbers (e.g., backpack2 → backpack, basket3 → basket)
  const numMatch = stripped.match(/^(.+?)\d+$/);
  if (numMatch && numMatch[1].length >= 3) {
    stripped = numMatch[1];
  }
  return stripped;
}

function splitName(name) {
  // Split on hyphens, filter out pure numbers and very short noise
  return name.split(/[-_]/).filter(w => w.length > 0);
}

function generateTags(name, category) {
  const tags = new Set();
  const stripped = stripVariantSuffix(name);
  const words = splitName(stripped);

  // 1. Word-level synonym expansion
  for (const word of words) {
    const lower = word.toLowerCase();
    if (WORD_TAGS[lower]) {
      for (const tag of WORD_TAGS[lower]) {
        tags.add(tag);
      }
    }
  }

  // 2. Try the full stripped name as a lookup too (for compound words)
  if (WORD_TAGS[stripped]) {
    for (const tag of WORD_TAGS[stripped]) {
      tags.add(tag);
    }
  }

  // 3. Category bonus tags (only add a few, avoid noise)
  if (CATEGORY_TAGS[category]) {
    for (const tag of CATEGORY_TAGS[category]) {
      tags.add(tag);
    }
  }

  // 4. Remove tags that are already part of the icon name (redundant)
  const nameWords = new Set(words.map(w => w.toLowerCase()));
  for (const tag of tags) {
    if (nameWords.has(tag)) {
      tags.delete(tag);
    }
  }

  return [...tags].sort();
}

// ── Main ────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const showStats = args.includes('--stats');

  // 1. Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found. Run process-icons.js first.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Loaded manifest: ${manifest.icons.length} icons`);

  // 2. Load existing icon-tags.json (from cross-reference step)
  let tagDict = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    tagDict = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`Loaded existing icon-tags.json: ${Object.keys(tagDict).length} entries`);
  }

  // 3. Cross-reference from already-tagged icons in manifest
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

  let crossRefCount = 0;
  for (const [name, tagSet] of Object.entries(fromManifest)) {
    if (!tagDict[name]) {
      tagDict[name] = [...tagSet];
      crossRefCount++;
    }
  }
  console.log(`Cross-referenced ${crossRefCount} names from manifest`);

  // 4. Also cross-reference stripped variants
  // e.g., if "arrow-left" has tags, "arrow-left-fill" should get them too
  let variantCount = 0;
  const allBaseNames = new Set();
  const nameCategories = {};
  for (const icon of manifest.icons) {
    const baseName = extractBaseName(icon.id);
    allBaseNames.add(baseName);
    if (!nameCategories[baseName] || nameCategories[baseName] === 'misc') {
      nameCategories[baseName] = icon.category;
    }
  }

  for (const name of allBaseNames) {
    if (tagDict[name]) continue;
    const stripped = stripVariantSuffix(name);
    if (stripped !== name && tagDict[stripped]) {
      tagDict[name] = [...tagDict[stripped]];
      variantCount++;
    }
  }
  console.log(`Variant-matched ${variantCount} additional names`);

  // 5. Generate tags for remaining untagged names
  const needTags = [...allBaseNames].filter(name => !tagDict[name]).sort();
  console.log(`\nGenerating tags for ${needTags.length} remaining names...`);

  let generated = 0;
  let emptyCount = 0;
  for (const name of needTags) {
    const category = nameCategories[name] || 'misc';
    const tags = generateTags(name, category);
    if (tags.length > 0) {
      tagDict[name] = tags;
      generated++;
    } else {
      emptyCount++;
    }
  }

  console.log(`Generated tags for ${generated} names`);
  console.log(`No tags generated for ${emptyCount} names (likely pure numbers/codes)`);
  console.log(`Total entries in tag dictionary: ${Object.keys(tagDict).length}`);

  if (showStats) {
    // Show coverage stats
    let covered = 0;
    let uncovered = 0;
    const uncoveredList = [];
    for (const name of allBaseNames) {
      if (tagDict[name] && tagDict[name].length > 0) {
        covered++;
      } else {
        uncovered++;
        uncoveredList.push(name);
      }
    }
    console.log(`\nCoverage: ${covered}/${allBaseNames.size} base names (${(covered/allBaseNames.size*100).toFixed(1)}%)`);
    if (uncoveredList.length > 0 && uncoveredList.length <= 100) {
      console.log('Uncovered names:');
      for (const name of uncoveredList.sort()) {
        console.log(`  ${name}`);
      }
    } else if (uncoveredList.length > 100) {
      console.log(`First 100 uncovered names:`);
      for (const name of uncoveredList.sort().slice(0, 100)) {
        console.log(`  ${name}`);
      }
    }
    return;
  }

  if (dryRun) {
    console.log('\nDry run — sample output:');
    const samples = needTags.filter(n => tagDict[n] && tagDict[n].length > 0).slice(0, 20);
    for (const name of samples) {
      console.log(`  ${name}: ${tagDict[name].join(', ')}`);
    }
    return;
  }

  // 6. Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tagDict, null, 2));
  console.log(`\nSaved to ${OUTPUT_PATH}`);
}

main();
