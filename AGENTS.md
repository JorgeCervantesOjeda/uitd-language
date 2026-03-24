# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React source. Key entry points are `src/main.jsx` and `src/App.jsx`. Components live in `src/components/`, shared helpers in `src/utils/`, and static assets in `src/assets/`.
- `packages/uitdl-validator/` contains the shared UITDL parser/validator package and CLI that the editor consumes locally and that other projects may consume via npm.
- `public/` contains static files copied as-is to the build output.
- Build outputs go to `dist/` (Vite default). There is also a `build/` directory in the repo; treat it as generated output unless a task says otherwise.
- Sample UITD files (for demos or fixtures) live at the repo root, e.g. `*.uitd`.

## Build, Test, and Development Commands
Use npm scripts from `package.json`:
- `npm run dev`: start the Vite dev server with HMR.
- `npm run build`: produce a production build in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint on `*.js`/`*.jsx` files.
- `npm run d2 -- <input.d2> <output.svg>`: compile a D2 diagram using the globally installed `d2` CLI or the Windows fallback path resolver in `scripts/run-d2.js`.
- `npm run d2:elk -- <input.d2> <output.svg>`: compile with the ELK layout engine.
- `npm run d2:dagre -- <input.d2> <output.svg>`: compile with the Dagre layout engine.
- `d2` can be installed globally on this Windows machine and used directly from the CLI; the current setup has been verified with the official installer path `C:\Program Files\D2\d2.exe`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces in JS/JSX and CSS (match existing files).
- Use ES modules (`import`/`export`) and functional React components.
- ESLint is configured in `eslint.config.js` with spacing rules (e.g., spaces inside parens/brackets and multiline function call arguments). Run `npm run lint` before submitting.
- Whenever you modify a file, leave that file lint-clean before finishing the task. If the repo has unrelated lint errors elsewhere, do not expand scope; clean the files you touched.
- Naming: React components in `PascalCase` (e.g., `GraphPanel.jsx`), helpers in `camelCase` (e.g., `parseUItD.js`).

## Testing Guidelines
- No dedicated test framework is configured in this repo. If you add tests, document the tool and add a script to `package.json`.
- For now, validate changes by running `npm run lint` and exercising the UI via `npm run dev`.
- Use `npm run lint` when practical to understand repo-wide status, but at minimum run `npx eslint <file1> <file2> ...` on each touched file and fix all lint errors in those files before submitting.
- If you modify the validator package in `packages/uitdl-validator/`, also run its release checks before finishing. If those validator changes are intended for other projects that consume the published npm package, prepare and publish a new package version so external consumers can use the updated validator.

## Commit & Pull Request Guidelines
- Git history is not available in this folder, so there are no observed commit message conventions. If this repo is initialized later, follow conventional commits (`feat:`, `fix:`, `chore:`) unless a maintainer specifies otherwise.
- PRs should include: a short description, steps to verify, and screenshots or recordings for UI changes. Link related issues when applicable.

## Security & Configuration Tips
- Firebase config appears in `firebase.json` and `.firebaserc`. Do not commit secrets; keep environment-specific values out of source control.
- The repo includes `node_modules/` in the workspace; avoid editing it directly.
