import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import ErrorList from './ErrorList.jsx';
import EditorHeader from './EditorHeader.jsx';
import handleFormatCode from './utils/formatCode.js';
import setErrors from './utils/setErrors.js';
import { setupMonaco } from './utils/monacoSetup.js';
import '../../App.css';

const handleEditorChange = ( value, onChange, setIsModified ) => {
    onChange( value );
    setIsModified( true );
    localStorage.setItem( 'uitdlContent', value );
};

const Editor = ( { uitdlText, onChange, markers } ) => {
    const editorRef = useRef( null );
    const markersRef = useRef( markers );
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ isModified, setIsModified ] = useState( false );
    const [ message, setMessage ] = useState( '' );
    const [ errors, setErrorsState ] = useState( [] );
    const fileInputRef = useRef( null );
    const [ showErrors, setShowErrors ] = useState( false );

    const handleEditorChangeWrapper = ( value ) => {
        handleEditorChange( value, onChange, setIsModified );
    };

    const handleFormatCodeWrapper = () => {
        handleFormatCode( editorRef, onChange, setIsModified );
    };

    useEffect( () => {
        if( isModified ) {
            const timer = setInterval( () => {
                if( Date.now() - lastSaved > 3 * 60 * 1000 ) {
                    setMessage( 'Remember to save your file!' );
                }
            }, 10 * 1000 );

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
    }, [] );

    const handleEditorDidMount = ( editor, monaco ) => {
        editorRef.current = editor;
        setupMonaco( monaco );
        setErrors( editor, markersRef.current, setErrorsState );
    };

    return (
        <div className='renderer-container' style={ { position: 'relative' } }>
            <EditorHeader
                showErrors={ showErrors }
                setShowErrors={ setShowErrors }
                handleFormatCode={ handleFormatCodeWrapper }
                fileInputRef={ fileInputRef }
                setLastSaved={ setLastSaved }
                setIsModified={ setIsModified }
                setMessage={ setMessage }
                uitdlText={ uitdlText }
                onChange={ handleEditorChangeWrapper }
            />
            <div style={ { minHeight: '20px', color: 'yellow', backgroundColor: message ? 'darkred' : 'transparent' } }>
                { message || '\u00A0' }
            </div>
            <div style={ { position: 'relative', zIndex: 0 } }>
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
                { showErrors && (
                    <div className="error-list-container" style={ { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000 } }>
                        <ErrorList errors={ errors } />
                    </div>
                ) }
            </div>
            <input
                type="file"
                ref={ fileInputRef }
                style={ { display: 'none' } }
                accept=".uitd"
            />
        </div>
    );
};

export default Editor;
