export const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

export const parseUIRefList = ( text ) => {
    const refs = [];
    let currentRef = '';
    let nestedText = '';
    let braceCount = 0;

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
                if( currentRef.trim() !== '' ) {
                    refs.push( {
                        id: currentRef.trim(),
                        nested: parseUIRefList( nestedText ),
                        full: false
                    } );
                }
                currentRef = '';
                nestedText = '';
                continue;
            }
        }

        if( braceCount > 0 ) {
            nestedText += char;
        } else if( char === ',' ) {
            if( braceCount === 0 ) {
                if( currentRef.trim() !== '' ) {
                    refs.push( { id: currentRef.trim(), nested: [], full: false } );
                }
                currentRef = '';
            } else {
                nestedText += char;
            }
        } else {
            currentRef += char;
        }
    }

    if( currentRef.trim() !== '' ) {
        refs.push( { id: currentRef.trim(), nested: [], full: false } );
    }

    return refs;
};

const getInnermostUI = ( uiRef ) => {
    const parts = uiRef.split( /[\(\)]+/ );
    return parts[ parts.length - 1 ] === '' ? parts[ parts.length - 2 ] : parts[ parts.length - 1 ];
};

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

            const transitionStr = transition.from + '->' + transition.to + ':' + transition.action + ' "' + transition.target + '" ' + ( transition.condition ? 'AND\n(' + transition.condition + ')' : '' );
            uiTransitions[ fromUI ].add( transitionStr );
            uiTransitions[ toUI ].add( transitionStr );
        } );
    } );

    return uiTransitions;
};

