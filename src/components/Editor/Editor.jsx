// src/components/Editor/Editor.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import EditorHeader from './EditorHeader';
import ErrorListPortal from './ErrorListPortal';
import handleFormatCode from './utils/formatCode';
import setErrors from './utils/setErrors';
import { setupMonaco } from './utils/monacoSetup';
import '../../App.css';
import { debounce } from 'lodash';
import { saveAs } from 'file-saver';
import {ExampleUITD } from './utils/ExampleUITD';

const STORAGE_KEY = 'uitdlContent';

const Editor = ( { uitdlText, onChange, markers } ) => {

    // Referencias
    const editorRef = useRef( null );
    const markersRef = useRef( markers );

    // Estados principales
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ firstModifiedAt, setFirstModifiedAt ] = useState( null );
    const [ isModified, setIsModified ] = useState( false );
    const [ errors, setErrorsState ] = useState( [] );
    const [ showErrors, setShowErrors ] = useState( false );
    const [ localText, setLocalText ] = useState( uitdlText );
    const [ fileHandle, setFileHandle ] = useState( null ); // NUEVO: guarda el fileHandle del archivo abierto/guardado
    const [ statusMessage, setStatusMessage ] = useState( null ); // antes autosaveMsg

    // Centraliza la lógica de mostrar mensajes
    const displayMsg = useCallback( ( msg, type = 'info', duration = 2000 ) => {
        setStatusMessage( { text: msg, type } );
        setTimeout( () => setStatusMessage( null ), duration );
    }, [] );

    // Devuelve “1 day 2 hours 3 minutes 4 seconds” según ms
    const formatElapsed = () => {
        const ms = firstModifiedAt
            ? Date.now() - firstModifiedAt
            : '0 seconds';

        const secsTotal = Math.floor( ms / 1000 );
        const days = Math.floor( secsTotal / 86400 );
        const hours = Math.floor( ( secsTotal % 86400 ) / 3600 );
        const minutes = Math.floor( ( secsTotal % 3600 ) / 60 );
        const seconds = secsTotal % 60;
        const parts = [];
        if( days ) parts.push( `${days} day${days > 1 ? 's' : ''}` );
        if( hours ) parts.push( `${hours} hour${hours > 1 ? 's' : ''}` );
        if( minutes ) parts.push( `${minutes} minute${minutes > 1 ? 's' : ''}` );
        if( seconds ) parts.push( `${seconds} second${seconds > 1 ? 's' : ''}` );
        return parts.join( ' ' );
    };

    // ─── Función centralizada para actualizar el contenido ───
    // text: nuevo contenido
    // contentAlreadySaved: true si viene de guardar/abrir/cargar ejemplo
    const updateContent = useCallback(
        ( text, contentAlreadySaved = false ) => {
            // 1) Actualizar texto en el editor
            setLocalText( text );
            // 2) Marcar como modificado sólo si NO está ya guardado
            setIsModified( !contentAlreadySaved );
            // Solo fijar el primer modificado si es la primera edición tras guardar
            if( !contentAlreadySaved ) {
                setFirstModifiedAt( prev => prev ?? Date.now() );
            }
            // 4) Notificar cambio al padre
            onChange( text );
            // —– Se ha eliminado la escritura directa a localStorage aquí —–
        },
        [ onChange ]
    );

    // Debounce SOLO para persistencia en localStorage (antes hacía doble persistencia)
    const debouncedOnChange = useCallback(
        debounce( ( value ) => {
            localStorage.setItem( STORAGE_KEY, value );
        }, 500 ),
        []
    );

    // ─── Cancelar debounce al desmontar ───
    useEffect( () => {
        return () => {
            debouncedOnChange.cancel();
        };
    }, [ debouncedOnChange ] );

    const handleEditorChange = useCallback(
        ( value ) => {
            // 1) Estado inmediato y notificación
            updateContent( value );
            // 2) Persistencia diferida (debounced)
            debouncedOnChange( value );
        },
        [ updateContent, debouncedOnChange ]
    );

    // Al montar, cargar desde localStorage si existe
    useEffect( () => {
        const saved = localStorage.getItem( STORAGE_KEY );
        if( saved ) {
            updateContent( saved, true );
        }
    }, [ updateContent ] );

    // Cuando cambian los marcadores, actualizar lista de errores
    useEffect( () => {
        markersRef.current = markers;
        if( editorRef.current ) {
            setErrors( editorRef.current, markersRef.current, setErrorsState );
        }
    }, [ markers ] );

    // Doble plegado de código (niveles 2 y 3)
    const collapseAll = () => {
        setTimeout( () => {
            editorRef.current.trigger( 'keyboard', 'editor.foldLevel2', {} );
            editorRef.current.trigger( 'keyboard', 'editor.foldLevel3', {} );
        }, 500 );
    };

    // Al montar el Monaco Editor
    const handleEditorDidMount = useCallback( ( editor ) => {
        editorRef.current = editor;
        setErrors( editor, markersRef.current, setErrorsState );
        collapseAll();
    }, [] );

    // Hover sobre errores: centra el cursor en esa línea
    const handleErrorHover = useCallback( ( lineNumber, column = 1 ) => {
        const editor = editorRef.current;
        if( editor ) {
            editor.setPosition( { lineNumber, column } );
            editor.revealPositionInCenter( { lineNumber, column } );
        }
    }, [] );

    // Click en error: oculta la lista y enfoca el editor
    const handleErrorClick = useCallback( ( lineNumber, column = 1 ) => {
        setShowErrors( false );
        const editor = editorRef.current;
        if( editor ) {
            editor.setPosition( { lineNumber, column } );
            editor.revealPositionInCenter( { lineNumber, column } );
            editor.focus();
        }
    }, [] );

    // ─── Lógica de “loading” para resaltar botones ───
    const [ loading, setLoading ] = useState( {
        open: false,
        save: false,
        example: false,
        copy: false,
        paste: false,
        format: false,
    } );
    const wrapLoading = useCallback( ( key, fn ) => {
        return async ( ...args ) => {
            setLoading( l => ( { ...l, [ key ]: true } ) );
            try {
                return await fn( ...args );
            } finally {
                setLoading( l => ( { ...l, [ key ]: false } ) );
            }
        };
    }, [] );

    // ─── Handlers de archivo ───

    // Guardar archivo
    const handleSave = useCallback(
        wrapLoading( 'save', async () => {
            try {
                let ok = false;
                let fileName = 'file';
                if( window.showSaveFilePicker ) {
                    const handle = await window.showSaveFilePicker( {
                        suggestedName: '_.uitd',
                        types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                    } );
                    setFileHandle( handle );
                    fileName = handle.name || 'file';
                    const writable = await handle.createWritable();
                    await writable.write( localText );
                    await writable.close();
                    ok = true;
                } else {
                    const blob = new Blob( [ localText ], { type: 'text/plain;charset=utf-8' } );
                    saveAs( blob, '_.uitd' );
                    fileName = '_.uitd';
                    await new Promise( resolve => {
                        const onFocus = () => {
                            window.removeEventListener( 'focus', onFocus );
                            resolve();
                        };
                        window.addEventListener( 'focus', onFocus );
                    } );
                    setFileHandle( null );
                    ok = true;
                }
                if( ok ) {
                    updateContent( localText, true );
                    setLastSaved( Date.now() );
                    setFirstModifiedAt( null ); // <-- borra el contador al guardar
                    displayMsg( `Saved to local file: ${fileName}`, 'success' );
                }
                return ok;
            } catch( err ) {
                if( err.name !== 'AbortError' ) console.error( err );
                displayMsg( 'Could not save the file.', 'error' );
                return false;
            }
        } ),
        [ localText, updateContent, wrapLoading, displayMsg ]
    );

    // Abrir archivo
    const handleOpen = useCallback(
        wrapLoading( 'open', async () => {
            if( isModified ) {
                const discard = window.confirm( `You have unsaved changes (elapsed: ${formatElapsed()}).\n\nDiscard and open another file?` );
                if( !discard ) return null;
            }
            try {
                let fileName, text;
                if( window.showOpenFilePicker ) {
                    const [ handle ] = await window.showOpenFilePicker( {
                        types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                        multiple: false,
                    } );
                    setFileHandle( handle );
                    const file = await handle.getFile();
                    fileName = file.name;
                    text = await file.text();
                } else {
                    text = await new Promise( ( resolve, reject ) => {
                        const input = document.createElement( 'input' );
                        input.type = 'file';
                        input.accept = '.uitd,text/plain';
                        input.style.display = 'none';
                        document.body.appendChild( input );
                        input.onchange = async e => {
                            try {
                                const chosen = e.target.files[ 0 ];
                                if( !chosen ) {
                                    reject( new Error( 'No file selected' ) );
                                    return;
                                }
                                fileName = chosen.name;
                                const content = await chosen.text();
                                resolve( content );
                            } catch( err ) {
                                reject( err );
                            } finally {
                                document.body.removeChild( input );
                            }
                        };
                        input.click();
                    } );
                    setFileHandle( null );
                }
                updateContent( text, true );
                collapseAll();
                if( fileName ) displayMsg( `Opened file: ${fileName}`, 'info' );
                return fileName;
            } catch( err ) {
                if( err.name !== 'AbortError' ) console.error( err );
                displayMsg( 'Could not open the file.', 'error' );
                return null;
            }
        } ),
        [ isModified, updateContent, wrapLoading, displayMsg ]
    );

    // Cargar ejemplo
    const handleLoadExample = useCallback(
        wrapLoading( 'example', async () => {
            if( isModified ) {
                const discard = window.confirm( `You have unsaved changes (elapsed: ${formatElapsed()}).\n\nDiscard and load the example?` );
                if( !discard ) return null;
            }
            updateContent( ExampleUITD, true );
            collapseAll();
            displayMsg( 'Example loaded.', 'info' );
            return 'ExampleUITD';
        } ),
        [ isModified, updateContent, wrapLoading, displayMsg ]
    );

    // ─── Handlers de edición ───

    // Copiar todo
    const handleCopyAll = useCallback(
        wrapLoading( 'copy', async () => {
            try {
                await navigator.clipboard.writeText( localText );
                return true;
            } catch( err ) {
                console.error( err );
                return false;
            }
        } ),
        [ localText, wrapLoading ]
    );

    const handleCollapseAll = () => {
        if( editorRef.current ) {
            editorRef.current.getAction( 'editor.foldAll' ).run();
        }
    };

    const handleExpandAll = () => {
        if( editorRef.current ) {
            editorRef.current.getAction( 'editor.unfoldAll' ).run();
        }
    };

    const handleUndo = () => {
        if( editorRef.current ) {
            editorRef.current.trigger( '', 'undo', null );
        }
    };

    const handleRedo = () => {
        if( editorRef.current ) {
            editorRef.current.trigger( '', 'redo', null );
        }
    };

    // AUTOSAVE: guarda en localStorage y en archivo local si hay fileHandle
    const debouncedAutosave = useCallback(
        debounce( async ( value ) => {
            localStorage.setItem( STORAGE_KEY, value );
            if( fileHandle ) {
                try {
                    const writable = await fileHandle.createWritable();
                    await writable.write( value );
                    await writable.close();
                    const fileName = fileHandle.name || 'file';
                    displayMsg( `Saved to local file: ${fileName}`, 'success' );
                    setLastSaved( Date.now() );
                    setFirstModifiedAt( null );
                    setIsModified( false );
                } catch( err ) {
                    displayMsg( 'Could not save the file to your computer.', 'error' );
                }
            } else {
                displayMsg( 'Saved in browser (localStorage).', 'info' );
            }
        }, 5000 ),
        [ fileHandle, displayMsg ]
    );

    useEffect( () => {
        if( localText !== undefined ) {
            debouncedAutosave( localText );
        }
        return () => debouncedAutosave.cancel();
    }, [ localText, debouncedAutosave ] );

    const handleCopy = useCallback( async () => {
        const ok = await handleCopyAll();
        if( ok ) {
            displayMsg( 'Copied to clipboard!', 'success' );
        } else {
            displayMsg( 'Error copying', 'error' );
        }
    }, [ handleCopyAll, displayMsg ] );

    // Añade esta función antes de usar handlePaste
    const handlePasteFromClipboard = useCallback( async () => {
        try {
            const text = await navigator.clipboard.readText();
            if( text ) {
                updateContent( text );
                return true;
            }
            return false;
        } catch( err ) {
            console.error( err );
            return false;
        }
    }, [ updateContent ] );

    const handlePaste = useCallback( async () => {
        const ok = await handlePasteFromClipboard();
        if( ok ) {
            displayMsg( 'Clipboard pasted.', 'success' );
        } else {
            displayMsg( 'Error pasting', 'error' );
        }
    }, [ handlePasteFromClipboard, displayMsg ] );

    const handleFormat = useCallback( async () => {
        displayMsg( 'Formatting...', 'info' );
        const ok = await handleFormatCode();
        if( ok ) {
            displayMsg( 'Formatted.', 'success' );
        } else {
            displayMsg( 'Error formatting', 'error' );
        }
    }, [ handleFormatCode, displayMsg ] );


    return (
        <div className="editor-container panel-container">
            <div className="sticky-area">
                <EditorHeader
                    isModified={ isModified }
                    lastSaved={ firstModifiedAt ?? lastSaved }
                    onSave={ handleSave }
                    onOpen={ handleOpen }
                    onCopyAll={ handleCopy }
                    onPaste={ handlePaste }
                    onFormat={ handleFormat }
                    onLoadExample={ handleLoadExample }
                    onCollapseAll={ handleCollapseAll }
                    onExpandAll={ handleExpandAll }
                    onUndo={ handleUndo }
                    onRedo={ handleRedo }
                    showErrors={ showErrors }
                    setShowErrors={ setShowErrors }
                    statusMessage={ statusMessage }
                />
            </div>

            <div className="scroll-area">
                <MonacoEditor
                    beforeMount={ setupMonaco }
                    width="100%"
                    height="90vh"
                    defaultLanguage="uitdl"
                    value={ localText }
                    onChange={ handleEditorChange }
                    onMount={ handleEditorDidMount }
                    options={ {
                        readOnly: false,
                        minimap: { enabled: true },
                        hover: { enabled: true },
                        folding: true,
                        foldingStrategy: 'auto',
                        showFoldingControls: 'always',
                        automaticLayout: true,
                    } }
                />
            </div>

            { showErrors && (
                <ErrorListPortal
                    errors={ errors }
                    onErrorHover={ handleErrorHover }
                    onErrorClick={ handleErrorClick }
                />
            ) }
        </div>
    );
};

export default Editor;
