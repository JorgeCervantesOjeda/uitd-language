import React, { useEffect, useState } from 'react';
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

const formatString = ( name, maxLength = 50 ) => {
    if( !name ) return '';
    if( !maxLength ) maxLength = 50;
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

const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';
    const markers = parsedData.errors;
    let d2 = `direction: right\nUITD.style.fill: white\nUITD.style.stroke-width: 0\nUITD: ${parsedData.name} {\n`;
    let fragmentCounter = 65;
    parsedData.fragments.forEach( fragment => {
        const fragmentLetter = String.fromCharCode( fragmentCounter++ );
        const formattedFragmentName = formatString( fragment.name );
        d2 += `  ${fragmentLetter}.style.fill: white\n`;
        d2 += `  ${fragmentLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragmentLetter}: ${formattedFragmentName} {\n`;
        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '' );
            } );
        } );
        const defaultWidth = fragment.width ?? 50;
        fragment.transitions.forEach( transition => {
            const hasMarker = markers.some( m => m.startLineNumber === transition.line && m.severity === 8 );
            if( !hasMarker ) {
                const firstPart = `${formatTransitionUIRef( transition.from )} -> ${formatTransitionUIRef( transition.to )}: `;
                const useWidth = ( transition.width != null ) ? transition.width : defaultWidth;
                let transitionStr = `${transition.action} \"${transition.target}\"`;
                if( transition.condition ) transitionStr += ` AND (${transition.condition})`;
                transitionStr = formatString( transitionStr, useWidth );
                d2 += `    ${firstPart + transitionStr}\n`;
            }
        } );
        d2 += '  }\n';
    } );
    d2 += '}\n';
    return d2;
};

// Reintroducing parentKey to maintain context of nesting for full UI path generation
const buildUIHierarchy = ( ref, indentLevel, uis, parentKey ) => {
    const ui = uis.find( u => u.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI with id ${ref.id} not found.` );
        return '';
    }
    const indent = '  '.repeat( indentLevel );
    const formattedName = formatString( ui.name );
    let out = ref.full
        ? `${indent}${ref.id}.style.stroke-width: 6\n`
        : `${indent}${ref.id}.style.stroke-dash: 5\n`;
    if( ref.nested.length > 0 ) {
        out += `${indent}${ref.id}: ${ref.id} ${formattedName} {\n`;
        // Pass updated parentKey down to nested calls
        const nextKey = parentKey ? `${parentKey}.${ref.id}` : ref.id;
        ref.nested.forEach( nr => {
            out += buildUIHierarchy( nr, indentLevel + 1, uis, nextKey );
        } );
        out += `${indent}}\n`;
    } else {
        out += `${indent}${ref.id}: ${ref.id} ${formattedName}\n`;
    }
    return out;
};

const RendererD2 = ( { data } ) => {
    const initialD2 = translateToD2( data );
    const [ draftCode, setDraftCode ] = useState( initialD2 );
    const [ renderCode, setRenderCode ] = useState( initialD2 );
    const [ modalOpen, setModalOpen ] = useState( false );
    const message = renderCode !== draftCode ? 'D2 no actualizado' : '';
    useEffect( () => {
        const updated = translateToD2( data );
        setDraftCode( updated );
    }, [ data ] );
    const handleUpdate = () => setRenderCode( draftCode );
    const handleCopy = () => {
        navigator.clipboard.writeText( draftCode ).catch( console.error );
    }
    const openInPlayground = () => window.open( 'https://play.d2lang.com', '_blank' );
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
                    <a href="#"
                        onClick={ e => { e.preventDefault(); openInPlayground(); } }
                        className="mt-2 renderer-button block text-center">
                        Playground
                    </a>
                </div>
                <div
                    className="alert-message"
                    style={ { '--message-bg': message ? 'darkred' : 'black' } }
                >
                    { message || '\u00A0' }
                </div>
            </div>
            <div className='scroll-area'>
                <CodeViewer
                    code={ renderCode }
                    language="uitdl"
                    onChange={ ( value ) => setRenderCode( value ) } />
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
