import React from 'react';

const Error = ( { messages, severity } ) => {
    const borderColor = severity === 'warning' ? 'yellow' : 'red';
    return (
        <div style={ {
            backgroundColor: 'black',
            color: 'white',
            border: `1px solid ${borderColor}`,
            padding: '2px 8px',
            borderRadius: '3px',
            marginBottom: '5px',
            whiteSpace: 'pre-wrap',
        } }>
            { messages.map( ( msg, index ) => (
                <div key={ index } style={ { marginBottom: '1px' } }>
                    { msg }
                </div>
            ) ) }
        </div>
    );
};

const ErrorList = ( { errors } ) => {
    return (
        <div style={ { padding: '10px', overflowY: 'auto' } }>
            { errors.map( ( error, index ) => (
                <Error key={ index } messages={ error.messages } severity={ error.severity } />
            ) ) }
        </div>
    );
};

export default ErrorList;
