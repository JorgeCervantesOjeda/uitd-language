import React from 'react';
import FileMenu from './menus/FileMenu.jsx';
import EditMenu from './menus/EditMenu.jsx';

const EditorHeader = ( {
    showErrors,
    setShowErrors,
    handleFormatCode,
    setLastSaved,
    setIsModified,
    setMessage,
    uitdlText,
    onChange
} ) => {
    return (
        <div className="renderer-header">
            <div className="language-label">UITD Language</div>
            <div className="menu-container">
                <FileMenu
                    setLastSaved={ setLastSaved }
                    setIsModified={ setIsModified }
                    setMessage={ setMessage }
                    uitdlText={ uitdlText }
                    onChange={ onChange }
                />
                <EditMenu
                    handleFormatCode={ handleFormatCode }
                    setMessage={ setMessage }
                    uitdlText={ uitdlText }
                    onChange={ onChange }
                />
                <button
                    className="renderer-button"
                    onClick={ () => setShowErrors( !showErrors ) }
                >
                    { showErrors ? 'Hide' : 'Show' } Errors
                </button>
            </div>
        </div>
    );
};

export default EditorHeader;
