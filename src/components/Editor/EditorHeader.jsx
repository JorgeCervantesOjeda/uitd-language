import React from 'react';
import FileMenu from './menus/FileMenu.jsx';
import EditMenu from './menus/EditMenu.jsx';

const EditorHeader = ( {
    showErrors,
    setShowErrors,
    handleFormatCode,
    fileInputRef,
    setLastSaved,
    setIsModified,
    setMessage,
    uitdlText,
    onChange
} ) => {
    return (
        <div className="editor-header">
            <div style={ { color: 'lightgreen', width: '100px' } }>UITD Language</div>
            <div className="menu-container">
                <FileMenu
                    fileInputRef={ fileInputRef }
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
                <button className="renderer-button" style={ { borderColor: 'red' } } onClick={ () => setShowErrors( !showErrors ) }>
                    { showErrors ? 'Hide' : 'Show' } Errors
                </button>
            </div>
        </div>
    );
};

export default EditorHeader;
