const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

export const parseUITDL = ( text ) => {
    const lines = text.split( '\n' ).map( line => line.trim() );
    const result = {
        uitd: '',
        uis: {},
        fragments: []
    };

    let currentSection = null;
    let currentUI = null;
    let currentFragment = null;
    let insideUITD = false;

    const validateUIREF = ( uiref ) => {
        const stack = [];
        const tokens = uiref.replace( /[\{\},]/g, ' $& ' ).split( /\s+/ );
        for( let token of tokens ) {
            if( token.match( /^\d+$/ ) ) {
                continue;
            } else if( token === '{' ) {
                stack.push( '{' );
            } else if( token === '}' ) {
                if( stack.length === 0 || stack.pop() !== '{' ) {
                    throw new Error( `Mismatched braces in UIREF: ${uiref}` );
                }
            } else if( token === ',' ) {
                continue;
            } else {
                throw new Error( `Invalid token in UIREF: ${token}` );
            }
        }
        if( stack.length !== 0 ) {
            throw new Error( `Mismatched braces in UIREF: ${uiref}` );
        }
    };

    const validateTransitionAction = ( action ) => {
        const match = action.match( new RegExp( `^(${validVerbs.join( '|' )})\\s+"([^"]+)"\\s*(\\d+\\s+(milliseconds|seconds|minutes|hours|days|weeks))?$` ) );
        if( !match ) {
            throw new Error( `Invalid action format: ${action}` );
        }
    };

    const parseLine = ( line, lineNumber ) => {
        if( line.startsWith( 'UITD' ) ) {
            const match = line.match( /^UITD\s+"([^"]+)"\s*{/ );
            if( match ) {
                if( insideUITD ) {
                    throw new Error( `Invalid syntax at line ${lineNumber}. Nested UITD blocks are not allowed.` );
                }
                result.uitd = match[ 1 ];
                currentSection = 'uitd';
                insideUITD = true;
            } else {
                throw new Error( `Invalid UITD declaration at line ${lineNumber}. Correct format: UITD "title" {` );
            }
        } else if( insideUITD && line.startsWith( 'UI' ) ) {
            const match = line.match( /^UI\s+(\d+)\s+"([^"]+)"\s+actions\s*{/ );
            if( match ) {
                currentUI = match[ 1 ];
                result.uis[ currentUI ] = {
                    name: match[ 2 ],
                    actions: []
                };
                currentSection = 'ui';
            } else {
                throw new Error( `Invalid UI declaration at line ${lineNumber}. Correct format: UI id "name" actions {` );
            }
        } else if( insideUITD && currentSection === 'ui' && validVerbs.some( verb => line.startsWith( verb ) ) ) {
            const verbMatch = validVerbs.find( verb => line.startsWith( verb ) );
            const actionMatch = line.match( new RegExp( `^${verbMatch}\\s+"([^"]+)"` ) );
            if( actionMatch ) {
                result.uis[ currentUI ].actions.push( {
                    action: verbMatch,
                    target: actionMatch[ 1 ]
                } );
            } else {
                throw new Error( `Invalid action at line ${lineNumber}. Correct format: ${verbMatch} "target"` );
            }
        } else if( insideUITD && line.startsWith( 'FRAGMENT' ) ) {
            const match = line.match( /^FRAGMENT\s+"([^"]+)"\s*{/ );
            if( match ) {
                currentFragment = match[ 1 ];
                result.fragments.push( {
                    name: match[ 1 ],
                    draw: [],
                    transitions: []
                } );
                currentSection = 'fragment';
            } else {
                throw new Error( `Invalid FRAGMENT declaration at line ${lineNumber}. Correct format: FRAGMENT "name" {` );
            }
        } else if( insideUITD && currentSection === 'fragment' && line.startsWith( 'DRAW' ) ) {
            const match = line.match( /^DRAW\s+(.+)/ );
            if( match ) {
                const drawItems = match[ 1 ].split( ',' ).map( item => item.trim() );
                try {
                    drawItems.forEach( item => validateUIREF( item ) );
                } catch( error ) {
                    throw new Error( `Invalid DRAW declaration at line ${lineNumber}. ${error.message}` );
                }
                result.fragments[ result.fragments.length - 1 ].draw = drawItems;
            } else {
                throw new Error( `Invalid DRAW declaration at line ${lineNumber}. Correct format: DRAW ui_refs` );
            }
        } else if( insideUITD && currentSection === 'fragment' && line.startsWith( 'TRANSITION' ) ) {
            const match = line.match( /^TRANSITION\s+from\s+(\d+)\s+to\s+(\d+)\s+if\s+user\s+(\w+)\s+"([^"]+)"\s*(AND\s+"([^"]+)")?/ );
            if( match ) {
                const action = `${match[ 3 ]} "${match[ 4 ]}"`;
                validateTransitionAction( action );
                result.fragments[ result.fragments.length - 1 ].transitions.push( {
                    from: parseInt( match[ 1 ], 10 ),
                    to: parseInt( match[ 2 ], 10 ),
                    action: match[ 3 ],
                    target: match[ 4 ],
                    condition: match[ 6 ] || ''
                } );
            } else {
                throw new Error( `Invalid TRANSITION declaration at line ${lineNumber}. Correct format: TRANSITION from sourceUI to targetUI if user action "target" AND "condition"` );
            }
        } else if( line === '}' ) {
            if( insideUITD ) {
                if( currentSection === 'ui' ) {
                    currentUI = null;
                    currentSection = 'uitd';
                } else if( currentSection === 'fragment' ) {
                    currentFragment = null;
                    currentSection = 'uitd';
                } else {
                    insideUITD = false;
                }
            }
        } else if( line !== '' && !insideUITD && !line.startsWith( 'UITD' ) ) {
            throw new Error( `Invalid syntax at line ${lineNumber}. All content must be inside UITD "name" {` );
        } else if( insideUITD && currentSection !== 'ui' && currentSection !== 'fragment' && validVerbs.some( verb => line.startsWith( verb ) ) ) {
            throw new Error( `Invalid action at line ${lineNumber}. Actions must be inside UI blocks.` );
        } else if( insideUITD && currentSection === 'uitd' && ( line.startsWith( 'TRANSITION' ) || line.startsWith( 'DRAW' ) ) ) {
            throw new Error( `Invalid syntax at line ${lineNumber}. Transitions and Draws must be inside FRAGMENT blocks.` );
        } else if( insideUITD && currentSection === 'ui' && !line.startsWith( '}' ) && !validVerbs.some( verb => line.startsWith( verb ) ) ) {
            throw new Error( `Invalid UI action at line ${lineNumber}. Actions must be valid.` );
        } else if( insideUITD && currentSection === 'fragment' && !line.startsWith( 'DRAW' ) && !line.startsWith( 'TRANSITION' ) && !line.startsWith( '}' ) && !line.startsWith( 'EXTEND' ) && !line.startsWith( 'PUT' ) ) {
            throw new Error( `Invalid FRAGMENT content at line ${lineNumber}. Content must be valid.` );
        }
    };

    lines.forEach( ( line, index ) => parseLine( line, index + 1 ) );

    return result;
};
