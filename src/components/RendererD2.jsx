import React, { useEffect, useState } from 'react';

// Helper function to format nested transitions
const formatTransition = ( transition ) => {
    return transition.replace( /\(/g, '.' ).replace( /\)/g, '' );
};

// Function to gather unique transitions for each UI in the entire UITD
const gatherAllTransitions = ( parsedData ) => {
    const uiTransitions = {};

    parsedData.fragments.forEach( fragment => {
        fragment.transitions.forEach( transition => {
            const fromUI = getInnermostUI( transition.from );
            const toUI = getInnermostUI( transition.to );

            if( !uiTransitions[ fromUI ] ) {
                uiTransitions[ fromUI ] = new Set();
            }
            if( !uiTransitions[ toUI ] ) {
                uiTransitions[ toUI ] = new Set();
            }

            const transitionStr = `${transition.from}->${transition.to}:${transition.action}:${transition.target}:${transition.condition}`;
            uiTransitions[ fromUI ].add( transitionStr );
            uiTransitions[ toUI ].add( transitionStr );
        } );
    } );

    return uiTransitions;
};

// Function to gather transitions for each UI copy in a fragment
const gatherFragmentTransitions = ( fragment ) => {
    const fragmentTransitions = {};

    fragment.transitions.forEach( transition => {
        const fromKey = transition.from.replace( /\(/g, '.' ).replace( /\)/g, '' );
        const toKey = transition.to.replace( /\(/g, '.' ).replace( /\)/g, '' );

        if( !fragmentTransitions[ fromKey ] ) {
            fragmentTransitions[ fromKey ] = new Set();
        }
        if( !fragmentTransitions[ toKey ] ) {
            fragmentTransitions[ toKey ] = new Set();
        }

        const transitionStr = `${transition.from}->${transition.to}:${transition.action}:${transition.target}:${transition.condition}`;
        fragmentTransitions[ fromKey ].add( transitionStr );
        fragmentTransitions[ toKey ].add( transitionStr );
    } );

    return fragmentTransitions;
};

// Helper function to extract the innermost referenced UI
const getInnermostUI = ( transition ) => {
    const parts = transition.split( /[\(\)]+/ );
    return parts[ parts.length - 1 ] === '' ? parts[ parts.length - 2 ] : parts[ parts.length - 1 ];
};

// Function to translate parsed UITD to D2 language
const translateToD2 = ( parsedData ) => {
    if( !parsedData || !parsedData.name ) return '';

    let d2 = `direction: right\n"${parsedData.name}": {\n`;

    const allTransitions = gatherAllTransitions( parsedData );

    // Build UI hierarchy
    parsedData.fragments.forEach( ( fragment, fragmentIndex ) => {
        d2 += `  "Fragment ${fragment.name}": {\n`;

        const fragmentTransitions = gatherFragmentTransitions( fragment );

        fragment.draws.forEach( ( draw, drawIndex ) => {
            draw.uiRefs.forEach( ( ref, refIndex ) => {
                d2 += buildUIHierarchy( ref, 2, parsedData.uis, fragmentTransitions, allTransitions, '' );
            } );
        } );

        // Add transitions
        fragment.transitions.forEach( ( transition, transitionIndex ) => {
            d2 += `    ${formatTransition( transition.from )} -> ${formatTransition( transition.to )}: \``;
            d2 += `${transition.action} "${transition.target}"`;
            if( transition.condition ) {
                d2 += ` AND\\n(${transition.condition})`;
            }
            d2 += `\`\n`;
        } );

        d2 += '  }\n';
    } );

    d2 += '}\n';

    return d2;
};

// Helper function to build the UI hierarchy
const buildUIHierarchy = ( ref, indentLevel, uis, fragmentTransitions, allTransitions, parentKey ) => {
    const ui = uis.find( ui => ui.id === parseInt( ref.id ) );
    if( !ui ) {
        console.error( `UI with id ${ref.id} not found in the parsed data.` );
        return '';
    }

    let hierarchy = '';

    // Construct parent key
    const fullKey = parentKey ? `${parentKey}.${ref.id}` : ref.id.toString();

    if( ref.nested.length > 0 ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${ui.name} {\n`;
        ref.nested.forEach( ( nestedRef, nestedIndex ) => {
            hierarchy += buildUIHierarchy( nestedRef, indentLevel + 1, uis, fragmentTransitions, allTransitions, `${parentKey}${parentKey ? '(' : ''}${ref.id}${parentKey ? ')' : ''}` );
        } );
        hierarchy += `${'  '.repeat( indentLevel )}}\n`;
    } else {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}: ${ref.id} ${ui.name}\n`;
    }

    // Determine if this UI copy should have a double border
    const allTransitionsSet = allTransitions[ ref.id ] || new Set();
    const fragmentTransitionsSet = fragmentTransitions[ fullKey ] || new Set();

    if( allTransitionsSet.size > 0 && allTransitionsSet.size === fragmentTransitionsSet.size ) {
        hierarchy += `${'  '.repeat( indentLevel )}${ref.id}.style.double-border: true\n`;
    }

    return hierarchy;
};

const RendererD2 = ( { data } ) => {
    const [ d2Output, setD2Output ] = useState( '' );
    const [ svgOutput, setSvgOutput ] = useState( '' );

    useEffect( () => {
        const d2Text = translateToD2( data );
        setD2Output( d2Text );

        // Fetch the rendered SVG from your API or rendering tool
        // Replace this URL with your actual API endpoint
        fetch( 'http://localhost:5000/render', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify( { d2: d2Text } ),
        } )
            .then( response => response.text() )
            .then( svg => setSvgOutput( svg ) )
            .catch( err => console.error( 'Error fetching SVG:', err ) );
    }, [ data ] );

    const copyToClipboard = () => {
        navigator.clipboard.writeText( d2Output ).then( () => {
            const copyMessage = document.getElementById( 'copyMessage' );
            copyMessage.style.visibility = 'visible';
            setTimeout( () => {
                copyMessage.style.visibility = 'hidden';
            }, 2000 );
        } ).catch( err => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    return (
        <div style={ { padding: '16px', backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '4px' } }>
            <button
                onClick={ copyToClipboard }
                style={ {
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: '#ffffff', // white background
                    color: '#000000', // black text
                    border: '1px solid #000000',
                    borderRadius: '4px',
                    cursor: 'pointer'
                } }
            >
                Copy to Clipboard
            </button>
            <span id="copyMessage" style={ { marginLeft: '10px', visibility: 'hidden' } }>Copied to clipboard!</span>
            <pre>{ d2Output }</pre>
            <div dangerouslySetInnerHTML={ { __html: svgOutput } } />
        </div>
    );
};

export default RendererD2;
