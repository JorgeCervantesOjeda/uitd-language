// UITDRendererText.jsx
import React from 'react';

const RendererParsed = ( { data } ) => {
    if( !data ) {
        return <p>No data available</p>;
    }

    return (
        <div>
            <h2>UITD Description</h2>
            <pre>{ JSON.stringify( data, null, 2 ) }</pre>
        </div>
    );
};

export default RendererParsed;
