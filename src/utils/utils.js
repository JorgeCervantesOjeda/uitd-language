
// Utility function to get the innermost UI string from a UI reference string
export const getInnermostUIStr = ( uiRefStr ) => {
    const parts = uiRefStr.split( /[\(\)]+/ );
    return parts[ parts.length - 1 ] === '' ? parts[ parts.length - 2 ] : parts[ parts.length - 1 ];
};

// Recursively get the innermost UI reference ID
export function getInnermostUIRef( uiRef ) {
    if( uiRef.nested && uiRef.nested.length > 0 ) {
        return getInnermostUIRef( uiRef.nested[ uiRef.nested.length - 1 ] );
    }
    return uiRef.id;
}

// Format UI reference into a string
export const formatUIRef = ( uiRef ) => {
    if( uiRef.nested.length > 0 ) {
        return `${uiRef.id}(${uiRef.nested.map( nestedRef => formatUIRef( nestedRef ) ).join( ',' )})`;
    }
    return uiRef.id;
};

// Debounce function to limit the rate at which a function can fire
export const debounce = ( func, delay ) => {
    let timeoutId;
    return ( ...args ) => {
        clearTimeout( timeoutId );
        timeoutId = setTimeout( () => {
            func( ...args );
        }, delay );
    };
};
