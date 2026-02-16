# Elemental SVG Editor

A single-file SVG editor built for [FileMaker](https://www.claris.com/filemaker/) developers. Load, edit, and export SVG icons — directly inside a FileMaker Web Viewer or in any browser.

**Try it online:** [elemental-svg.com](https://elemental-svg.com)

## What it does

- **Load SVGs** via file picker, drag & drop, clipboard paste, or the FileMaker JavaScript API
- **Edit** fill/stroke colors, rotation, flip, scale, offset, opacity, and background shapes
- **Stroke to Fill conversion** — converts stroke-based icons (Lucide, Feather, Tabler, etc.) into filled paths so they render correctly as FileMaker button icons
- **Export** as SVG or PNG, download to disk, copy to clipboard, or send back to FileMaker
- **FileMaker integration** — auto-detects the FM environment, supports dynamic fill colors, FM compatibility class, and one-click version updates

## Quick start

### Browser

Open `elemental_svg.html` in any browser, or visit [elemental-svg.com](https://elemental-svg.com).

### FileMaker

1. Add a Web Viewer to your layout
2. Set the web address to the `elemental_svg.html` file
3. Call `initEditor()` via *Perform JavaScript in Web Viewer* to configure output mode, theme, and format
4. Load SVGs with `loadSVG(base64)` or `loadSVGItems(jsonArray)`
5. The editor calls `FileMaker.PerformScript('Save Icons', data)` when the user saves

## Key features

| Feature | Description |
|---|---|
| Stroke to Fill | Bitmap tracing via Potrace — converts stroked outlines to filled vector paths |
| FM Compatibility | Adds `fm_fill` class for FileMaker dynamic color styling |
| Dynamic Fill | Removes hardcoded fills so FileMaker controls icon colors at runtime |
| Background Shapes | Circle, triangle, square, pentagon, hexagon with adjustable corner radius and padding |
| Undo/Redo | 50-state history, `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` |
| Dark/Light Theme | Switchable theme with six accent color options |
| Auto Version Check | Checks GitHub releases for updates; one-click update in FileMaker |

## Documentation

- [Feature Reference](https://www.elemental-svg.com/features) — full list of editor capabilities
- [User Guide](https://www.elemental-svg.com/guide) — step-by-step usage instructions

## License

This project is open source. See the repository for details.
