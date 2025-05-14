// src/components/Editor/EditorHeader.jsx
import React, { useState, useEffect, useCallback } from 'react';
import FileMenu from './menus/FileMenu';
import EditMenu from './menus/EditMenu';

function formatElapsed( ms ) {
    const sec = Math.floor( ms / 1000 );
    if( sec < 60 ) return `${sec} sec`;
    const min = Math.floor( sec / 60 );
    if( min < 60 ) return `${min} min`;
    return `${Math.floor( min / 60 )} hrs`;
}

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
    setShowErrors
} ) => {
    const [ message, setMessage ] = useState( '' );
    const displayMsg = useCallback( msg => setMessage( msg ), [] );

    useEffect( () => {
        if( isModified ) setMessage( '' );
    }, [ isModified ] );

    const [ elapsed, setElapsed ] = useState( formatElapsed( Date.now() - lastSaved ) );
    useEffect( () => {
        setElapsed( formatElapsed( Date.now() - lastSaved ) );
        const iv = setInterval( () => {
            setElapsed( formatElapsed( Date.now() - lastSaved ) );
        }, 5000 );
        return () => clearInterval( iv );
    }, [ lastSaved ] );

    const handleOpenFile = useCallback( async () => {
        displayMsg( 'Open File...' );
        const name = await onOpen();
        if( name ) displayMsg( `Loaded: "${name}".` );
        else displayMsg( '' );
    }, [ onOpen, displayMsg ] );

    const handleSaveFile = useCallback( async () => {
        displayMsg( 'Save File...' );
        const ok = await onSave();
        if( ok ) displayMsg( 'File Saved.' );
        else displayMsg( '' );
    }, [ onSave, displayMsg ] );

    const handleLoadExampleFile = useCallback( async () => {
        displayMsg( 'Loading…' );
        const name = await onLoadExample();
        if( name ) displayMsg( `Loaded: "${name}".` );
        else displayMsg( '' );
    }, [ onLoadExample, displayMsg ] );

    const handleCopy = useCallback( async () => {
        const ok = await onCopyAll();
        if( ok ) displayMsg( 'Copied to clipboard!' );
        else displayMsg( '' );
    }, [ onCopyAll, displayMsg ] );

    const handlePaste = useCallback( async () => {
        const ok = await onPaste();
        if( ok ) displayMsg( 'Clipboard pasted.' );
        else displayMsg( '' );
    }, [ onPaste, displayMsg ] );

    const handleFormat = useCallback( async () => {
        displayMsg( 'Formatting...' );
        const ok = await onFormat();
        if( ok ) displayMsg( 'Formatted.' );
        else displayMsg( '' );
    }, [ onFormat, displayMsg ] );

    const toggleErrors = useCallback( () => {
        setShowErrors( v => !v );
    }, [ setShowErrors ] );

    return (
        <div>
            <div className="renderer-header">
                <div className="title blinking">{ isModified && elapsed }</div>
                <div className="menu-container">
                    <FileMenu onOpen={ handleOpenFile } onSave={ handleSaveFile } onLoadExample={ handleLoadExampleFile } />
                    <EditMenu onCopyAll={ handleCopy } onPaste={ handlePaste } onFormat={ handleFormat } />
                    <button className="renderer-button" onClick={ toggleErrors }>
                        { showErrors ? 'Hide' : 'Show' } Errors
                    </button>
                </div>
            </div>
            <div className="alert-message" style={ { '--message-bg': message ? 'darkred' : 'black' } }>
                { message || '\u00A0' }
            </div>
        </div>
    );
};

export default EditorHeader;
