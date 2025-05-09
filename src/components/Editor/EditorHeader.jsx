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
        const name = await onOpen();
        if( name ) displayMsg( `Se cargó "${name}".` );
    }, [ onOpen, displayMsg ] );

    const handleSaveFile = useCallback( async () => {
        const ok = await onSave();
        if( ok ) displayMsg( 'Archivo guardado con éxito.' );
    }, [ onSave, displayMsg ] );

    const toggleErrors = useCallback( () => setShowErrors( v => !v ), [] );

    return (
        <div>
            <div className="renderer-header">
                <div className="title">
                    { isModified && elapsed }
                </div>

                <div className="menu-container">
                    <FileMenu onOpen={ handleOpenFile } onSave={ handleSaveFile } displayTemporaryMessage={ displayMsg } />
                    <EditMenu
                        onCopyAll={ () => onCopyAll( displayMsg ) }
                        onPaste={ () => onPaste( displayMsg ) }
                        onFormat={ onFormat }
                        onLoadExample={ () => onLoadExample( displayMsg ) }
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
