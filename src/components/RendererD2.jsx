import React, { useEffect, useState } from 'react';
import CodeViewer from './CodeViewer';
import '../App.css';  // Ensure this import is present

// Helper function to format nested UIRefs in transitions
const formatTransitionUIRef = ( uiRef ) => {
    if( !uiRef.nested || uiRef.nested.length === 0 ) {
        return uiRef.id;
    }

    const nestedRefs = uiRef.nested.map( nestedRef => formatTransitionUIRef( nestedRef ) ).join( '.' );
    return `${uiRef.id}.${nestedRefs}`;
};

const formatString = ( name, maxLength = 20 ) => {
    if( !name ) return '';
    const words = name.split( ' ' );
    let formattedName = '';
    let line = '';

    words.forEach( ( word ) => {
        if( ( line + word ).length > maxLength ) {
            if( line ) {
                formattedName += line + '\\n';
                line = '';
            }
        }
        if( line ) {
            line += ' ' + word;
        } else {
            line = word;
        }
    } );

    if( line ) {
        formattedName += line;
    }

    return formattedName;
};

// Function to translate parsed UITD to D2 language
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    const markers = parsedData.errors;

    let d2 = `direction: right\n"${parsedData.name}": {\n`;

    // Build UI hierarchy
    parsedData.fragments.forEach( ( fragment ) => {
        const formattedName = formatString( fragment.name );
        d2 += `  "${formattedName}": {\n`;

        fragment.draws.forEach( ( draw ) => {
            draw.uiRefs.forEach( ( ref ) => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '' );
            } );
        } );

        // Add transitions, excluding those with any markers on their line
        fragment.transitions.forEach( ( transition ) => {
            const hasMarkerOnLine = markers.some( marker => marker.startLineNumber === transition.line && marker.severity == 8 );

            if( !hasMarkerOnLine ) {
                const firstPart = `${formatTransitionUIRef( transition.from )} -> ${formatTransitionUIRef( transition.to )}: `;
                let transitionString = `${transition.action} "${transition.target}"`;
                if( transition.condition ) {
                    transitionString += ` AND (${transition.condition})`;
                }

                // Use width as maxLength if present, otherwise use a default value
                if( transition.width ) {
                    transitionString = formatString( transitionString, transition.width );
                } else {
                    transitionString = formatString( transitionString );
                }
                d2 += `    ${firstPart + transitionString}`;
                d2 += '\n';
            }
        } );

        d2 += '  }\n';
    } );

    d2 += '}\n';

    return d2;
};

// Helper function to build the UI hierarchy
const buildUIHierarchy = ( ref, indentLevel, uis, parentKey ) => {
    const ui = uis.find( ui => ui.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI with id ${ref.id} not found in the parsed data.` );
        return '';
    }

    let hierarchy = '';
    const formattedName = formatString( ui.name );

    if( ref.nested.length > 0 ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${formattedName} {\n`;
        ref.nested.forEach( ( nestedRef ) => {
            hierarchy += buildUIHierarchy( nestedRef, indentLevel + 1, uis, `${parentKey}${parentKey ? '(' : ''}${ref.id}${parentKey ? ')' : ''}` );
        } );
        hierarchy += `${'  '.repeat( indentLevel )}}\n`;
    } else {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${formatString(ui.name)}\n`;
    }

    if( ref.full ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}.style.stroke-width: 6\n`;
    }

    return hierarchy;
};

const RendererD2 = ( { data } ) => {
    const [ d2Output, setD2Output ] = useState( '' );
    const [ message, setMessage ] = useState( '' );

    useEffect( () => {
        const d2Text = translateToD2( data );
        setD2Output( d2Text );
    }, [ data ] );

    const copyToClipboard = () => {
        navigator.clipboard.writeText( d2Output ).then( () => {
            setMessage( 'Copied to clipboard!' );
            setTimeout( () => {
                setMessage( '' );
            }, 5000 );
        } ).catch( ( err ) => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    const openInPlayground = () => {
        const playgroundUrl = 'https://play.d2lang.com';
        window.open( playgroundUrl, '_blank' );
    };

    return (
        <div className="renderer-container">
            <div className="renderer-header">
                <div style={ { color: 'lightgreen', width: 'auto', whiteSpace: 'nowrap' } }>D2 Translation</div>
                <button onClick={ copyToClipboard } className="renderer-button">
                    Copy to Clipboard
                </button>
                <button onClick={ openInPlayground } className="renderer-button">
                    SVG Renderer
                </button>
            </div>
            <div style={ {
                minHeight: '20px',
                color: 'yellow',
                backgroundColor: message ? 'darkred' : 'black',
                opacity: 1
            } }>
                { message || '\u00A0' }
            </div>
            <CodeViewer code={ d2Output } language="uitdl" />
        </div>
    );
};

export default RendererD2;
