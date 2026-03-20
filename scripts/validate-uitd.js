#!/usr/bin/env node
import process from 'node:process';

import { runCli } from '../packages/uitdl-validator/scripts/validate-uitd.js';

runCli().then( ( { exitCode } ) => {
    process.exitCode = exitCode;
} ).catch( error => {
    process.stderr.write( `${error.message}\n` );
    process.exit( 1 );
} );
