import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import { createRequire } from "module";

const require = createRequire( import.meta.url );
const traverse = require( "@babel/traverse" ).default;

const SRC_DIR = path.resolve( "./src" );

// Inicializar la variable para contar las líneas totales
let totalLines = 0;

// Función para normalizar rutas de archivos de manera consistente
function normalizePath( filePath ) {
    return path.relative( SRC_DIR, filePath ).replace( /\\/g, "/" );
}

// Función para generar nombres únicos para los nodos
function normalizeNodeName( input ) {
    return input.replace( /[^a-zA-Z0-9_]/g, "_" ).toLowerCase();
}

// Función para calcular el grosor del borde basado en el número de líneas
function getStrokeWidth( lineCount ) {
    if( lineCount === null ) return 1; // Valor por defecto si no se puede contar las líneas
    return 1 + Math.floor( lineCount / 30 );
}

// Función para contar líneas en un archivo
function getLineCount( filePath ) {
    // Construir la ruta absoluta correctamente
    const absolutePath = path.join( SRC_DIR, filePath );
    try {
        const content = fs.readFileSync( absolutePath, "utf-8" );
        const lines = content.split( "\n" ).length;
        totalLines += lines; // Acumular el número de líneas
        console.log( `File: ${filePath}, Lines: ${lines}` );
        return lines;
    } catch( error ) {
        console.warn( `Failed to read file: ${absolutePath}` );
        return null;
    }
}

// Función memoizada para contar líneas
function memoize( fn ) {
    const cache = {};
    return function ( filePath ) {
        if( cache[ filePath ] !== undefined ) {
            //console.log(`Usando el caché para: ${filePath}`);
            return cache[ filePath ];
        } else {
            const result = fn( filePath );
            cache[ filePath ] = result;
            return result;
        }
    };
}

// Crear una versión memoizada de getLineCount
const getLineCountMemoized = memoize( getLineCount );

// Función para formatear etiquetas de nodos
function formatNodeLabel( filePath ) {
    const normalizedPath = normalizePath( filePath );
    const lineCount = getLineCountMemoized( filePath ); // Usar la versión memoizada
    const lineCountLabel = lineCount !== null ? `\\n(${lineCount} lines)` : "";
    return `${normalizedPath.replace( /\//g, "/\\n" )}${lineCountLabel}`;
}

// Función para resolver extensiones de archivos
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

// Función para analizar archivos y extraer dependencias
function parseFile( filePath ) {
    const code = fs.readFileSync( filePath, "utf-8" );
    const normalizedFilePath = normalizePath( filePath );
    const fileDependencies = [];

    // Obtener el conteo de líneas una sola vez
    getLineCountMemoized( normalizedFilePath );

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
                const imports = importPath.node.specifiers.map(
                    ( specifier ) => specifier.local.name
                );

                if( source.startsWith( "." ) ) {
                    const importedFile = path.resolve(
                        path.dirname( filePath ),
                        source
                    );
                    const resolvedFile = resolveFileExtension( importedFile );
                    if( resolvedFile ) {
                        const normalizedResolvedFile = normalizePath( resolvedFile );
                        fileDependencies.push( {
                            source: normalizedResolvedFile,
                            imports,
                        } );
                    } else {
                        console.warn(
                            `Unresolved relative import: ${source} in ${filePath}`
                        );
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

// Función para recorrer el directorio y extraer dependencias
function extractFileDependencies( directory ) {
    const files = new Set();
    const dependencies = [];

    function walkDirectory( dir ) {
        fs.readdirSync( dir ).forEach( ( file ) => {
            const fullPath = path.join( dir, file );
            if( fs.statSync( fullPath ).isDirectory() ) {
                walkDirectory( fullPath );
            } else if(
                fullPath.endsWith( ".jsx" ) ||
                fullPath.endsWith( ".js" ) ||
                fullPath.endsWith( ".tsx" ) ||
                fullPath.endsWith( ".ts" ) ||
                fullPath.endsWith( ".css" )
            ) {
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

// Función para generar el diagrama D2
function generateD2Diagram( files, dependencies, outputFile ) {
    const d2Lines = [ "direction: down" ]; // Eliminamos la línea de comentario inicial

    const fileToNodeMap = {};

    // Crear nodos con estilos basados en el número de líneas
    files.forEach( ( file ) => {
        const nodeName = normalizeNodeName( file );
        fileToNodeMap[ file ] = nodeName;
        const lineCount = getLineCountMemoized( file ); // Llamada memoizada
        const nodeLabel = formatNodeLabel( file );
        const strokeWidth = getStrokeWidth( lineCount );
        d2Lines.push(
            `${nodeName}: "${nodeLabel}" { style: { stroke-width: ${strokeWidth} } }`
        );
    } );

    const externalNodes = new Set();
    dependencies.forEach( ( [ from, { source, imports } ] ) => {
        if( !files.includes( source ) ) {
            const nodeName = normalizeNodeName( source );
            if( !externalNodes.has( nodeName ) ) {
                externalNodes.add( nodeName );
                d2Lines.push(
                    `${nodeName}: "${source}" { style: { stroke-width: 1 } }`
                ); // Valor por defecto para nodos externos
            }
        }
    } );

    dependencies.forEach( ( [ from, { source, imports } ] ) => {
        const fromNode = fileToNodeMap[ from ];
        const toNode = fileToNodeMap[ source ] || normalizeNodeName( source );

        if( fromNode && toNode && fromNode !== toNode ) {
            const label = imports.length > 0 ? `: "${imports.join( ",\\n" )}"` : "";
            d2Lines.push( `${fromNode} -> ${toNode}${label}` );
        } else {
            console.warn( `Dependencia no encontrada entre ${from} y ${source}` );
        }
    } );

    fs.writeFileSync( outputFile, d2Lines.join( "\n" ), "utf-8" );
    console.log( `D2 diagram saved to ${outputFile}` );
}

// Ejecución principal
const sourceDir = SRC_DIR;
const outputFile = "react_app_architecture.d2";

if( !fs.existsSync( sourceDir ) ) {
    console.error( `Source directory does not exist: ${sourceDir}` );
    process.exit( 1 );
}

const { files, dependencies } = extractFileDependencies( sourceDir );
generateD2Diagram( files, dependencies, outputFile );

// Reportar el total de líneas
console.log( `Total number of lines: ${totalLines}` );
