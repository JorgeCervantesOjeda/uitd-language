# uitdl-validator

Published UITDL parser and validator package for CLI and programmatic use.

## CLI

Run the published package without installing it globally:

```bash
npx uitdl-validator@latest path/to/flow.uitd
npx uitdl-validator@latest path/to/flow-a.uitd path/to/flow-b.uitd --json
```

If the package is installed in a project, use the exposed CLI name directly:

```bash
npx uitd-validate path/to/flow.uitd
```

The command exits with code `1` when it finds error-level validation issues.
Relative file paths are resolved against the current project root when possible.

## Install

```bash
npm install --save-dev uitdl-validator
```

## API

```js
import { parseUITDL, validateData } from 'uitdl-validator';

const parsed = parseUITDL( uitdText );
const markers = validateData( parsed );
console.log( markers );
```

## Release Check

From this package directory:

```bash
npm run pack:dry-run
npm run release:check
```
