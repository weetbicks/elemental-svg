# Elemental SVG Editor

## Project Structure
- `elemental_svg.html` — Single-file SVG editor for FileMaker (runs in web viewer and on website)
- Git repo: `weetbicks/elemental-svg` on GitHub

## Related (outside this repo)
- Cloudflare Worker: `/Users/daniel/Developer/cloudflare-worker/worker.js`
  - Deployed as `elemental-svg-proxy` at `https://elemental-svg-proxy.g7hjmj8t8f.workers.dev`
  - Endpoints: `/report`, `/usage` (POST) — proxies to OttoFMS, hides API keys
  - KV namespace `RATE_LIMITER` stores rate limit data

## Version Check
- The editor checks for updates directly via the GitHub releases API:
  `https://api.github.com/repos/weetbicks/elemental-svg/releases/latest`
- Compares `tag_name` against `EDITOR_VERSION` constant
- Downloads `elemental_svg.html` release asset via `assets[].browser_download_url`
- In FileMaker mode: shows "Click to update" link that calls FM script
- In browser mode: shows version + release notes only (no update link)

## Version Release Process

When the user says "publish next version" or similar:

1. **Read current version** from `EDITOR_VERSION` constant in `elemental_svg.html`
2. **Ask the user** for:
   - New version number (suggest next patch/minor based on current)
   - Release notes (brief description of changes)
3. **Bump `EDITOR_VERSION`** in `elemental_svg.html`
4. **Commit**: `git add elemental_svg.html && git commit -m "Bump version to vX.Y.Z\n\n<release notes>"`
5. **Tag**: `git tag -a vX.Y.Z -m "vX.Y.Z — <short description>"`
6. **Push**: `git push origin main && git push origin vX.Y.Z`
7. **GitHub Release**: `gh release create vX.Y.Z --title "vX.Y.Z — <title>" --notes "<notes>"`
8. **Upload release asset**: `gh release upload vX.Y.Z elemental_svg.html --repo weetbicks/elemental-svg`
   This is what existing editors download when updating.
9. **Verify**: `gh api repos/weetbicks/elemental-svg/releases/latest --jq '.tag_name, .assets[].name'`
