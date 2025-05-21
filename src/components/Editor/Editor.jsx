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
            if( contentAlreadySaved ) {
                // al guardar/abrir/cargar ejemplo: reiniciamos el primer-modificado
                setLastSaved( Date.now() );
                setFirstModifiedAt( null );
            } else {
                // en la primera edición, fijamos el timestamp
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
                if( window.showSaveFilePicker ) {
                    const handle = await window.showSaveFilePicker( {
                        suggestedName: '_.uitd',
                        types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                    } );
                    const writable = await handle.createWritable();
                    await writable.write( localText );
                    await writable.close();
                    ok = true;
                } else {
                    const blob = new Blob( [ localText ], { type: 'text/plain;charset=utf-8' } );
                    saveAs( blob, '_.uitd' );
                    await new Promise( resolve => {
                        const onFocus = () => {
                            window.removeEventListener( 'focus', onFocus );
                            resolve();
                        };
                        window.addEventListener( 'focus', onFocus );
                    } );
                    ok = true;
                }
                if( ok ) {
                    updateContent( localText, true );
                }
                return ok;
            } catch( err ) {
                if( err.name !== 'AbortError' ) console.error( err );
                return false;
            }
        } ),
        [ localText, updateContent, wrapLoading ]
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
                }
                updateContent( text, true );
                collapseAll();
                return fileName;
            } catch( err ) {
                if( err.name !== 'AbortError' ) console.error( err );
                return null;
            }
        } ),
        [ isModified, updateContent, wrapLoading ]
    );

    // Cargar ejemplo
    const handleLoadExample = useCallback(
        wrapLoading( 'example', async () => {
            if( isModified ) {
                const discard = window.confirm( `You have unsaved changes (elapsed: ${formatElapsed()}).\n\nDiscard and load the example?` );
                if( !discard ) return null;
            }
            const { ExampleUITD } = await import( './utils/ExampleUITD' );
            updateContent( ExampleUITD, true );
            collapseAll();
            return 'ExampleUITD';
        } ),
        [ isModified, updateContent, wrapLoading ]
    );

    // ─── Handlers de edición ───

    // Formatear código
    const handleFormat = useCallback(
        wrapLoading( 'format', async () => {
            await handleFormatCode( editorRef, updateContent );
            return true;
        } ),
        [ wrapLoading ]
    );

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

    // Pegar desde portapapeles
    const handlePaste = useCallback(
        wrapLoading( 'paste', async () => {
            if( isModified ) {
                const discard = window.confirm( `You have unsaved changes (elapsed: ${formatElapsed()}).\n\nDiscard and paste from clipboard?` );
                if( !discard ) return false;
            }
            try {
                const text = await navigator.clipboard.readText();
                updateContent( text );
                return true;
            } catch( err ) {
                console.error( err );
                return false;
            }
        } ),
        [ isModified, updateContent, wrapLoading ]
    );

    return (
        <div className="editor-container panel-container">
            <div className="sticky-area">
                <EditorHeader
                    isModified={ isModified }
                    lastSaved={ firstModifiedAt ?? lastSaved }
                    onSave={ handleSave }
                    onOpen={ handleOpen }
                    onCopyAll={ handleCopyAll }
                    onPaste={ handlePaste }
                    onFormat={ handleFormat }
                    onLoadExample={ handleLoadExample }
                    showErrors={ showErrors }
                    setShowErrors={ setShowErrors }
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
                    theme="vs-dark"
                    options={ {
                        readOnly: false,
                        minimap: { enabled: true },
                        hover: { enabled: false },
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
