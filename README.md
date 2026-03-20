# UITD Editor

This workspace contains the UITD editor app and a publishable UITDL validator package.

The shared parser/validator now lives in `packages/uitdl-validator`, and the editor consumes that shared module instead of being the source package for third-party validation.

## CLI validator

Validate one or more `.uitd` files with the same parser and validation rules used by the app:

```bash
npm run validate:uitd -- flow.uitd
npm run validate:uitd -- flow-a.uitd flow-b.uitd --json
cat flow.uitd | npm run validate:uitd --
```

The command exits with code `1` when it finds error-level validation issues.
Relative file paths are resolved against the current project root when possible, so local `npx uitd-validate .\file.uitd` continues to work even if `npx` falls back to a broken Windows working directory.

## Published package

The package intended for npm publication is `packages/uitdl-validator`.

Ad hoc validation from any machine:

```bash
npx uitdl-validator@latest path/to/flow.uitd
```

Project dependency:

```bash
npm install --save-dev uitdl-validator
npx uitd-validate path/to/flow.uitd
```

Programmatic usage:

```js
import { parseUITDL } from 'uitdl-validator';

const result = parseUITDL( uitdText );
console.log( result.errors );
```

## Release checks

Run the validator package smoke tests before publishing:

```bash
npm run validate:uitd:release-check
```
