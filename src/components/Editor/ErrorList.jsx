import React from 'react';
import '../../App.css';

/**
 * ErrorItem Component
 * 
 * Props:
 * - messages: Array of message strings
 * - severity: Numeric severity
 * - lineNumber: Line to navigate to
 * - onErrorClick: Handler to invoke with lineNumber
 */
const ErrorItem = ( { messages, severity, lineNumber, columnNumber, onErrorClick } ) => (
    <div
        className={ `error ${severity === 'warning' ? 'error-warning' : 'error-error'}` }
        onClick={ () => {
            console.log( `▶️ clic en error — línea: ${lineNumber}, columna: ${columnNumber}` );
            onErrorClick( lineNumber, columnNumber );
        } }
        style={ { cursor: 'pointer', padding: '4px 8px', marginBottom: '2px' } }
    >
        { messages.map( ( msg, idx ) => (
            <div key={ idx } style={ { marginBottom: '1px' } }>
                { msg }
            </div>
        ) ) }
    </div>
);

/**
 * ErrorList Component
 * 
 * Props:
 * - errors: Array of error objects { messages, lineNumber, severity }
 * - onErrorClick: Function to call when an error is clicked
 */
const ErrorList = ( { errors, onErrorClick } ) => {
    console.log( 'errors', errors );
    if( !errors || errors.length === 0 ) {
        return (
            <div className="error-list">
                <div className="no-errors">No errors to display.</div>
            </div>
        );
    }

    return (
        <div className="error-list">
            { errors.map( ( err, index ) => (
                <ErrorItem
                    key={ index }
                    messages={ err.messages }
                    severity={ err.severity }
                    lineNumber={ err.lineNumber || err.startLineNumber }
                    columnNumber={err.columnNumber }
                    onErrorClick={ onErrorClick }
                />
            ) ) }
        </div>
    );
};

export default ErrorList;
