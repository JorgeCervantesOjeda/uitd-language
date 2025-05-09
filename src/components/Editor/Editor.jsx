import React, { useRef, useState, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import EditorHeader from './EditorHeader';
import ErrorList from './ErrorList';              // lo volvemos a importar aquí
import handleFormatCode from './utils/formatCode';
import setErrors from './utils/setErrors';
import { setupMonaco } from './utils/monacoSetup';
import '../../App.css';
import { debounce } from 'lodash';

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
        debounce( value => {
            localStorage.setItem( 'uitdlContent', value );
            onChange( value );
        }, 500 ),
        [ onChange ]
    );

    const handleEditorChange = useCallback( value => {
        setLocalText( value );
        setIsModified( true );
        debouncedOnChange( value );
    }, [ debouncedOnChange ] );

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

    // — Save as… —
    const handleSave = useCallback( async () => {
        const blob = new Blob( [ localText ], { type: 'text/plain;charset=utf-8' } );
        const { saveAs } = await import( 'file-saver' );
        saveAs( blob, '_.uitd' );
        setLastSaved( Date.now() );
        setIsModified( false );
        return true;
    }, [ localText ] );

    // — Open file —
    const handleOpen = useCallback( async () => {
        try {
            const [ h ] = await window.showOpenFilePicker( {
                types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                multiple: false
            } );
            const file = await h.getFile();
            const text = await file.text();
            setLocalText( text );
            setIsModified( true );
            localStorage.setItem( 'uitdlContent', text );
            onChange( text );
            return file.name;
        } catch( err ) {
            if( err.name !== 'AbortError' ) console.error( err );
            return null;
        }
    }, [ onChange ] );

    // — Formateo de código —
    const handleFormat = useCallback( () => {
        handleFormatCode( editorRef, onChange, setIsModified );
    }, [ onChange ] );

    // — Clipboard & Ejemplo —
    const handleCopyAll = useCallback( async displayMsg => {
        try {
            await navigator.clipboard.writeText( localText );
            displayMsg( 'Copied to clipboard!' );
        } catch( err ) { console.error( err ); }
    }, [ localText ] );

    const handlePaste = useCallback( async displayMsg => {
        try {
            const t = await navigator.clipboard.readText();
            setLocalText( t );
            onChange( t );
            displayMsg( 'Clipboard pasted.' );
        } catch( err ) { console.error( err ); }
    }, [ onChange ] );

    const handleLoadExample = useCallback( async displayMsg => {
        const { ExampleUITD } = await import( './utils/ExampleUITD' );
        setLocalText( ExampleUITD );
        onChange( ExampleUITD );
        setIsModified( true );
        displayMsg( 'Loaded example.' );
    }, [ onChange ] );

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
                    errors={ errors }           // por si quiero pasarlos al header, pero ya no se renderizan ahí
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

            {/* ahora ErrorList se renderiza en Editor */ }
            { showErrors && (
                <div className="error-list-container">
                    <ErrorList errors={ errors } />
                </div>
            ) }
        </div>
    );
};

export default Editor;
