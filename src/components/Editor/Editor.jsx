import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ErrorList from './ErrorList';
import EditorHeader from './EditorHeader';
import handleFormatCode from './utils/formatCode';
import setErrors from './utils/setErrors';
import { setupMonaco } from './utils/monacoSetup';
import '../../App.css';

const Editor = ( { uitdlText, onChange, markers } ) => {
    const editorRef = useRef( null );
    const markersRef = useRef( markers );
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ isModified, setIsModified ] = useState( false );
    const [ message, setMessage ] = useState( '' );
    const [ errors, setErrorsState ] = useState( [] );
    const [ showErrors, setShowErrors ] = useState( false );

    const handleEditorChangeWrapper = ( value ) => {
        onChange( value );
        setIsModified( true );
        localStorage.setItem( 'uitdlContent', value );
    };

    const handleFormatCodeWrapper = () => {
        handleFormatCode( editorRef, onChange, setIsModified );
    };

    const displayTemporaryMessage = ( message, duration = 5000 ) => {
        setMessage( message );
        setTimeout( () => {
            setMessage( '' );
        }, duration );
    };

    useEffect( () => {
        if( isModified ) {
            const timer = setInterval( () => {
                if( Date.now() - lastSaved > 60 * 1000 ) {
                    displayTemporaryMessage( 'Remember to save your file!' );
                }
            }, 30 * 1000 );

            return () => clearInterval( timer );
        }
    }, [ lastSaved, isModified ] );

    useEffect( () => {
        markersRef.current = markers;
        if( editorRef.current ) {
            setErrors( editorRef.current, markersRef.current, setErrorsState );
        }
    }, [ markers ] );

    useEffect( () => {
        const savedContent = localStorage.getItem( 'uitdlContent' );
        if( savedContent ) {
            onChange( savedContent );
        }
    }, [ onChange ] );

    const handleEditorDidMount = ( editor, monaco ) => {
        editorRef.current = editor;
        setupMonaco( monaco );
        setErrors( editor, markersRef.current, setErrorsState );
    };

    return (
        <div className='editor-container' style={ { position: 'relative' } }>
            <div className='sticky-area' >
                <EditorHeader
                    className='renderer-header'
                    showErrors={ showErrors }
                    setShowErrors={ setShowErrors }
                    handleFormatCode={ handleFormatCodeWrapper }
                    setLastSaved={ setLastSaved }
                    setIsModified={ setIsModified }
                    setMessage={ setMessage }
                    uitdlText={ uitdlText }
                    onChange={ handleEditorChangeWrapper }
                />
                <div className="alert-message"
                    style={ {
                        '--message-bg': message ? 'darkred' : 'black'
                    } }
                >
                    { message || '\u00A0' }
                </div>
            </div>
            <div className='scroll-area'>
                <MonacoEditor
                    width="100%"
                    height="90vh"
                    defaultLanguage="uitdl"
                    value={ uitdlText }
                    onChange={ handleEditorChangeWrapper }
                    onMount={ handleEditorDidMount }
                    theme="vs-dark"
                    options={ {
                        readOnly: false,
                        minimap: { enabled: true },
                        hover: { enabled: false }
                    } }
                />
            </div>
            { showErrors && (
                <div className="error-list-container">
                    <ErrorList errors={ errors } />
                </div>
            ) }
        </div>
    );
};

export default Editor;
