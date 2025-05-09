import React, { useRef, useState, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import EditorHeader from './EditorHeader';
import ErrorList from './ErrorList';
import handleFormatCode from './utils/formatCode';
import setErrors from './utils/setErrors';
import { setupMonaco } from './utils/monacoSetup';
import '../../App.css';
import { debounce } from 'lodash';
import { saveAs } from 'file-saver';

const Editor = ( { uitdlText, onChange, markers } ) => {
    const editorRef = useRef( null );
    const markersRef = useRef( markers );

    // — Estados de guardado y modificación —
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ isModified, setIsModified ] = useState( false );

    // — Lista de errores y visibilidad —
    const [ errors, setErrorsState ] = useState( [] );
    const [ showErrors, setShowErrors ] = useState( false );

    // — Texto local —
    const [ localText, setLocalText ] = useState( uitdlText );

    // — Debounce + localStorage —
    const debouncedOnChange = useCallback(
        debounce( ( value ) => {
            localStorage.setItem( 'uitdlContent', value );
            onChange( value );
        }, 500 ),
        [ onChange ]
    );

    const handleEditorChange = useCallback(
        ( value ) => {
            setLocalText( value );
            setIsModified( true );
            debouncedOnChange( value );
        },
        [ debouncedOnChange ]
    );

    // — Carga inicial de localStorage —
    useEffect( () => {
        const saved = localStorage.getItem( 'uitdlContent' );
        if( saved ) {
            setLocalText( saved );
            onChange( saved );
        }
    }, [ onChange ] );

    // — Sincronización de errores —
    useEffect( () => {
        console.log( '🔍 markers recibidos:', markers );
        markersRef.current = markers;
        if( editorRef.current ) {
            setErrors( editorRef.current, markersRef.current, setErrorsState );
        }
    }, [ markers ] );

    // — Montaje del editor —
    const handleEditorDidMount = useCallback( ( editor, monaco ) => {
        editorRef.current = editor;
        setupMonaco( monaco );
        setErrors( editor, markersRef.current, setErrorsState );
    }, [] );

    // — Manejar clic en error: saltar a línea y centrarla —
    const handleErrorClick = useCallback( ( lineNumber, column = 1 ) => {
        const editor = editorRef.current;
        if( editor ) {
            // Sitúa el cursor en la línea y columna del error
            console.log( 'Moviendo cursor a linea columna ', lineNumber, column );
            editor.setPosition( { lineNumber, column } );
            // Centra esa posición en la vista
            editor.revealPositionInCenter( { lineNumber, column } );
            // Devuelve el foco al editor
            editor.focus();
        }
    }, [] );

    // — Guardar archivo —
    // — Guardar archivo con fallback para navegadores sin showSaveFilePicker —
    // — Guardar archivo con fallback “más real” —
    const handleSave = useCallback( async () => {
        try {
            let ok = false;

            if( window.showSaveFilePicker ) {
                // 1) File System Access API
                const handle = await window.showSaveFilePicker( {
                    suggestedName: '_.uitd',
                    types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ]
                } );
                const writable = await handle.createWritable();
                await writable.write( localText );
                await writable.close();
                ok = true;
            } else {
                // 2) Fallback con file-saver + “await focus”
                const blob = new Blob( [ localText ], { type: 'text/plain;charset=utf-8' } );
                saveAs( blob, '_.uitd' );

                // Espera al retorno del foco, que indica que el diálogo de guardado se cerró
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
                setLastSaved( Date.now() );
                setIsModified( false );
            }
            return ok;

        } catch( err ) {
            if( err.name !== 'AbortError' ) console.error( err );
            return false;
        }
    }, [ localText ] );

    // — Abrir archivo —
    // — Abrir archivo con fallback para navegadores sin showOpenFilePicker —
    const handleOpen = useCallback( async () => {
        try {
            let fileHandle, file, text, fileName;

            if( window.showOpenFilePicker ) {
                // Chrome, Edge (File System Access API)
                [ fileHandle ] = await window.showOpenFilePicker( {
                    types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                    multiple: false
                } );
                file = await fileHandle.getFile();
                fileName = file.name;
                text = await file.text();
            } else {
                // Fallback: input type="file"
                text = await new Promise( ( resolve, reject ) => {
                    const input = document.createElement( 'input' );
                    input.type = 'file';
                    input.accept = '.uitd,text/plain';
                    input.style.display = 'none';
                    document.body.appendChild( input );

                    input.onchange = async ( e ) => {
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

            // Si llegamos aquí, ya tenemos `text` y `fileName`
            setLocalText( text );
            setIsModified( true );
            localStorage.setItem( 'uitdlContent', text );
            onChange( text );
            return fileName;
        } catch( err ) {
            // El usuario canceló o hubo otro error
            if( err.name !== 'AbortError' ) console.error( err );
            return null;
        }
    }, [ onChange ] );

    // — Formatear código —
    const handleFormat = useCallback( () => {
        handleFormatCode( editorRef, onChange, setIsModified );
    }, [ onChange ] );

    // — Clipboard: copiar y pegar —
    const handleCopyAll = useCallback(
        async ( displayMsg ) => {
            try {
                await navigator.clipboard.writeText( localText );
                displayMsg( 'Copied to clipboard!' );
            } catch( err ) {
                console.error( err );
            }
        },
        [ localText ]
    );

    const handlePaste = useCallback(
        async ( displayMsg ) => {
            try {
                const text = await navigator.clipboard.readText();
                setLocalText( text );
                onChange( text );
                displayMsg( 'Clipboard pasted.' );
            } catch( err ) {
                console.error( err );
            }
        },
        [ onChange ]
    );

    // — Cargar ejemplo —
    const handleLoadExample = useCallback(
        async ( displayMsg ) => {
            const { ExampleUITD } = await import( './utils/ExampleUITD' );
            setLocalText( ExampleUITD );
            onChange( ExampleUITD );
            setIsModified( true );
            displayMsg( 'Loaded example.' );
        },
        [ onChange ]
    );

    return (
        <div className="editor-container">
            <div className="sticky-area">
                <EditorHeader
                    isModified={ isModified }
                    lastSaved={ lastSaved }
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
                    width="100%"
                    height="90vh"
                    defaultLanguage="uitdl"
                    value={ localText }
                    onChange={ handleEditorChange }
                    onMount={ handleEditorDidMount }
                    theme="vs-dark"
                    options={ { readOnly: false, minimap: { enabled: true }, hover: { enabled: false } } }
                />
            </div>

            { showErrors && (
                <div className="error-list-container">
                    <ErrorList
                        errors={ errors }
                        onErrorClick={ handleErrorClick }
                    />
                </div>
            ) }
        </div>
    );
};

export default Editor;
