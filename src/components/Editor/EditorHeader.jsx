import React, { useState, useRef, useEffect, useCallback } from 'react';
import FileMenu from './menus/FileMenu';
import EditMenu from './menus/EditMenu';

function formatElapsed( ms ) {
    const sec = Math.floor( ms / 1000 );
    if( sec < 60 ) return `${sec}s`;
    const min = Math.floor( sec / 60 );
    if( min < 60 ) return `${min}m`;
    return `${Math.floor( min / 60 )}h`;
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
    setShowErrors,
} ) => {
    const [ message, setMessage ] = useState( '' );
    const timer = useRef( null );

    const displayMsg = useCallback( ( msg, duration = 5000 ) => {
        setMessage( msg );
        if( timer.current ) clearTimeout( timer.current );
        timer.current = setTimeout( () => setMessage( '' ), duration );
    }, [] );

    useEffect( () => () => {
        if( timer.current ) clearTimeout( timer.current );
    }, [] );

    const [ elapsed, setElapsed ] = useState( formatElapsed( Date.now() - lastSaved ) );
    useEffect( () => {
        setElapsed( formatElapsed( Date.now() - lastSaved ) );
        const iv = setInterval( () => {
            setElapsed( formatElapsed( Date.now() - lastSaved ) );
        }, 30_000 );
        return () => clearInterval( iv );
    }, [ lastSaved ] );

    const handleOpenFile = useCallback( async () => {
        displayMsg( 'Open File...' )
        const name = await onOpen();
        if( name )
            displayMsg( `Loaded: "${name}".` );
        else
            displayMsg( '' );
    }, [ onOpen, displayMsg ] );

    // dentro de EditorHeader.jsx
    const handleSaveFile = useCallback( async () => {
        displayMsg( 'Save File...' );
        // ¿estamos en el flujo nativo?
        const isNative = !!window.showSaveFilePicker;

        const ok = await onSave();
        // sólo para el caso nativo mostramos éxito
        if( ok && isNative ) 
            displayMsg( 'File Saved.' );
        else
            displayMsg( '' );
    }, [ onSave, displayMsg ] );

    // Si también quieres mover Load Example aquí (FileMenu):
    const handleLoadExampleFile = useCallback( async () => {
        displayMsg( 'Loading…' );
        await onLoadExample();
        displayMsg( 'Loaded example.' )
    }, [ onLoadExample ] );

    // Envuelve onCopyAll para disparar tu displayMsg
    const handleCopy = useCallback( async () => {
        await onCopyAll();
        displayMsg( 'Copied to clipboard!' );
    }, [ onCopyAll ] );

    // Envuelve onPaste
    const handlePaste = useCallback( async () => {
        await onPaste( );
        displayMsg( 'Clipboard pasted.' );
    }, [ onPaste ] );

    const toggleErrors = useCallback( () => setShowErrors( v => !v ), [] );

    return (
        <div>
            <div className="renderer-header">
                <div className="title">
                    { isModified && elapsed }
                </div>

                <div className="menu-container">
                    <FileMenu
                        onOpen={ handleOpenFile }
                        onSave={ handleSaveFile }
                        onLoadExample={ handleLoadExampleFile }
                    />
                    <EditMenu
                        onCopyAll={ handleCopy }
                        onPaste={ handlePaste }
                        onFormat={ onFormat }
                    />
                    <button className="renderer-button" onClick={ toggleErrors }>
                        { showErrors ? 'Hide' : 'Show' } Errors
                    </button>
                </div>
            </div>
            <div
                className="alert-message"
                style={ { '--message-bg': message ? 'darkred' : 'black' } }
            >
                { message || '\u00A0' }
            </div>
        </div>
    );
};

export default EditorHeader;
