import React, { useEffect, useState, useRef, useCallback } from 'react';
import CodeViewer from './CodeViewer';
import '../App.css';  // Ensure this import is present
import RenderModal from './RenderModal';

// Helper functions (formatTransitionUIRef, formatString, translateToD2, buildUIHierarchy) remain unchanged
const formatTransitionUIRef = ( uiRef ) => {
    if( !uiRef.nested || uiRef.nested.length === 0 ) {
        return uiRef.id;
    }
    const nestedRefs = uiRef.nested.map( nestedRef => formatTransitionUIRef( nestedRef ) ).join( '.' );
    return `${uiRef.id}.${nestedRefs}`;
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

// Al inicio de tu módulo, justo donde defines otras funciones:

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

const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    const uiColorMap = generateUIColorMap( parsedData.uis );

    let d2 = `direction: right\n\n` +
        `# Clase para nodos fantasma de etiquetas\n` +
        `classes: {\n` +
        `  label_bg: {\n` +
        `    shape: text\n` +
        `    style: {\n` +
        `      fill: \"#f9f9f9\"\n` +
        `      stroke-width: 0\n` +
        `      border-radius: 4\n` +
        `      font-color: \"#333333\"\n` +
        `      font-size: 12\n` +
        `    }\n` +
        `  }\n` +
        `}\n\n` +
        `# Contenedor principal\n` +
        `UITD.style.fill: \"#ffffff\"\n` +
        `UITD.style.stroke-width: 0\n` +
        `UITD: ${parsedData.name} {\n`;

    parsedData.fragments.forEach( ( fragment, fIdx ) => {
        const fragLetter = String.fromCharCode( 65 + fIdx );
        const bgColor = fragment.color || '#eeeeee';
        d2 += `  ${fragLetter}.style.fill: \"${bgColor}\"\n`;
        d2 += `  ${fragLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragLetter}: ${formatString( fragment.name, 20 )} {\n`;

        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '', uiColorMap );
            } );
        } );

        const defaultWidth = fragment.width ?? 15;
        let labelCounter = 0;
        fragment.transitions.forEach( transition => {
            const fromId = formatTransitionUIRef( transition.from );
            const toId = formatTransitionUIRef( transition.to );
            let rawAction = `${transition.action} \"${transition.target}\"`;
            if( transition.condition ) {
                rawAction += ` AND (${transition.condition})`;
            }
            const useWidth = ( transition.width != null ) ? transition.width : defaultWidth;
            const formattedAction = formatString( rawAction, useWidth );
            labelCounter += 1;
            const lblId = `lbl${fromId.replace( /\./g, '_' )}_${toId.replace( /\./g, '_' )}_${labelCounter}`;

            d2 += `    ${lblId}.class: label_bg\n`;
            d2 += `    ${lblId}: ${formattedAction}\n`;
            d2 += `    ${fromId} -> ${lblId}\n`;
            d2 += `    ${lblId} -> ${toId}\n`;
        } );

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
        navigator.clipboard.writeText( draftCode )
            .then( () => displayMsg( 'Copied to clipboard!' ) )
            .catch( console.error );
    };

    const openInPlayground = () => window.open( 'https://play.d2lang.com', '_blank' );

    const needsUpdate = renderCode !== draftCode;
    const alertText = message || ( needsUpdate ? 'Update d2.' : '\u00A0' );
    const alertBg = message || needsUpdate ? 'darkred' : 'black';

    return (
        <div className="renderer-container">
            <div className='sticky-area'>
                <div className="renderer-header">
                    <div style={ { color: 'lightgreen', whiteSpace: 'nowrap' } }>
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
                        className="mt-2 renderer-button block text-center"
                    >
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
            <div className='scroll-area'>
                <CodeViewer
                    code={ renderCode }
                    onChange={ ( value ) => setRenderCode( value ) }
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
