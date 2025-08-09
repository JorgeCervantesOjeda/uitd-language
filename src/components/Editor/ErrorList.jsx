// src/components/Editor/ErrorList.jsx
import React from 'react';
import '../../App.css';
import ErrorItem from './ErrorItem';

const ErrorList = ( { errors, onErrorHover, onErrorClick } ) => {
    if( !errors || errors.length === 0 ) {
        return (
            <div className="error-list">
                <div className="no-errors">No errors to display.</div>
            </div>
        );
    }
    return (
        <div className="error-list">
            { errors.map( ( err, i ) => (
                <ErrorItem
                    key={ i }
                    messages={ err.messages }
                    severity={ err.severity }
                    lineNumber={ err.lineNumber || err.startLineNumber }
                    columnNumber={ err.columnNumber }
                    onErrorHover={ onErrorHover }
                    onErrorClick={ onErrorClick }
                />
            ) ) }
        </div>
    );
};

export default ErrorList;
