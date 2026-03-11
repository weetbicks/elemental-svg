# Elemental SVG — Feature Ideas

## Icon Browser

### Recently Used
- Track last 20-30 icons picked, show as quick-access section at top
- Ephemeral/session-only is fine — this is a convenience feature
- localStorage works for web; FM web viewer won't persist across sessions but still useful within a session

### Favorites / Collections
- Let users star icons to build a personal collection
- **Storage problem**: localStorage is wiped by clearing site data, and FM web viewers don't persist localStorage between sessions
- **Best approach for FM**: store favorites as JSON in a FileMaker field/global. Editor calls `FileMaker.PerformScript()` to persist on star/unstar, FM passes favorites list back via `initEditor()` on load
- **For web users**: could use worker + KV with an anonymous ID, or just accept localStorage is "good enough" for casual web use
- Could also support named collections (e.g., "CRM Icons", "Invoice Icons")

### Similar Icons
- When selecting an icon, show similar icons from other libraries based on matching tags
- Helps users compare the same concept across styles (e.g., Lucide's shopping cart vs Heroicons' vs Bootstrap's)
- Implementation: find icons sharing 3+ tags with the selected icon, rank by overlap count

### Fuzzy Search
- Currently substring matching — "calender" won't find "calendar"
- Simple Levenshtein distance or trigram matching would make search more forgiving
- Could also support multi-word search (e.g., "shopping bag" matches icons with both "shopping" AND "bag" in name/tags)

### Multi-Select & Batch Export
- Pick several icons and batch-export them all at once with the same settings
- Useful when building a consistent icon set for a FileMaker solution
- Export as individual files or a ZIP

## Editor

### Icon Composition
- Overlay two icons to create custom combinations (e.g., cloud + arrow = cloud-upload)
- Useful for custom combinations that don't exist in any library
- Position, scale, and layer control for each icon

### Saved Style Presets (User-Facing)
- Save named presets ("My App Dark", "My App Light") with fill, stroke, background, padding etc.
- Apply with one click to any icon
- Goes beyond initEditor() config — this is in-editor UI
- Same persistence question as favorites (FM field vs localStorage)

### SVG Sprite Export
- Export multiple selected icons as a single SVG sprite sheet
- Useful for web use outside FileMaker
- Each icon as a `<symbol>` with an ID

## Library / Data

### Icon Popularity
- Anonymously track which icons get picked most (via worker endpoint)
- Surface "Popular" as a sort/filter option in the browser
- Helps new users find commonly used icons
- Privacy-friendly: just increment a counter per icon ID, no user tracking

### Custom Icon Uploads
- Let users add their own SVGs to the browser alongside built-in libraries
- Persisted via FM field (in FM mode) or IndexedDB (web mode)
- Their company/brand icons appear in a "My Icons" library tab
