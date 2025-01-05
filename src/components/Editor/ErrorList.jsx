import React from 'react';
import '../../App.css'; // Import the CSS file

const Error = ( { messages, severity } ) => {
    const className = `error ${severity === 'warning' ? 'error-warning' : 'error-error'}`;

    return (
        <div className={ className }>
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
        <div className="error-list">
            { errors.length === 0 ? (
                <div className="no-errors">
                    No errors to display.
                </div>
            ) : (
                errors.map( ( error, index ) => (
                    <Error key={ index } messages={ error.messages } severity={ error.severity } />
                ) )
            ) }
        </div>
    );
};

export default ErrorList;
