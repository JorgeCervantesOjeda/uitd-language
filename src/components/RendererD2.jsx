import React, { useEffect, useState } from 'react';
import CodeViewer from './CodeViewer';
import '../App.css';  // Ensure this import is present
import RenderModal from './RenderModal';

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
// Function to translate parsed UITD to D2 language
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    const markers = parsedData.errors;

    // Initialize D2 output with the requested beginning
    let d2 = `direction: right\nUITD.style.fill: white\nUITD.style.stroke-width: 0\nUITD: ${parsedData.name} {\n`;

    // Create a counter for assigning consecutive alphabet letters to fragments (A, B, C, etc.)
    let fragmentCounter = 65; // ASCII value of 'A'

    // Build UI hierarchy for each fragment
    parsedData.fragments.forEach( ( fragment ) => {
        const fragmentLetter = String.fromCharCode( fragmentCounter ); // Get the alphabet letter
        fragmentCounter += 1; // Move to the next letter

        const formattedFragmentName = formatString( fragment.name );

        // Add fragment with styles
        d2 += `  ${fragmentLetter}.style.fill: white\n`;
        d2 += `  ${fragmentLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragmentLetter}: ${formattedFragmentName} {\n`;

        fragment.draws.forEach( ( draw ) => {
            draw.uiRefs.forEach( ( ref ) => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, '' ); // Increase indent level
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
                d2 += `    ${firstPart + transitionString}\n`;
            }
        } );

        d2 += '  }\n'; // Close fragment
    } );

    d2 += '}\n'; // Close UITD

    return d2;
};

// Helper function to build the UI hierarchy
const buildUIHierarchy = ( ref, indentLevel, uis, parentKey ) => {
    const ui = uis.find( ( ui ) => ui.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI with id ${ref.id} not found in the parsed data.` );
        return '';
    }

    let hierarchy = '';
    const formattedName = formatString( ui.name );

    // Check if the UI has a stroke-width of 6, otherwise use stroke-dash
    if( ref.full ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}.style.stroke-width: 6\n`;
    } else {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}.style.stroke-dash: 5\n`;
    }

    // Add the UI element with its ID and name
    if( ref.nested.length > 0 ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${formattedName} {\n`;
        ref.nested.forEach( ( nestedRef ) => {
            hierarchy += buildUIHierarchy( nestedRef, indentLevel + 1, uis, `${parentKey}${parentKey ? '(' : ''}${ref.id}${parentKey ? ')' : ''}` );
        } );
        hierarchy += `${'  '.repeat( indentLevel )}}\n`;
    } else {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${formattedName}\n`;
    }

    return hierarchy;
};

const RendererD2 = ( { data } ) => {
    const [ d2Output, setD2Output ] = useState( '' );
    const [ message, setMessage ] = useState( '' );
    const [ modalOpen, setModalOpen ] = useState( false );  // ② Estado modal

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
            <div className='sticky-area'>
                <div className="renderer-header">
                    <div style={ { color: 'lightgreen', width: 'auto', whiteSpace: 'nowrap' } }>D2 Translation</div>
                    <button
                        onClick={ () => setModalOpen( true ) }
                        className="renderer-button"
                    >
                        View Diagram
                    </button>
                </div>
                <div className="alert-message"
                    style={ {
                        '--message-bg': message ? 'darkred' : 'black'
                    } }
                >
                    { message || '\u00A0' }
                </div>
            </div>
            <div className='scroll-area'>
                <CodeViewer code={ d2Output } language="uitdl" />
            </div>
            <RenderModal
                d2Source={ d2Output }
                isOpen={ modalOpen }
                onClose={ () => setModalOpen( false ) }
            />
        </div >
    );
};

export default RendererD2;
