#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { parseUITDL } from '../src/index.js';

const ERROR_SEVERITY = 8;

const readStdin = async() => {
    const chunks = [];

    for await( const chunk of process.stdin ) {
        chunks.push( chunk );
    }

    return chunks.join( '' );
};

const normalizeArgs = ( args ) => {
    const json = args.includes( '--json' );
    const files = args.filter( arg => arg !== '--json' );

    return { json, files };
};

const getCandidateBaseDirs = () => {
    const npmPackageJson = process.env.npm_package_json ?
        path.dirname( process.env.npm_package_json ) :
        null;

    return [
        process.cwd(),
        process.env.INIT_CWD || null,
        process.env.npm_config_local_prefix || null,
        npmPackageJson,
        process.env.PWD || null,
    ].filter( ( value, index, values ) => value && values.indexOf( value ) === index );
};

const resolveInputFile = ( inputPath ) => {
    if( path.isAbsolute( inputPath ) ) {
        return inputPath;
    }

    const candidates = getCandidateBaseDirs()
        .map( baseDir => path.resolve( baseDir, inputPath ) );
    const resolved = candidates.find( candidate => existsSync( candidate ) );

    if( resolved ) {
        return resolved;
    }

    const attemptedPaths = candidates.join( ', ' );
    throw new Error( `Unable to resolve "${inputPath}". Tried: ${attemptedPaths}` );
};

const sortMarkers = ( markers ) =>
    [ ...markers ].sort( ( left, right ) => {
        if( left.startLineNumber !== right.startLineNumber ) {
            return left.startLineNumber - right.startLineNumber;
        }
        return ( left.startColumn || 0 ) - ( right.startColumn || 0 );
    } );

const formatSeverity = ( severity ) =>
    severity >= ERROR_SEVERITY ? 'ERROR' : 'WARNING';

const toCliLines = ( label, markers ) =>
    sortMarkers( markers ).map( marker => {
        const line = marker.startLineNumber ?? 0;
        const column = marker.startColumn ?? 0;

        return `${formatSeverity( marker.severity )} ${label}:${line}:${column} ${marker.message}`;
    } );

const validateSource = ( label, source ) => {
    const parsed = parseUITDL( source );
    const markers = sortMarkers( parsed.errors );
    const hasErrors = markers.some( marker => marker.severity >= ERROR_SEVERITY );

    return {
        file: label,
        markers,
        hasErrors,
        parsedName: parsed.name,
    };
};

const printTextResults = ( results ) => {
    results.forEach( result => {
        if( result.markers.length === 0 ) {
            console.log( `${result.file}: no validation issues.` );
            return;
        }

        toCliLines( result.file, result.markers ).forEach( line => {
            console.log( line );
        } );
    } );
};

const main = async() => {
    const { json, files } = normalizeArgs( process.argv.slice( 2 ) );
    const results = [];

    if( files.length === 0 ) {
        if( process.stdin.isTTY ) {
            console.error( 'Usage: npm run validate:uitd -- <file.uitd> [more files] [--json]' );
            console.error( '   or: <command producing UITDL> | npm run validate:uitd -- [--json]' );
            process.exit( 1 );
        }

        const source = await readStdin();
        results.push( validateSource( '<stdin>', source ) );
    } else {
        for( const file of files ) {
            const resolvedFile = resolveInputFile( file );
            const source = await readFile( resolvedFile, 'utf8' );
            results.push( validateSource( file, source ) );
        }
    }

    if( json ) {
        console.log( JSON.stringify( results, null, 2 ) );
    } else {
        printTextResults( results );
    }

    process.exitCode = results.some( result => result.hasErrors ) ? 1 : 0;
};

main().catch( error => {
    console.error( error.message );
    process.exit( 1 );
} );
