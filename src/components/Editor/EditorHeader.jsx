import React from 'react';
import DropdownMenu from './menus/DropdownMenu';

void DropdownMenu;

const typeStyles = {
    success: { color: '#43a047', bg: '#e8f5e9' },
    error: { color: '#c62828', bg: '#ffebee' },
    info: { color: '#1565c0', bg: '#e3f2fd' },
    warning: { color: '#f9a825', bg: '#fffde7' }
};

const EditorHeader = ( {
    isModified,
    lastSaved,
    onSave,
    onOpen,
    onCopyAll,
    onPaste,
    onFormat,
    onLoadExample,
    showErrors,
    setShowErrors,
    onCollapseAll,
    onExpandAll,
    onUndo,
    onRedo,
    statusMessage,
    fileName
} ) => {
    // Elapsed time solo para mostrar, no para mensajes
    const [ elapsed, setElapsed ] = React.useState( '' );
    React.useEffect(
 () => {
        const updateElapsed = () => {
            const ms = Date.now() - lastSaved;
            const sec = Math.floor( ms / 1000 );
            if( sec < 60 ) setElapsed( `${sec} sec` );
            else if( sec < 3600 ) setElapsed( `${Math.floor( sec / 60 )} min` );
            else setElapsed( `${Math.floor( sec / 3600 )} hrs` );
        };
        updateElapsed();
        const iv = setInterval(
            updateElapsed,
            5000
        );
        return () => clearInterval( iv );
    },
    [
        lastSaved
    ] 
);

    const toggleErrors = React.useCallback(
 () => {
        setShowErrors( v => !v );
    },
    [
        setShowErrors
    ] 
);

    const itemsFileMenu = [
        { label: 'Open…', onClick: onOpen },
        { label: 'Load Example', onClick: onLoadExample },
        { label: 'Save as…', onClick: onSave }
    ];

    const itemsEditMenu = [
        { label: 'Copy All', onClick: onCopyAll },
        { label: 'Paste', onClick: onPaste },
        { label: 'Format', onClick: onFormat }
    ];

    const style = statusMessage?.type ? typeStyles[ statusMessage.type ] || {} : {};

    return (
        <div>
            <div className="renderer-header">
                <div className="header-file-name">
                    { fileName || 'Untitled' }
                </div>
                <div className="title blinking">{ isModified && elapsed }</div>
                <div className="menu-container">
                    <DropdownMenu label="File" items={ itemsFileMenu } />
                    <DropdownMenu label="Edit" items={ itemsEditMenu } />
                    <button className="renderer-button" onClick={ onCollapseAll } title="Collapse all">
                        <span className="material-icons">unfold_less</span>
                    </button>
                    <button className="renderer-button" onClick={ onExpandAll } title="Expand all">
                        <span className="material-icons">unfold_more</span>
                    </button>
                    <button className="renderer-button" onClick={ onUndo } title="Undo">
                        <span className="material-icons">undo</span>
                    </button>
                    <button className="renderer-button" onClick={ onRedo } title="Redo">
                        <span className="material-icons">redo</span>
                    </button>
                    <button className="renderer-button" onClick={ toggleErrors } title={ showErrors ? "Hide errors" : "Show errors" }>
                        <span className="material-icons">{ showErrors ? "visibility_off" : "visibility" }</span>
                    </button>
                </div>
            </div>
            <div
                className="alert-message"
                style={ {
                    background: style.bg || 'var(--chrome-bg)',
                    color: style.color || 'var(--chrome-text)',
                } }
            >
                { statusMessage?.text || '\u00A0' }
            </div>
        </div>
    );
};

export default EditorHeader;
