// components/RendererD2.jsx
import React from 'react';

// Function to translate parsed UITD to D2 language
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    let d2 = `"${parsedData.name}": {\n`;

    // Build UI hierarchy
    parsedData.fragments.forEach( fragment => {
        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis );
            } );
        } );
    } );

    // Add transitions
    parsedData.fragments.forEach( fragment => {
        fragment.transitions.forEach( transition => {
            d2 += `  ${formatTransition( transition.from )} -> ${formatTransition( transition.to )}: Clicks "${transition.target}"`;
            if( transition.condition ) {
                d2 += ` AND (${transition.condition})`;
            }
            d2 += `\n`;
        } );
    } );

    d2 += '}\n';

    return d2;
};

// Helper function to build the UI hierarchy
const buildUIHierarchy = ( ref, indentLevel, uis ) => {
    const ui = uis.find( ui => ui.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI with id ${ref.id} not found in the parsed data.` );
        return '';
    }
    let hierarchy = `${'  '.repeat( indentLevel )}${ref.id}: ${ui.name}`;
    if( ref.nested.length > 0 ) {
        hierarchy += ' {\n';
        ref.nested.forEach( nestedRef => {
            hierarchy += buildUIHierarchy( nestedRef, indentLevel + 1, uis );
        } );
        hierarchy += `${'  '.repeat( indentLevel )}}\n`;
    } else {
        hierarchy += '\n';
    }
    return hierarchy;
};

// Helper function to format nested transitions
const formatTransition = ( transition ) => {
    return transition.replace( /\(/g, '.' ).replace( /\)/g, '' );
};

const RendererD2 = ( { data } ) => {
    const d2Output = translateToD2( data );

    const copyToClipboard = () => {
        navigator.clipboard.writeText( d2Output ).then( () => {
            alert( 'Copied to clipboard!' );
        } ).catch( err => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    return (
        <div style={ { padding: '16px', backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '4px' } }>
            <button onClick={ copyToClipboard } style={ { marginBottom: '10px' } }>Copy to Clipboard</button>
            <pre>{ d2Output }</pre>
        </div>
    );
};

export default RendererD2;
