# UITD Editor

This workspace contains the UITD editor app and the shared UITD parser/validator used by both the app and the command line.

## CLI validator

Validate one or more `.uitd` files with the same parser and validation rules used by the app:

```bash
npm run validate:uitd -- flow.uitd
npm run validate:uitd -- flow-a.uitd flow-b.uitd --json
cat flow.uitd | npm run validate:uitd --
```

The command exits with code `1` when it finds error-level validation issues.
Relative file paths are resolved against the current project root when possible, so local `npx uitd-validate .\file.uitd` continues to work even if `npx` falls back to a broken Windows working directory.

## Use from another project

Install this workspace as a local dependency or link it, then use the exported CLI and API from the other project.

Local dependency:

```bash
npm install --save-dev ../uitd-editor
npx uitd-validate path/to/flow.uitd
```

Linked development setup:

```bash
# In this repo
npm link

# In the other project
npm link uitd-editor
uitd-validate path/to/flow.uitd
```

Programmatic usage:

```js
import { parseUITDL } from 'uitd-editor';

const result = parseUITDL( uitdText );
console.log( result.errors );
```
