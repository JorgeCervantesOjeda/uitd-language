export const calculateUIHeight = ( uiRef, uis, GAP, MIN_HEIGHT ) => {
    const ui = uis.find( u => u.id.toString() === uiRef.id );
    const textHeight = 20;
    const nestedUIs = uiRef.nested || [];

    if( nestedUIs.length === 0 ) return MIN_HEIGHT;

    let nestedHeight = GAP;
    nestedUIs.forEach( nestedUI => {
        const nestedUIHeight = calculateUIHeight( nestedUI, uis, GAP, MIN_HEIGHT );
        nestedHeight += nestedUIHeight + GAP;
    } );

    return Math.max( MIN_HEIGHT, nestedHeight + textHeight );
};

export const calculateUIWidth = ( uiRef, uis, GAP, MIN_WIDTH, getTextWidth ) => {
    const ui = uis.find( u => u.id.toString() === uiRef.id );
    if( !ui ) return MIN_WIDTH;
    const text = `${uiRef.id} ${ui.name}`;
    const textWidth = getTextWidth( text ) + 20;
    const nestedUIs = uiRef.nested || [];

    if( nestedUIs.length === 0 ) return textWidth;
    let nestedWidth = 0;
    nestedUIs.forEach( nestedUI => {
        const nestedUIWidth = calculateUIWidth( nestedUI, uis, GAP, MIN_WIDTH, getTextWidth );
        nestedWidth = Math.max( nestedWidth, nestedUIWidth + GAP * 2 );
    } );

    return Math.max( textWidth, nestedWidth );
};

export const resolveNestedPosition = ( uiRefId, uiPositions ) => {
    if( !uiRefId.includes( '(' ) ) {
        return uiPositions[ uiRefId ];
    }

    const ids = uiRefId.split( '(' ).map( id => id.replace( ')', '' ) );
    let pos = uiPositions[ ids[ 0 ] ];

    for( let i = 1; i < ids.length; i++ ) {
        if( !pos || !pos.nested ) return null;
        pos = pos.nested.find( n => n.id === ids[ i ] );
    }

    return pos;
};
