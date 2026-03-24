#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function canRunFromPath() {
  const result = spawnSync( 'd2', [ 'version' ], { stdio: 'ignore' } );
  return !result.error;
}

function resolveWindowsInstall() {
  const roots = [
    process.env.ProgramFiles,
    process.env.ProgramW6432,
    process.env[ 'ProgramFiles(x86)' ],
  ].filter( Boolean );

  for ( const root of roots ) {
    const candidate = path.join( root, 'D2', 'd2.exe' );
    if ( existsSync( candidate ) ) {
      return candidate;
    }
  }

  return null;
}

function resolveD2Binary() {
  if ( process.env.D2_BIN && existsSync( process.env.D2_BIN ) ) {
    return process.env.D2_BIN;
  }

  if ( canRunFromPath() ) {
    return 'd2';
  }

  if ( process.platform === 'win32' ) {
    return resolveWindowsInstall();
  }

  return null;
}

const d2Binary = resolveD2Binary();

if ( !d2Binary ) {
  process.stderr.write(
    'No se encontró D2. Instálalo globalmente o define D2_BIN con la ruta al ejecutable.\n'
  );
  process.exit( 1 );
}

const result = spawnSync( d2Binary, process.argv.slice( 2 ), { stdio: 'inherit' } );

if ( result.error ) {
  process.stderr.write( `${result.error.message}\n` );
  process.exit( 1 );
}

process.exit( result.status ?? 0 );
