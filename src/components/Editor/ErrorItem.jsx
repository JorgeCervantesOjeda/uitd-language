import React from 'react';
import '../../App.css';

/**
 * ErrorItem Component
 *
 * Props:
 * - messages: Array of message strings
 * - severity: "warning" | "error"
 * - lineNumber: Línea a la que saltar
 * - columnNumber: Columna a la que saltar
 * - onErrorHover: Handler para hover (lineNumber, column)
 * - onErrorClick: Handler para click (lineNumber, column)
 */
const ErrorItem = ( {
    messages,
    severity,
    lineNumber,
    columnNumber,
    onErrorHover,
    onErrorClick
} ) => (
    <div
        className={ `error ${severity === 'warning' ? 'error-warning' : 'error-error'}` }
        style={ { cursor: 'pointer', padding: '4px 8px', marginBottom: '2px' } }
        onMouseEnter={ () => onErrorHover( lineNumber, columnNumber ) }
        onClick={ () => onErrorClick( lineNumber, columnNumber ) }
        role="button"
        tabIndex={ 0 }
        onKeyDown={ e => {
            if( e.key === 'Enter' || e.key === ' ' ) {
                onErrorClick( lineNumber, columnNumber );
            }
        } }
    >
        { messages.map( ( msg, idx ) => (
            <div key={ idx } style={ { marginBottom: '1px' } }>
                { msg }
            </div>
        ) ) }
    </div>
);

export default ErrorItem;
