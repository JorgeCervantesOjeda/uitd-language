const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes' ]; // Define your valid verbs here

export const parseUITDL = ( text ) => {
    const lines = text.split( '\n' );
    const result = {
        uitd: '',
        uis: {},
        fragments: []
    };

    let currentSection = null;
    let currentUI = null;

    lines.forEach( ( line ) => {
        const trimmedLine = line.trim();

        if( trimmedLine.startsWith( 'UITD' ) ) {
            const match = trimmedLine.match( /^UITD\s+"([^"]+)"\s*{/ );
            if( match ) {
                result.uitd = match[ 1 ];
                currentSection = 'uitd';
            }
        } else if( trimmedLine.startsWith( 'UI' ) ) {
            const match = trimmedLine.match( /^UI\s+(\d+)\s+"([^"]+)"\s+actions\s*{/ );
            if( match ) {
                currentUI = match[ 1 ];
                result.uis[ currentUI ] = {
                    name: match[ 2 ],
                    actions: []
                };
                currentSection = 'ui';
            }
        } else if( currentSection === 'ui' && validVerbs.some( ( verb ) => trimmedLine.startsWith( verb ) ) ) {
            const verbMatch = validVerbs.find( ( verb ) => trimmedLine.startsWith( verb ) );
            const actionMatch = trimmedLine.match( new RegExp( '^${verbMatch}\\s+"([^"]+)"' ) );
            if( actionMatch ) {
                result.uis[ currentUI ].actions.push( {
                    action: verbMatch,
                    target: actionMatch[ 1 ]
                } );
            }
        } else if( trimmedLine.startsWith( 'FRAGMENT' ) ) {
            const match = trimmedLine.match( /^FRAGMENT\s+"([^"]+)"\s*{/ );
            if( match ) {
                result.fragments.push( {
                    name: match[ 1 ],
                    draw: [],
                    transitions: []
                } );
                currentSection = 'fragment';
            }
        } else if( currentSection === 'fragment' && trimmedLine.startsWith( 'DRAW' ) ) {
            const match = trimmedLine.match( /^DRAW\s+(.+)/ );
            if( match ) {
                result.fragments[ result.fragments.length - 1 ].draw = match[ 1 ].split( ',' ).map( Number );
            }
        } else if( currentSection === 'fragment' && trimmedLine.startsWith( 'TRANSITION' ) ) {
            const match = trimmedLine.match( /^TRANSITION\s+from\s+(\d+)\s+to\s+(\d+)\s+if\s+user\s+(\w+)\s+"([^"]+)"\s*(AND\s+"([^"]+)")?/ );
            if( match ) {
                result.fragments[ result.fragments.length - 1 ].transitions.push( {
                    from: parseInt( match[ 1 ], 10 ),
                    to: parseInt( match[ 2 ], 10 ),
                    action: match[ 3 ],
                    target: match[ 4 ],
                    condition: match[ 6 ] || ''
                } );
            }
        }
    } );

    return result;
};