const gatherFragmentTransitions = ( fragment ) => {
    const fragmentTransitions = {};

    fragment.transitions.forEach( transition => {
        const fromKey = transition.from;//.replace( /\(/g, '.' ).replace( /\)/g, '' );
        const toKey = transition.to;//.replace( /\(/g, '.' ).replace( /\)/g, '' );

        if( !fragmentTransitions[ fromKey ] ) {
            fragmentTransitions[ fromKey ] = new Set();
        }
        if( !fragmentTransitions[ toKey ] ) {
            fragmentTransitions[ toKey ] = new Set();
        }

        const transitionStr = transition.from + '->' + transition.to + ':' + transition.action + ' "' + transition.target + '" ' + ( transition.condition ? 'AND\n(' + transition.condition + ')' : '' );
        fragmentTransitions[ fromKey ].add( transitionStr );
        fragmentTransitions[ toKey ].add( transitionStr );
    } );

    return fragmentTransitions;
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

    lines.forEach( ( line, index ) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();

        try {
            if( !trimmedLine ) {
                // Do nothing for empty lines
            } else if( trimmedLine === '}' ) {
                let popped = braceStack.pop();
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
                } else if( trimmedLine.startsWith( 'FRAGMENT' ) ) {
                    const fragmentMatch = trimmedLine.match( /^FRAGMENT\s+"([^"]+)"\s*{\s*$/ );
                    if( !fragmentMatch ) {
                        throw new Error( `Invalid FRAGMENT declaration` );
                    }
                    result.fragments.push( { name: fragmentMatch[ 1 ], draws: [], transitions: [], lineNumber: lineNumber } );
                    currentSection = 'fragment';
                    braceStack.push( 'fragment' );
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
                } else {
                    throw new Error( `Only actions are allowed here` );
                }
            } else if( currentSection == 'fragment' ) {
                if( trimmedLine.startsWith( 'DRAW' ) ) {
                    const drawMatch = trimmedLine.match( /^DRAW\s+(.+)/ );
                    if( drawMatch ) {
                        const uiRefs = parseUIRefList( drawMatch[ 1 ] );
                        result.fragments[ result.fragments.length - 1 ].draws.push( { uiRefs, lineNumber } );
                    } else {
                        throw new Error( `Invalid DRAW declaration at line ${lineNumber}` );
                    }
                } else if( trimmedLine.startsWith( 'TRANSITION' ) ) {
                    const transitionMatch = trimmedLine.match( /^TRANSITION\s+from\s+(\d+(\(\d+\))*)\s+to\s+(\d+(\(\d+\))*)\s+if\s+user\s+(\w+)\s+"([^"]+)"\s*(AND\s+"([^"]+)")?/ );
                    if( transitionMatch ) {
                        result.fragments[ result.fragments.length - 1 ].transitions.push( {
                            from: transitionMatch[ 1 ],
                            to: transitionMatch[ 3 ],
                            action: transitionMatch[ 5 ],
                            target: transitionMatch[ 6 ],
                            condition: transitionMatch[ 8 ] || '',
                            lineNumber: lineNumber
                        } );
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

    // Gather all transitions for each UI in the entire UITD
    const allTransitions = gatherAllTransitions( result );

    // Process each fragment
    result.fragments.forEach( fragment => {
        const fragmentTransitions = gatherFragmentTransitions( fragment );

        const processRef = ( ref, parentId = null ) => {
            const refId = parentId ? `${parentId}(${ref.id})` : ref.id;

            // Determine if this UI copy should be marked as full
            const innermostId = getInnermostUI( refId );
            const allTransitionsSet = allTransitions[ innermostId ] || new Set();
            const fragmentTransitionsSet = fragmentTransitions[ refId ] || new Set();

            if( allTransitionsSet.size > 0 && allTransitionsSet.size === fragmentTransitionsSet.size ) {
                ref.full = true;
            } else {
                ref.full = false;
            }

            ref.nested.forEach( nestedRef => processRef( nestedRef, ref.id ) );
        };

        // Process each draw list
        fragment.draws.forEach( ( { uiRefs } ) => {
            uiRefs.forEach( ref => {
                processRef( ref, null );
            } );
        } );
    } );

    return result;
};

export const validateData = ( parsedData ) => {
    const markers = [];
    const uiNames = new Set();
    const fragmentNames = new Set();

    // Check for UIs with no actions and duplicate UI names
    parsedData.uis.forEach( ui => {
        if( ui.actions.length === 0 ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: ui.lineNumber,
                startColumn: 1,
                endLineNumber: ui.lineNumber,
                endColumn: 3,
                message: `UI ${ui.id} has no actions defined`,
            } );
        }
        if( uiNames.has( ui.name ) ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: ui.lineNumber,
                startColumn: 1,
                endLineNumber: ui.lineNumber,
                endColumn: 3,
                message: `Duplicate UI name: ${ui.name}`,
            } );
        } else {
            uiNames.add( ui.name );
        }
    } );

    // Check for duplicate fragment names
    parsedData.fragments.forEach( fragment => {
        if( fragmentNames.has( fragment.name ) ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: fragment.lineNumber,
                startColumn: 1,
                endLineNumber: fragment.lineNumber,
                endColumn: 3,
                message: `Duplicate fragment name: ${fragment.name}`,
            } );
        } else {
            fragmentNames.add( fragment.name );
        }
    } );

    // Check if there are undrawn UIs referenced in transitions
    parsedData.fragments.forEach( fragment => {
        const drawnUIs = new Set();

        const collectDrawnUIs = ( ref ) => {
            drawnUIs.add( ref.id );
            ref.nested.forEach( nestedRef => collectDrawnUIs( nestedRef ) );
        };

        fragment.draws.forEach( ( { uiRefs } ) => {
            uiRefs.forEach( ref => {
                collectDrawnUIs( ref );
            } );
        } );

        fragment.transitions.forEach( transition => {
            const checkUI = ( uiRef ) => {
                const innermostId = getInnermostUI( uiRef );
                if( !drawnUIs.has( innermostId ) ) {
                    markers.push( {
                        severity: 'Error',
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
            const originUI = parsedData.uis.find( ui => ui.id.toString() === getInnermostUI( transition.from ) );
            if( !originUI || !originUI.actions.some( action => action.verb === transition.action && action.target === transition.target ) ) {
                markers.push( {
                    severity: 'Error',
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
                    severity: 'Warning',
                    startLineNumber: action.lineNumber,
                    startColumn: 1,
                    endLineNumber: action.lineNumber,
                    endColumn: 3,
                    message: `Unused action: ${action.verb} "${action.target}"`,
                } );
            }
        } );
    } );

    return markers;
};
