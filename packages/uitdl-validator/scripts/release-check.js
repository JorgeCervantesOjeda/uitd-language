#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runCli } from './validate-uitd.js';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const packageDir = path.resolve( __dirname, '..' );
const fixturesDir = path.resolve( packageDir, 'fixtures' );

const createBuffer = () => {
    let value = '';

    return {
        stream: {
            write: ( chunk ) => {
                value += chunk;
            }
        },
        read: () => value
    };
};

const main = () => {
    const validFixture = path.resolve( fixturesDir, 'valid-smoke.uitd' );
    const invalidFixture = path.resolve( fixturesDir, 'invalid-smoke.uitd' );
    const singleInclusionFixture = path.resolve( fixturesDir, 'single-inclusion-non-reusable.uitd' );

    return Promise.resolve().then( async() => {
        const validStdout = createBuffer();
        const validStderr = createBuffer();
        const validResult = await runCli( {
            args: [ validFixture ],
            stdout: validStdout.stream,
            stderr: validStderr.stream,
        } );

        if( validResult.exitCode !== 0 || !validStdout.read().includes( 'no validation issues.' ) ) {
            throw new Error( `CLI valid smoke test failed.\n${validStdout.read()}\n${validStderr.read()}` );
        }

        const invalidStdout = createBuffer();
        const invalidStderr = createBuffer();
        const invalidResult = await runCli( {
            args: [ invalidFixture ],
            stdout: invalidStdout.stream,
            stderr: invalidStderr.stream,
        } );

        if( invalidResult.exitCode !== 1 || !invalidStdout.read().includes( 'ERROR' ) ) {
            throw new Error( `CLI invalid smoke test failed.\n${invalidStdout.read()}\n${invalidStderr.read()}` );
        }

        const jsonStdout = createBuffer();
        const jsonStderr = createBuffer();
        const jsonResult = await runCli( {
            args: [ validFixture, '--json' ],
            stdout: jsonStdout.stream,
            stderr: jsonStderr.stream,
        } );
        const parsed = JSON.parse( jsonStdout.read() );

        if( jsonResult.exitCode !== 0 ||
            !Array.isArray( parsed ) ||
            parsed.length !== 1 ||
            parsed[ 0 ].hasErrors !== false ) {
            throw new Error( `CLI JSON smoke test returned an unexpected payload.\n${jsonStdout.read()}\n${jsonStderr.read()}` );
        }

        const singleInclusionStdout = createBuffer();
        const singleInclusionStderr = createBuffer();
        const singleInclusionResult = await runCli( {
            args: [ singleInclusionFixture, '--json' ],
            stdout: singleInclusionStdout.stream,
            stderr: singleInclusionStderr.stream,
        } );
        const singleInclusionParsed = JSON.parse( singleInclusionStdout.read() );
        const singleInclusionMarkers = singleInclusionParsed[ 0 ]?.markers || [];
        const hasReusableFragmentError = singleInclusionMarkers.some( marker =>
            marker.code === 'missing-reusable-fragment' ||
            marker.code === 'missing-reusable-standalone-draw'
        );

        if( singleInclusionResult.exitCode !== 0 ||
            !Array.isArray( singleInclusionParsed ) ||
            singleInclusionParsed.length !== 1 ||
            singleInclusionParsed[ 0 ].hasErrors !== false ||
            hasReusableFragmentError ) {
            throw new Error( `Single inclusion smoke test returned an unexpected payload.\n${singleInclusionStdout.read()}\n${singleInclusionStderr.read()}` );
        }

        process.stdout.write( 'Validator release checks passed.\n' );
    } );
};

main().catch( error => {
    process.stderr.write( `${error.message}\n` );
    process.exit( 1 );
} );
