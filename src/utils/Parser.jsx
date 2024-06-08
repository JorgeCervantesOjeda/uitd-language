export const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

export const parseUIRefList = ( text ) => {
    const refs = [];
    let currentRef = '';
    let nestedText = '';
    let braceCount = 0;

    console.log( 'Parsing UIRefList from text:', text );

    for( let i = 0; i < text.length; i++ ) {
        const char = text[ i ];

        if( char === '(' ) {
            braceCount++;
            if( braceCount === 1 ) {
                currentRef = currentRef.trim();
                continue;
            }
        } else if( char === ')' ) {
            braceCount--;
            if( braceCount === 0 ) {
                refs.push( {
                    id: currentRef.trim(),
                    nested: parseUIRefList( nestedText )
                } );
                console.log( 'Nested UIRefList:', nestedText );
                currentRef = '';
                nestedText = '';
                continue;
            }
        }

        if( braceCount > 0 ) {
            nestedText += char;
        } else if( char === ',' ) {
            if( braceCount === 0 ) {
                refs.push( { id: currentRef.trim(), nested: [] } );
                currentRef = '';
            } else {
                nestedText += char;
            }
        } else {
            currentRef += char;
        }
    }

    if( currentRef.trim() !== '' ) {
        refs.push( { id: currentRef.trim(), nested: [] } );
    }

    console.log( 'Extracted UIRefs:', refs );
    return refs;
};

export const parseUITDL = ( text ) => {
    const lines = text.split( '\n' );
    const result = {
        name: '',
        uis: [],
        fragments: [],
        errors: [],
    };
    let currentSection = null;
    let currentUI = null;
    let braceStack = [];

    console.log( 'Starting parse of UITDL' );

    lines.forEach( ( line, index ) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();

        try {
            console.log( `Parsing line ${lineNumber}:`, trimmedLine );

            if( !trimmedLine ) {
                // Do nothing
            } else if( trimmedLine === '}' ) {
                let popped = braceStack.pop();
                console.log( 'Exited section', popped );
                currentSection = braceStack[ braceStack.length - 1 ];
                if( braceStack.length === 0 ) {
                    currentSection = null;
                    currentUI = null;
                }
            } else if( currentSection == null ) {
                if( trimmedLine.startsWith( 'UITD' ) ) {
                    const match = trimmedLine.match( /^UITD\s+"([^"]+)"\s*{\s*$/ );
                    if( !match ) {
                        throw new Error( `Invalid UITD declaration` );
                    }
                    result.name = match[ 1 ];
                    currentSection = 'uitd';
                    braceStack.push( 'uitd' );
                    console.log( 'Entered UITD section' );

                } else {
                    throw new Error( `Invalid syntax at line ${lineNumber}. All content must be inside UITD "name" {` );
                }
            } else if( currentSection == 'uitd' ) {
                if( trimmedLine.startsWith( 'UI' ) ) {
                    const uiMatch = trimmedLine.match( /^UI\s+(\d+)\s+"([^"]+)"\s+actions\s*{\s*$/ );
                    if( !uiMatch ) {
                        throw new Error( `Invalid UI declaration` );
                    }
                    currentUI = parseInt( uiMatch[ 1 ], 10 );
                    result.uis.push( { id: currentUI, name: uiMatch[ 2 ], actions: [], lineNumber: lineNumber } );
                    currentSection = 'ui';
                    braceStack.push( 'ui' );
                    console.log( 'Entered UI section:', currentUI );
                } else if( trimmedLine.startsWith( 'FRAGMENT' ) ) {
                    if( !trimmedLine.match( /^FRAGMENT\s+"[^"]+"\s*{\s*$/ ) ) {
                        throw new Error( `Invalid FRAGMENT declaration` );
                    }
                    result.fragments.push( { name: trimmedLine.match( /^FRAGMENT\s+"([^"]+)"/ )[ 1 ], draws: [], transitions: [], lineNumber: lineNumber } );
                    currentSection = 'fragment';
                    braceStack.push( 'fragment' );
                    console.log( 'Entered FRAGMENT section' );
                } else {
                    throw new Error( `Invalid placement of content. Only UI or FRAGMENT sections allowed here.` );
                }
            } else if( currentSection == 'ui' ) {
                if( validVerbs.some( verb => trimmedLine.startsWith( verb ) ) ) {
                    const actionMatch = trimmedLine.match( new RegExp( `^(${validVerbs.join( '|' )})\\s+"([^"]+)"` ) );
                    if( !actionMatch ) {
                        throw new Error( `Invalid action declaration` );
                    }
                    result.uis.find( ui => ui.id === currentUI ).actions.push( { verb: actionMatch[ 1 ], target: actionMatch[ 2 ], lineNumber: lineNumber } );
                    console.log( 'Added action to UI', currentUI, ':', actionMatch[ 1 ], actionMatch[ 2 ] );
                } else {
                    throw new Error( `Only actions are allowed here` );
                }
            } else if( currentSection == 'fragment' ) {
                if( trimmedLine.startsWith( 'DRAW' ) ) {
                    const drawMatch = trimmedLine.match( /^DRAW\s+(.+)/ );
                    if( drawMatch ) {
                        const uiRefs = parseUIRefList( drawMatch[ 1 ] );
                        result.fragments[ result.fragments.length - 1 ].draws.push( { uiRefs, lineNumber } );
                        console.log( 'Parsed DRAW statement:', uiRefs );
                    } else {
                        throw new Error( `Invalid DRAW declaration at line ${lineNumber}` );
                    }
                } else if( trimmedLine.startsWith( 'TRANSITION' ) ) {
                    const match = trimmedLine.match( /^TRANSITION\s+from\s+(\d+(\(\d+\))*)\s+to\s+(\d+(\(\d+\))*)\s+if\s+user\s+(\w+)\s+"([^"]+)"\s*(AND\s+"([^"]+)")?/ );
                    if( match ) {
                        result.fragments[ result.fragments.length - 1 ].transitions.push( {
                            from: match[ 1 ],
                            to: match[ 3 ],
                            action: match[ 5 ],
                            target: match[ 6 ],
                            condition: match[ 8 ] || '',
                            lineNumber: lineNumber
                        } );
                        console.log( 'Parsed TRANSITION statement:', result.fragments[ result.fragments.length - 1 ].transitions.slice( -1 )[ 0 ] );
                    } else {
                        throw new Error( `Invalid TRANSITION declaration at line ${lineNumber}. Correct format: TRANSITION from sourceUI to targetUI if user action "target" AND "condition"` );
                    }
                } else {
                    throw new Error( `Only DRAW or TRANSITION statements allowed here.` );
                }
            } else {
                if( currentSection === 'ui' || currentSection === 'fragment' ) {
                    throw new Error( `Invalid syntax at line ${lineNumber}. All content must be inside UITD "name" {` );
                }
            }
        } catch( e ) {
            console.error( 'Error:', e.message );
            result.errors.push( {
                startLineNumber: lineNumber,
                lineNumber: lineNumber,
                message: e.message,
                startColumn: 1,
                endColumn: 3
            } );
        }
    } );

    return result;
};

