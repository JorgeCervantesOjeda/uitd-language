export const getInnermostUIStr = ( uiRefStr ) => {
    const parts = uiRefStr.split( /[\(\)]+/ );
    return parts[ parts.length - 1 ] === '' ? parts[ parts.length - 2 ] : parts[ parts.length - 1 ];
};

export function getInnermostUIRef( uiRef ) {
    if( uiRef.nested && uiRef.nested.length > 0 ) {
        return getInnermostUIRef( uiRef.nested[ uiRef.nested.length - 1 ] );
    }
    return uiRef.id;
}

export const formatUIRef = ( uiRef ) => {
    if( uiRef.nested.length > 0 ) {
        return `${uiRef.id}(${uiRef.nested.map( nestedRef => formatUIRef( nestedRef ) ).join( ',' )})`;
    }
    return uiRef.id;
};

