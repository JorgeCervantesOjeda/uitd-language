// src/components/RendererD2.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import CodeViewer from './CodeViewer';
import '../App.css';
import RenderModal from './RenderModal';
import { asignarColores } from './color-assignment'

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
const ordenarTransiciones = ( transitions, uiOrder ) => {
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

        // 2) vecinos en el orden dado por uiOrder
        const uniqueOrder = uiOrder.filter( ( v, i, a ) => a.indexOf( v ) === i );
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
    uiOrder.forEach( id => dfs( id ) );

    return resultado;
};

const generateUIColorMap = ( uis ) => {
    // Construye el objeto tipo folderToNodes, donde cada clave es el id de la UI
    // y el valor es un array con ese mismo id (puede extenderse a más nodos si se desea)
    const folderToNodes = {};
    uis.forEach( ui => {
        folderToNodes[ ui.id ] = [ ui.id ];
    } );
    return asignarColores( folderToNodes );
};

// Ajustamos buildUIHierarchy para usar el color asignado
const buildUIHierarchy = ( ref, indentLevel, uis, parentKey, uiColorMap ) => {
    const ui = uis.find( u => u.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI con id ${ref.id} no encontrado.` );
        return '';
    }
    const indent = '  '.repeat( indentLevel );
    let out = '';
    out += `${indent}${ref.id}.class: ui${ui.id}\n`;
    // Solo pon stroke-dash si aplica a este nodo
    out += ref.full
        ? ''
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

// Devuelve recursivamente el uiRef más profundo
const getDeepestRef = ( ref ) =>
    ref.nested && ref.nested.length > 0
        ? getDeepestRef( ref.nested[ ref.nested.length - 1 ] )
        : ref;

// Función principal de traducción a D2
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    const uiColorMap = generateUIColorMap( parsedData.uis );

    // 1. Vars block (already in English)
    let varsBlock = 'vars: {\n';
    parsedData.uis.forEach( ui => {
        varsBlock += `  ui${ui.id}: {\n`;
        varsBlock += `    fill: "${uiColorMap[ ui.id ]?.fill || '#eeeeee'}"\n`;
        varsBlock += `    stroke: "${uiColorMap[ ui.id ]?.stroke || '#cccccc'}"\n`;
        varsBlock += `  }\n`;
    } );
    varsBlock += '}\n\n';

    // 2. Classes block (already in English)
    let uiClasses = '';
    let labelUiClasses = '';
    parsedData.uis.forEach( ui => {
        uiClasses += `  ui${ui.id}: {\n`;
        uiClasses += `    shape: rectangle\n`;
        uiClasses += `    style: {\n`;
        uiClasses += `      fill: \${ui${ui.id}.fill}\n`;
        uiClasses += `      stroke: \${ui${ui.id}.stroke}\n`;
        uiClasses += `      stroke-width: 6\n`;
        uiClasses += `      3d: true\n`;
        uiClasses += `    }\n`;
        uiClasses += `  }\n`;
        labelUiClasses += `  label_ui${ui.id}: {\n`;
        labelUiClasses += `    shape: oval\n`;
        labelUiClasses += `    style: {\n`;
        labelUiClasses += `      fill: \${ui${ui.id}.fill}\n`;
        labelUiClasses += `      stroke: \${ui${ui.id}.stroke}\n`;
        labelUiClasses += `      stroke-width: 6\n`;
        labelUiClasses += `      font-color: "#003311"\n`;
        labelUiClasses += `    }\n`;
        labelUiClasses += `  }\n`;
    } );

    // 3. Insert in your D2 (change comments and block names to English)
    let d2 =
        `direction: right\n\n` +
        varsBlock +
        `# Classes generated for each UI\n` +
        `classes: {\n` +
        uiClasses +
        labelUiClasses +
        `}\n\n` +
        `# Main container\n` +
        `UITD.style.fill: "#ffffff"\n` +
        `UITD.style.stroke-width: 0\n` +
        `UITD: ${parsedData.name} {\n`;

    parsedData.fragments.forEach( ( fragment, fIdx ) => {
        const fragLetter = String.fromCharCode( 65 + fIdx );
        const bgColor = fragment.color || '#eeeeee';
        const defaultWidth = fragment.width ?? 15;

        // Extract and sort transitions
        const uiOrder = fragment.draws
            .flatMap( draw => draw.uiRefs.flatMap( ref => flattenUIRefs( ref ) ) )
            .filter( ( v, i, a ) => a.indexOf( v ) === i );
        const sortedTransitions = ordenarTransiciones( fragment.transitions, uiOrder );

        // 1) Fragment start
        d2 += `  ${fragLetter}.style.fill: "${bgColor}"\n`;
        d2 += `  ${fragLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragLetter}: ${formatString( fragment.name, 20 )} {\n`;

        // 2) Transition arrows at the start of the fragment
        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace( /\./g, '_' )}_${toId.replace( /\./g, '_' )}`;
            d2 += `    ${fromId} -> ${lblId}\n`;
            d2 += `    ${lblId} -> ${toId}:{style.stroke-dash:5}\n`;
        } );

        // 3) Label definitions (class and text)
        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace( /\./g, '_' )}_${toId.replace( /\./g, '_' )}`;

            // 1) Background color of the label is the same as the origin node color
            // 1) Find the deepest nested UI reference
            const originRef = getDeepestRef( t.from );
            // 2) Use its id for the color
            d2 += `    ${lblId}.class: label_ui${originRef.id}\n`;
            let action = `${t.action} "${t.target}"`;
            if( t.condition ) action += ` AND (${t.condition})`;
            d2 += `    ${lblId}: ${formatString( action, t.width ?? defaultWidth )}\n`;
        } );

        // 4) UI hierarchy and other definitions
        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '', uiColorMap );
            } );
        } );

        // End of fragment block
        d2 += `  }\n`;
    } );

    d2 += `}\n`;
    return d2;
};


const RendererD2 = ( { data, theme } ) => {
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
        // Regeneramos completamente, con nuevos colores aleatorios
        const updated = translateToD2( data );
        // Actualizamos ambos estados para reflejar el nuevo código
        setDraftCode( updated );
        setRenderCode( updated );
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
                    theme={ theme }
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
