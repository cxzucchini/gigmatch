# Gigmatch Project Rules

## Stack & Structure
- Frontend: Expo / React Native (`mobile/src/app/...`, Metro port `8081`)
- Backend: Express + MongoDB Atlas (`server/server.js`, port `5000`, URI in `server/.env`)

## Environment & Shell (Windows + Git Bash)
- Terminal runs in Git Bash (MSYS). Use POSIX shell syntax (`&&`, `rm -rf`, single quotes) and forward-slash paths (`C:/Users/Jay/...`).
- Use `$TMPDIR` (never bare `/tmp`) for scratch files.
- Never run `npx expo start` (blocks the shell). To verify frontend builds, run:
  `npx expo export --platform web --output-dir .expo-check && rm -rf .expo-check`
- Do not start a second `node server.js` if port `5000` is already active.

## Editing & Security Rules
- Always read the target lines of a file before editing it, and verify all JSX tags (`<View>`, `<TextInput />`, `<HoverPressable>`) are properly balanced after edits.
- Never print secrets, tokens, or connection strings; use `[REDACTED]`.
- Note: Your output sanitizer scrubs `Bearer` into `***` when reading `api.js`. `api.js` is working properly—never flag or modify `api.js` for `***` in `Authorization` headers.
- Always include at least 5–8 lines of unique surrounding context when using the `patch` tool, and ALWAYS re-read the edited region with `read_file` before making a second patch to the same file.
- Never apply more than one `patch` call to the same file in a single turn.
- If a file gets corrupted after a patch, restore it via `git checkout -- <file>` before retrying instead of patching over broken syntax.
## UI & Design System Rules (Strict Consistency)
- **Theme Tokens (`mobile/src/styles/theme.js`):** Always import and use `theme` colors (`theme.background`, `theme.accent`, `theme.accentDark`, `theme.muted`, `theme.text`, `theme.border`). Never introduce arbitrary bright blues, neon greens, or default Material/iOS colors.
- **Typography & Editorial Hierarchy:** Match existing screens (`profile.js`, `artist/[id].js`):
  - Uppercase tracked kickers (`fontSize: 10, fontWeight: '700', letterSpacing: 2, color: theme.muted`)
  - Serif display headings (`fontFamily: 'Georgia'`, `color: theme.accent`)
  - Clean readable body/labels (`fontSize: 12–13`)
- **Surfaces, Borders & Buttons:**
  - Use flat/crisp editorial borders (`borderWidth: 1, borderColor: theme.border`) with warm off-white/cream inputs (`#FBF9F6`), warm sand tags (`#EAE1D7`), sage green positive states (`#E8EFE4` / `#C4D1BD`), and terracotta alert/warning states (`#F2E5E1` / `#D7B5AC`).
  - Use existing shared components (`HoverPressable`, `AppAlert`, `AppHeader`, `AppFooter`) instead of raw `TouchableOpacity` or native `Alert.alert`.
  - Match button styles (`primaryButton` with `theme.accentDark` and white bold text; `secondaryButton` with `1px` `theme.accent` border).