export const validateData = ( parsedData ) => {
    const markers = [];


    console.log( 'validating data' );
    // Check for UIs with no actions
    parsedData.uis.forEach( ui => {
        if( ui.actions.length === 0 ) {
            markers.push( {
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: ui.lineNumber,
                startColumn: 1,
                endLineNumber: ui.lineNumber,
                endColumn: 3,
                message: `UI ${ui.id} has no actions defined`,
            } );
        }
    } );

    parsedData.fragments.forEach( fragment => {
        const drawnUIs = new Set();
        const definedUIs = new Set( parsedData.uis.map( ui => ui.id.toString() ) );
        const processRef = ( ref, parentId = null, drawLineNumber ) => {
            if( parentId ) {
                drawnUIs.add( `${parentId}(${ref.id})` );
            } else {
                drawnUIs.add( ref.id );
            }
            if( ref.id != "" && !definedUIs.has( ref.id ) ) {
                markers.push( {
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: drawLineNumber,
                    startColumn: 1,
                    endLineNumber: drawLineNumber,
                    endColumn: 3,
                    message: `UI ${ref.id} is drawn but not defined`,
                } );
            }
            ref.nested.forEach( nestedRef => processRef( nestedRef, ref.id, drawLineNumber ) );
        };

        // Process each draw list
        fragment.draws.forEach( ( { uiRefs, lineNumber } ) => {
            uiRefs.forEach( ref => {
                processRef( ref, null, lineNumber );
            } );
        } );

        console.log( 'Drawn UIs:', Array.from( drawnUIs ) );

        fragment.transitions.forEach( transition => {
            const checkUI = ( uiRef ) => {
                if( !drawnUIs.has( uiRef ) ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: transition.lineNumber,
                        startColumn: 1,
                        endLineNumber: transition.lineNumber,
                        endColumn: 3,
                        message: `Undrawn UI referenced in transition: ${uiRef}`,
                    } );
                }
            };

            checkUI( transition.from );
            checkUI( transition.to );

            // Validate that transition actions are defined in the origin UI
            const originUI = parsedData.uis.find( ui => ui.id.toString() === transition.from.split( '(' )[ 0 ] );
            if( !originUI || !originUI.actions.some( action => action.verb === transition.action && action.target === transition.target ) ) {
                markers.push( {
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: transition.lineNumber,
                    startColumn: 1,
                    endLineNumber: transition.lineNumber,
                    endColumn: 3,
                    message: `Action "${transition.action} ${transition.target}" in transition is not defined in UI ${transition.from}`,
                } );
            }
        } );
    } );

    parsedData.uis.forEach( ui => {
        ui.actions.forEach( action => {
            const used = parsedData.fragments.some( fragment =>
                fragment.transitions.some( transition =>
                    transition.action === action.verb && transition.target === action.target
                )
            );
            if( !used ) {
                markers.push( {
                    severity: monaco.MarkerSeverity.Warning,
                    startLineNumber: action.lineNumber,
                    startColumn: 1,
                    endLineNumber: action.lineNumber,
                    endColumn: 3,
                    message: `Unused action: ${action.verb} "${action.target}"`,
                } );
            }
        } );
    } );

    console.log( 'Validation markers:', markers );
    return markers;
};
