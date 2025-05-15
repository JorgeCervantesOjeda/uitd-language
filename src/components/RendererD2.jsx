// src/components/RendererD2.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import CodeViewer from './CodeViewer';
import '../App.css';
import RenderModal from './RenderModal';

// Helper functions (formatTransitionUIRef, formatString, buildUIHierarchy) remain unchanged
const formatTransitionUIRef = ( uiRef ) => {
    if( !uiRef.nested || uiRef.nested.length === 0 ) {
        return uiRef.id;
    }
    const nestedRefs = uiRef.nested.map( nestedRef => formatTransitionUIRef( nestedRef ) ).join( '.' );
    return `${uiRef.id}.${nestedRefs}`;
};

const flattenUIRefs = ( ref, parentKey = '' ) => {
    const key = parentKey ? `${parentKey}.${ref.id}` : ref.id;
    let keys = [ key ];
    if( ref.nested && ref.nested.length > 0 ) {
        ref.nested.forEach( nr => {
            keys = keys.concat( flattenUIRefs( nr, key ) );
        } );
    }
    return keys;
};

const formatString = ( name, maxLength = 15 ) => {
    if( !name ) return '';
    if( !maxLength ) maxLength = 15;
    const words = name.split( ' ' );
    let formattedName = '';
    let line = '';
    words.forEach( word => {
        if( ( line + word ).length > maxLength ) {
            if( line ) {
                formattedName += line + '\\n';
                line = '';
            }
        }
        line = line ? `${line} ${word}` : word;
    } );
    if( line ) formattedName += line;
    return formattedName;
};

// Función recursiva para ordenar transiciones según especificación,
// primero midiendo profundidades, luego volviendo a ordenar según ellas
const ordenarTransiciones = ( transitions, uiOrder ) => {
    // --- Primer pase: calcular profundidad máxima por nodo ---
    const maxDepths = {};
    const usedForDepth = Array( transitions.length ).fill( false );

    const dfsDepth = ( actual, depth ) => {
        maxDepths[ actual ] = Math.max( maxDepths[ actual ] || 0, depth );

        transitions.forEach( ( t, i ) => {
            if( usedForDepth[ i ] ) return;
            const fromKey = formatTransitionUIRef( t.from );
            const toKey = formatTransitionUIRef( t.to );

            if( fromKey === actual || toKey === actual ) {
                usedForDepth[ i ] = true;
                const vecino = ( fromKey === actual ? toKey : fromKey );
                dfsDepth( vecino, depth + 1 );
            }
        } );
    };

    uiOrder.forEach( id => dfsDepth( id, 0 ) );

    // crear nuevo orden de nodos:
    // - primero por profundidad (descendente)
    // - si igual, por posición en uiOrder (ascendente)
    const sortedOrder = [ ...new Set( uiOrder ) ].sort( ( a, b ) => {
        const depthA = maxDepths[ a ] || 0;
        const depthB = maxDepths[ b ] || 0;
        if( depthA !== depthB ) {
            return depthB - depthA;
        }
        return uiOrder.indexOf( a ) - uiOrder.indexOf( b );
    } );

    // --- Segundo pase: reconstruir 'resultado' usando sortedOrder ---
    const usadas = Array( transitions.length ).fill( false );
    const resultado = [];

    const dfs = ( actual ) => {
        // 1) self-transitions
        transitions.forEach( ( t, i ) => {
            const fromKey = formatTransitionUIRef( t.from );
            const toKey = formatTransitionUIRef( t.to );
            if( !usadas[ i ] && fromKey === actual && toKey === actual ) {
                resultado.push( t );
                usadas[ i ] = true;
            }
        } );

        // 2) vecinos en el orden dado por sortedOrder
        const uniqueOrder = sortedOrder.filter( ( v, i, a ) => a.indexOf( v ) === i );
        const vecinos = uniqueOrder.filter( key => {
            if( key === actual ) return false;
            return transitions.some( ( t, i ) => {
                if( usadas[ i ] ) return false;
                const fromKey = formatTransitionUIRef( t.from );
                const toKey = formatTransitionUIRef( t.to );
                return ( fromKey === actual && toKey === key )
                    || ( fromKey === key && toKey === actual );
            } );
        } );

        // 3) para cada vecino B: A→B, B→A, recursión
        vecinos.forEach( b => {
            transitions.forEach( ( t, i ) => {
                const fromKey = formatTransitionUIRef( t.from );
                const toKey = formatTransitionUIRef( t.to );
                if( !usadas[ i ] && (
                    ( fromKey === actual && toKey === b ) ||
                    ( fromKey === b && toKey === actual )
                ) ) {
                    resultado.push( t );
                    usadas[ i ] = true;
                }
            } );
            dfs( b );
        } );
    };

    // arrancar DFS con el orden basado en profundidad
    sortedOrder.forEach( id => dfs( id ) );

    return resultado;
};

