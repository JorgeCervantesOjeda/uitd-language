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

    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ isModified, setIsModified ] = useState( false );
    const [ errors, setErrorsState ] = useState( [] );
    const [ showErrors, setShowErrors ] = useState( false );
    const [ localText, setLocalText ] = useState( uitdlText );

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

    useEffect( () => {
        const saved = localStorage.getItem( 'uitdlContent' );
        if( saved ) {
            setLocalText( saved );
            onChange( saved );
        }
    }, [ onChange ] );

    useEffect( () => {
        markersRef.current = markers;
        if( editorRef.current ) {
            setErrors( editorRef.current, markersRef.current, setErrorsState );
        }
    }, [ markers ] );

    const collapseAll = () => {
        setTimeout( () => {
            editorRef.current.trigger( 'keyboard', 'editor.foldLevel2', {} );
            editorRef.current.trigger( 'keyboard', 'editor.foldLevel3', {} );
        }, 500 );
    };

    const handleEditorDidMount = useCallback( ( editor ) => {
        editorRef.current = editor;
        setErrors( editor, markersRef.current, setErrorsState );
        collapseAll();
    }, [] );

    const handleErrorHover = useCallback( ( lineNumber, column = 1 ) => {
        const editor = editorRef.current;
        if( editor ) {
            editor.setPosition( { lineNumber, column } );
            editor.revealPositionInCenter( { lineNumber, column } );
        }
    }, [] );

    const handleErrorClick = useCallback( ( lineNumber, column = 1 ) => {
        setShowErrors( false );
        const editor = editorRef.current;
        if( editor ) {
            editor.setPosition( { lineNumber, column } );
            editor.revealPositionInCenter( { lineNumber, column } );
            editor.focus();
        }
    }, [ setShowErrors ] );

    const handleSave = useCallback( async () => {
        try {
            let ok = false;

            if( window.showSaveFilePicker ) {
                const handle = await window.showSaveFilePicker( {
                    suggestedName: '_.uitd',
                    types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ]
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
                setLastSaved( Date.now() );
                setIsModified( false );
            }
            return ok;
        } catch( err ) {
            if( err.name !== 'AbortError' ) console.error( err );
            return false;
        }
    }, [ localText ] );

    const handleOpen = useCallback( async () => {
        try {
            let fileHandle, file, text, fileName;

            if( window.showOpenFilePicker ) {
                [ fileHandle ] = await window.showOpenFilePicker( {
                    types: [ { description: 'UITD files', accept: { 'text/plain': [ '.uitd' ] } } ],
                    multiple: false
                } );
                file = await fileHandle.getFile();
                fileName = file.name;
                text = await file.text();
            } else {
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

            setLocalText( text );
            setIsModified( true );
            localStorage.setItem( 'uitdlContent', text );
            onChange( text );
            setLastSaved( Date.now() );
            setIsModified( false );
            collapseAll();
            return fileName;
        } catch( err ) {
            if( err.name !== 'AbortError' ) console.error( err );
            return null;
        }
    }, [ onChange ] );

    const handleFormat = useCallback( () => {
        handleFormatCode( editorRef, onChange, setIsModified );
    }, [ onChange ] );

    const handleCopyAll = useCallback( async () => {
        try {
            await navigator.clipboard.writeText( localText );
        } catch( err ) {
            console.error( err );
        }
    }, [ localText ] );

    const handlePaste = useCallback( async () => {
        try {
            const text = await navigator.clipboard.readText();
            setLocalText( text );
            onChange( text );
        } catch( err ) {
            console.error( err );
        }
    }, [ onChange ] );

    const handleLoadExample = useCallback( async () => {
        const { ExampleUITD } = await import( './utils/ExampleUITD' );
        setLocalText( ExampleUITD );
        onChange( ExampleUITD );
        setIsModified( true );
        collapseAll();
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
                        automaticLayout: true
                    } }
                />
            </div>
            { showErrors && (
                <div className="error-list-container">
                    <ErrorList
                        errors={ errors }
                        onErrorHover={ handleErrorHover }
                        onErrorClick={ handleErrorClick }
                    />
                </div>
            ) }
        </div>
    );
};

export default Editor;
