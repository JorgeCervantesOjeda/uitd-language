#!/usr/bin/env node
// scripts/render-uitd-elk.mjs
// CLI helper that renders a UITD source file to D2 and SVG with the ELK layout.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { D2 } from '@terrastruct/d2';
import { parseUITDL } from '../src/index.js';
import { translateToD2 } from '../src/utils/d2Translation.js';

const repoRoot = process.cwd();
const sourcePath = process.argv[ 2 ] ? path.resolve( process.argv[ 2 ] ) : path.join( repoRoot, 'cumple.uitd' );
const outD2Path = process.argv[ 3 ] ? path.resolve( process.argv[ 3 ] ) : path.join( repoRoot, 'cumple.elk.d2' );
const outSvgPath = process.argv[ 4 ] ? path.resolve( process.argv[ 4 ] ) : path.join( repoRoot, 'cumple.elk.svg' );

const source = await readFile( sourcePath, 'utf8' );
const parsed = parseUITDL( source );

if( parsed.errors?.some( error => Number( error.severity ) >= 8 ) ) {
    const errors = parsed.errors
        .filter( error => Number( error.severity ) >= 8 )
        .map( error => `${error.message} (${error.startLineNumber}:${error.startColumn})` )
        .join( '\n' );
    throw new Error( `No se puede renderizar porque hay errores de validación:\n${errors}` );
}

const d2Source = translateToD2( parsed );
await writeFile( outD2Path, d2Source, 'utf8' );

const d2 = new D2();
const { diagram, renderOptions } = await d2.compile( d2Source, { layout: 'elk' } );
const svg = await d2.render( diagram, renderOptions );

await writeFile( outSvgPath, svg, 'utf8' );

console.log( `Generado: ${outD2Path}` );
console.log( `Generado: ${outSvgPath}` );
process.exit( 0 );