// Generar un color aleatorio claro en hex
const randomColor = () => {
    const r = Math.floor( 200 + Math.random() * 55 );
    const g = Math.floor( 200 + Math.random() * 55 );
    const b = Math.floor( 200 + Math.random() * 55 );
    const hr = r.toString( 16 ).padStart( 2, '0' );
    const hg = g.toString( 16 ).padStart( 2, '0' );
    const hb = b.toString( 16 ).padStart( 2, '0' );
    return `#${hr}${hg}${hb}`;
};

// Asignar un color único por cada UI id
const generateUIColorMap = ( uis ) => {
    const map = {};
    uis.forEach( ui => {
        map[ ui.id ] = randomColor();
    } );
    return map;
};

// Ajustamos buildUIHierarchy para usar el color asignado
const buildUIHierarchy = ( ref, indentLevel, uis, parentKey, uiColorMap ) => {
    const ui = uis.find( u => u.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI con id ${ref.id} no encontrado.` );
        return '';
    }
    const indent = '  '.repeat( indentLevel );
    const fillColor = uiColorMap[ ui.id ] || '#eeeeee';
    let out = `${indent}${ref.id}.style.fill: "${fillColor}"\n`;
    out += ref.full
        ? `${indent}${ref.id}.style.stroke-width: 6\n`
        : `${indent}${ref.id}.style.stroke-dash: 5\n`;

    if( ref.nested.length > 0 ) {
        const formattedName = formatString( ui.name, 20 );
        out += `${indent}${ref.id}: ${ref.id} ${formattedName} {\n`;
        const nextKey = parentKey ? `${parentKey}.${ref.id}` : ref.id;
        ref.nested.forEach( nr => {
            out += buildUIHierarchy( nr, indentLevel + 1, uis, nextKey, uiColorMap );
        } );
        out += `${indent}}\n`;
    } else {
        const formattedName = formatString( ui.name, 20 );
        out += `${indent}${ref.id}: ${ref.id} ${formattedName}\n`;
    }
    return out;
};

// Función principal de traducción a D2
// Función principal de traducción a D2
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    const uiColorMap = generateUIColorMap( parsedData.uis );

    // Cabecera y bloque classes (las primeras 15 líneas)
    let d2 =
        `direction: right\n\n` +
        `# Clase para nodos fantasma de etiquetas\n` +
        `classes: {\n` +
        `  label_bg: {\n` +
        `    shape: text\n` +
        `    style: {\n` +
        `      stroke-width: 015\n` +
        `      font-color: "#003311"\n` +
        `      font-size: 18\n` +
        `    }\n` +
        `  }\n` +
        `}\n\n` +
        `# Contenedor principal\n` +
        `UITD.style.fill: "#ffffff"\n` +
        `UITD.style.stroke-width: 0\n` +
        `UITD: ${parsedData.name} {\n`;

    parsedData.fragments.forEach( ( fragment, fIdx ) => {
        const fragLetter = String.fromCharCode( 65 + fIdx );
        const bgColor = fragment.color || '#eeeeee';
        const defaultWidth = fragment.width ?? 15;

        // Extraemos y ordenamos transiciones
        const uiOrder = fragment.draws
            .flatMap( draw => draw.uiRefs.flatMap( ref => flattenUIRefs( ref ) ) )
            .filter( ( v, i, a ) => a.indexOf( v ) === i );
        const sortedTransitions = ordenarTransiciones( fragment.transitions, uiOrder );

        // 1) Inicio del fragmento
        d2 += `  ${fragLetter}.style.fill: "${bgColor}"\n`;
        d2 += `  ${fragLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragLetter}: ${formatString( fragment.name, 20 )} {\n`;

        // 2) Flechas de transición al inicio del fragmento
        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace( /\./g, '_' )}_${toId.replace( /\./g, '_' )}`;
            d2 += `    ${fromId} -> ${lblId}\n`;
            d2 += `    ${lblId} -> ${toId}\n`;
        } );

        // 3) Definiciones de labels (clase y texto)
        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace( /\./g, '_' )}_${toId.replace( /\./g, '_' )}`;

            d2 += `    ${lblId}.class: label_bg\n`;
            let action = `${t.action} "${t.target}"`;
            if( t.condition ) action += ` AND (${t.condition})`;
            d2 += `    ${lblId}: ${formatString( action, t.width ?? defaultWidth )}\n`;
        } );

        // 4) Jerarquía de UIs y resto de definiciones
        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '', uiColorMap );
            } );
        } );

        // Cierre del bloque de fragmento
        d2 += `  }\n`;
    } );

    d2 += `}\n`;
    return d2;
};


