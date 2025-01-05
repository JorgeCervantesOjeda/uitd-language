import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import { createRequire } from "module";

const require = createRequire( import.meta.url );
const traverse = require( "@babel/traverse" ).default;

const SRC_DIR = path.resolve( "./src" );

// Function to normalize file paths consistently
function normalizePath( filePath ) {
    return path.relative( SRC_DIR, filePath ).replace( /\\/g, "/" );
}

// Function to generate unique node names
function normalizeNodeName( input ) {
    return input.replace( /[^a-zA-Z0-9_]/g, "_" ).toLowerCase();
}

// Function to count lines in a file
function getLineCount( filePath ) {
    filePath = SRC_DIR + '\\' + filePath;
    try {
        const content = fs.readFileSync( filePath, "utf-8" );
        return content.split( "\n" ).length;
    } catch( error ) {
        console.warn( `Failed to read file: ${filePath}` );
        return null;
    }
}

// Function to format node labels
function formatNodeLabel( filePath ) {
    const normalizedPath = normalizePath( filePath );
    const lineCount = getLineCount( filePath );
    const lineCountLabel = lineCount !== null ? `\\n(${lineCount} lines)` : "";
    return `${normalizedPath.replace( /\//g, "/\\n" )}${lineCountLabel}`;
}

// Function to resolve file extensions
function resolveFileExtension( filePath ) {
    const extensions = [ ".js", ".jsx", ".ts", ".tsx", ".css", ".json", ".svg" ];
    for( const ext of extensions ) {
        const fullPath = `${filePath}${ext}`;
        if( fs.existsSync( fullPath ) ) {
            return fullPath;
        }
    }
    if( fs.existsSync( path.join( filePath, "index.js" ) ) ) {
        return path.join( filePath, "index.js" );
    }
    if( fs.existsSync( filePath ) ) {
        return filePath;
    }
    return null;
}

// Function to parse files and extract dependencies
function parseFile( filePath ) {
    const code = fs.readFileSync( filePath, "utf-8" );
    const normalizedFilePath = normalizePath( filePath );
    const fileDependencies = [];

    if( filePath.endsWith( ".css" ) ) {
        return [ { source: normalizedFilePath, imports: [] } ];
    }

    try {
        const ast = parse( code, {
            sourceType: "module",
            plugins: [ "jsx", "typescript" ],
        } );

        traverse( ast, {
            ImportDeclaration( importPath ) {
                const source = importPath.node.source.value;
                const imports = importPath.node.specifiers.map( ( specifier ) => specifier.local.name );

                if( source.startsWith( "." ) ) {
                    const importedFile = path.resolve( path.dirname( filePath ), source );
                    const resolvedFile = resolveFileExtension( importedFile );
                    if( resolvedFile ) {
                        fileDependencies.push( {
                            source: normalizePath( resolvedFile ),
                            imports,
                        } );
                    } else {
                        console.warn( `Unresolved relative import: ${source} in ${filePath}` );
                    }
                } else {
                    fileDependencies.push( { source, imports } );
                }
            },
        } );
    } catch( error ) {
        console.error( `Error parsing file: ${filePath}` );
        console.error( error.message );
    }

    return fileDependencies;
}

// Function to walk through the directory and extract dependencies
function extractFileDependencies( directory ) {
    const files = new Set();
    const dependencies = [];

    function walkDirectory( dir ) {
        fs.readdirSync( dir ).forEach( ( file ) => {
            const fullPath = path.join( dir, file );
            if( fs.statSync( fullPath ).isDirectory() ) {
                walkDirectory( fullPath );
            } else if( fullPath.endsWith( ".jsx" ) || fullPath.endsWith( ".js" ) || fullPath.endsWith( ".tsx" ) || fullPath.endsWith( ".ts" ) || fullPath.endsWith( ".css" ) ) {
                const normalizedFilePath = normalizePath( fullPath );
                if( !files.has( normalizedFilePath ) ) {
                    files.add( normalizedFilePath );
                    const fileDeps = parseFile( fullPath );
                    fileDeps.forEach( ( dep ) => {
                        dependencies.push( [ normalizedFilePath, dep ] );
                    } );
                }
            }
        } );
    }

    walkDirectory( directory );
    return { files: Array.from( files ), dependencies };
}

// Function to generate the D2 diagram
function generateD2Diagram( files, dependencies, outputFile ) {
    const d2Lines = [ "// React App Architecture", "direction: down" ];

    const fileToNodeMap = {};
    files.forEach( ( file ) => {
        const nodeName = normalizeNodeName( file );
        fileToNodeMap[ file ] = nodeName;
        const nodeLabel = formatNodeLabel( file );
        d2Lines.push( `${nodeName}: "${nodeLabel}"` );
    } );

    const externalNodes = new Set();
    dependencies.forEach( ( [ from, { source, imports } ] ) => {
        if( !files.includes( source ) ) {
            const nodeName = normalizeNodeName( source );
            if( !externalNodes.has( nodeName ) ) {
                externalNodes.add( nodeName );
                d2Lines.push( `${nodeName}: "${source}"` );
            }
        }
    } );

    dependencies.forEach( ( [ from, { source, imports } ] ) => {
        const fromNode = fileToNodeMap[ from ];
        const toNode = fileToNodeMap[ source ] || normalizeNodeName( source );

        if( fromNode && toNode && fromNode !== toNode ) {
            const label = imports.length > 0 ? `: "${imports.join( ",\\n" )}"` : "";
            d2Lines.push( `${fromNode} -> ${toNode}${label}` );
        }
    } );

    fs.writeFileSync( outputFile, d2Lines.join( "\n" ), "utf-8" );
    console.log( `D2 diagram saved to ${outputFile}` );
}

// Main execution
const sourceDir = SRC_DIR;
const outputFile = "react_app_architecture.d2";

if( !fs.existsSync( sourceDir ) ) {
    console.error( `Source directory does not exist: ${sourceDir}` );
    process.exit( 1 );
}

const { files, dependencies } = extractFileDependencies( sourceDir );
generateD2Diagram( files, dependencies, outputFile );
