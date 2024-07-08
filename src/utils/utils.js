export function getInnermostUI( uiRef ) {
    if( uiRef.nested && uiRef.nested.length > 0 ) {
        return getInnermostUI( uiRef.nested[ uiRef.nested.length - 1 ] );
    }
    return uiRef.id;
}

export const formatUIRef = ( uiRef ) => {
    if( uiRef.nested.length > 0 ) {
        return `${uiRef.id}(${uiRef.nested.map( nestedRef => formatUIRef( nestedRef ) ).join( ',' )})`;
    }
    return uiRef.id;
};