const RendererD2 = ( { data } ) => {
    const initialD2 = translateToD2( data );
    const [ draftCode, setDraftCode ] = useState( initialD2 );
    const [ renderCode, setRenderCode ] = useState( initialD2 );
    const [ modalOpen, setModalOpen ] = useState( false );
    const [ message, setMessage ] = useState( '' );
    const timer = useRef( null );

    useEffect( () => () => { if( timer.current ) clearTimeout( timer.current ); }, [] );
    const displayMsg = useCallback( ( msg, duration = 3000 ) => {
        setMessage( msg );
        if( timer.current ) clearTimeout( timer.current );
        timer.current = setTimeout( () => setMessage( '' ), duration );
    }, [] );


    useEffect( () => {
        const updated = translateToD2( data );
        setDraftCode( updated );
    }, [ data ] );

    const handleUpdate = () => {
        setRenderCode( draftCode );
        displayMsg( 'D2 updated.' );
    };

    const handleCopy = () => {
        navigator.clipboard.writeText( renderCode )
            .then( () => displayMsg( 'Copied to clipboard!' ) )
            .catch( console.error );
    };

    const openInPlayground = () => window.open( 'https://play.d2lang.com', '_blank' );

    const needsUpdate = renderCode !== draftCode;
    const alertText = message || ( needsUpdate ? 'Update d2.' : '\u00A0' );
    const alertBg = message || needsUpdate ? 'darkred' : 'black';

    return (
        <div className="renderer-container panel-container">
            <div className="sticky-area">
                <div className="renderer-header">
                    <div style={ { color: 'lightgreen', whiteSpace: 'nowrap', marginRight: '12px' } }>
                        D2 Translation
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={ handleUpdate } className="renderer-button">
                            Update D2
                        </button>
                        <button onClick={ () => setModalOpen( true ) } className="renderer-button">
                            View Diagram
                        </button>
                        <button onClick={ handleCopy } className="renderer-button">
                            Copy
                        </button>
                    </div>
                    <a
                        href="#"
                        onClick={ e => { e.preventDefault(); openInPlayground(); } }
                        className="mt-2 renderer-button block text-center">
                        Playground
                    </a>
                </div>

                <div
                    className="alert-message"
                    style={ { '--message-bg': alertBg } }
                >
                    { alertText }
                </div>
            </div>

            <div className="scroll-area">
                <CodeViewer
                    code={ renderCode }
                    onChange={ value => setRenderCode( value ) }
                />
            </div>

            <RenderModal
                d2Source={ renderCode }
                isOpen={ modalOpen }
                onClose={ () => setModalOpen( false ) }
            />
        </div>
    );
};

export default RendererD2;
