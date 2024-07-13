import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import 'react-resizable/css/styles.css';
import { validVerbs } from '../utils/TokenParser';
import { saveAs } from 'file-saver';
import '../App.css'; // Assuming you have a CSS file for the problem-message class

const Tooltip = ( { messages, x, y, severity } ) => {
    const borderColor = severity === 'warning' ? 'yellow' : 'red';
    return (
        <div style={ {
            position: 'absolute',
            bottom: window.innerHeight - y + 10,
            left: x + 10,
            backgroundColor: 'black',
            color: 'white',
            padding: '5px',
            borderRadius: '5px',
            zIndex: 1000,
            maxWidth: '300px',
            whiteSpace: 'pre-wrap',
            border: `1px solid ${borderColor}`
        } }>
            { messages.map( ( msg, index ) => (
                <div key={ index }>
                    <div>{ msg }</div>
                </div>
            ) ) }
        </div>
    );
};

const Editor = ( { uitdlText, onChange, markers } ) => {
    const editorRef = useRef( null );
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ isModified, setIsModified ] = useState( false );
    const [ message, setMessage ] = useState( '' );
    const [ tooltip, setTooltip ] = useState( null );
    const fileInputRef = useRef( null );

    const formatCode = ( code ) => {
        // Add space after comma
        code = code.replace( /,\s*/g, ', ' );

        // Replace multiple consecutive spaces with a single space (excluding newlines)
        code = code.replace( / {2,}/g, ' ' );

        // Remove spaces before and after {
        code = code.replace( /\s*{\s*/g, '{' );
        // Remove spaces before and after }
        code = code.replace( /\s*}\s*/g, '}' );

        // Ensure { is followed by a newline and preceded by a space
        code = code.replace( /{([^\n])/g, '{\n$1' );
        code = code.replace( /([^\s{])\{/g, '$1 {' );

        // Ensure } is followed by a newline and preceded by a newline
        code = code.replace( /}([^\n])/g, '}\n$1' );
        code = code.replace( /([^\n])}/g, '$1\n}' );

        // Remove spaces before and after ( excluding newlines
        code = code.replace( /[^\S\n]*\([^\S\n]*/g, '(' );
        // Remove spaces before and after ) excluding newlines
        code = code.replace( /[^\S\n]*\)[^\S\n]*/g, ')' );

        // Split into lines and apply indentation correction
        const lines = code.split( '\n' );
        let indentLevel = 0;
        const indentSize = 2;
        const formattedLines = lines.map( line => {
            if( line.trim() === '' ) return line; // Keep empty lines as they are

            if( line.trim().startsWith( '}' ) ) indentLevel -= 1;
            const formattedLine = ' '.repeat( indentLevel * indentSize ) + line.trim();
            if( line.trim().endsWith( '{' ) ) indentLevel += 1;

            return formattedLine;
        } );

        return formattedLines.join( '\n' ).trim();
    };

    const handleEditorChange = ( value ) => {
        onChange( value );
        setIsModified( true );
    };

    const handleFormatCode = () => {
        const editor = editorRef.current;
        const model = editor.getModel();
        const position = editor.getPosition();

        const currentValue = model.getValue();
        const formattedValue = formatCode( currentValue );

        editor.executeEdits( '', [
            {
                range: model.getFullModelRange(),
                text: formattedValue,
                forceMoveMarkers: true,
            },
        ] );
        editor.setPosition( position );
        onChange( formattedValue );
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText( uitdlText ).then( () => {
            setMessage( 'Copied to clipboard!' );
            setTimeout( () => {
                setMessage( '' );
            }, 2000 );
        } ).catch( ( err ) => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    const handlePasteFromClipboard = () => {
        navigator.clipboard.readText().then( ( text ) => {
            handleEditorChange( text );
        } ).catch( ( err ) => {
            console.error( 'Failed to read clipboard contents: ', err );
        } );
    };

    const handleSaveToFile = () => {
        const blob = new Blob( [ uitdlText ], { type: 'text/plain;charset=utf-8' } );
        saveAs( blob, 'uitdl_description.uitd' );
        setLastSaved( Date.now() );
        setIsModified( false );
    };

    const handleOpenFile = ( event ) => {
        const file = event.target.files[ 0 ];
        if( file && file.name.endsWith( '.uitd' ) ) {
            const reader = new FileReader();
            reader.onload = ( e ) => {
                handleEditorChange( e.target.result );
            };
            reader.readAsText( file );
        } else {
            alert( 'Please select a .uitd file' );
        }
    };

    useEffect( () => {
        if( isModified ) {
            const timer = setInterval( () => {
                if( Date.now() - lastSaved > 5 * 60 * 1000 ) {
                    setMessage( 'Remember to save your file!' );
                }
            }, 60 * 1000 );

            return () => clearInterval( timer );
        }
    }, [ lastSaved, isModified ] );

    useEffect( () => {
        if( editorRef.current ) {
            setMarkers( editorRef.current, markers );
        }
    }, [ markers ] );

    const handleEditorDidMount = ( editor, monaco ) => {
        editorRef.current = editor;

        monaco.languages.register( { id: 'uitdl' } );

        monaco.languages.setMonarchTokensProvider( 'uitdl', {
            tokenizer: {
                root: [
                    [ new RegExp( validVerbs.join( '|' ) ), 'keyword' ],
                    [ /\b(UITD|UI|actions|FRAGMENT|DRAW|TRANSITION|from|to|if|user|AND)\b/, 'keyword' ],
                    [ /[{}]/, '@brackets' ],
                    [ /\d+/, 'number' ],
                    [ /"[^"]*"/, 'string' ],
                    [ /\b[\w-]+\b/, 'identifier' ],
                ],
            },
        } );

        monaco.languages.registerCompletionItemProvider( 'uitdl', {
            provideCompletionItems: () => {
                const suggestions = [
                    {
                        label: 'UITD',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'UITD "${1:title}" {\n\t${2}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define the UITD structure with a title',
                    },
                    {
                        label: 'UI',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'UI ${1:id} "${2:name}" actions {\n\t${3}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a UI with an ID, name, and actions',
                    },
                    {
                        label: 'FRAGMENT',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'FRAGMENT "${1:name}" {\n\tDRAW {${2:id}}\n\tTRANSITION from ${3:id} to ${4:id} if user ${5:verb}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a fragment with draw and transitions',
                    },
                    {
                        label: 'DRAW',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'DRAW {${1:id}}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define draw statements with UI IDs',
                    },
                    {
                        label: 'TRANSITION',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'TRANSITION from ${1:id} to ${2:id} if user ',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a transition between UIs with conditions',
                    },
                    {
                        label: 'AND',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'AND "${1:condition}"',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define the UITD structure with a title',
                    },
                    ...validVerbs.map( verb => ( {
                        label: verb,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: verb + ' "${1:target}" ',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: `Define a ${verb} action`,
                    } ) ),
                ];
                return { suggestions: suggestions };
            },
        } );

        monaco.languages.setLanguageConfiguration( 'uitdl', {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '"', close: '"' },
                { open: '(', close: ')' },
            ],
        } );

        setMarkers( editor, markers );

        // Handle hover manually using onMouseMove event
        editor.onMouseMove( ( e ) => {
            const model = editor.getModel();
            const position = e.target.position;

            if( !position ) {
                setTooltip( null );
                return;
            }

            const markers = monaco.editor.getModelMarkers( { resource: model.uri } );
            const hoverMarkers = markers.filter( marker =>
                marker.startLineNumber <= position.lineNumber &&
                marker.endLineNumber >= position.lineNumber &&
                marker.startColumn <= position.column &&
                marker.endColumn >= position.column
            );

            if( hoverMarkers.length > 0 ) {
                const { clientX, clientY } = e.event.browserEvent;
                const severity = hoverMarkers.some( marker => marker.severity === monaco.MarkerSeverity.Error )
                    ? 'error'
                    : 'warning';
                setTooltip( { messages: hoverMarkers.map( marker => marker.message ), x: clientX, y: clientY, severity } );
            } else {
                setTooltip( null );
            }
        } );

        editor.onMouseLeave( () => {
            setTooltip( null );
        } );
    };

    const setMarkers = ( editor, markers ) => {
        const model = editor.getModel();
        if( model ) {
            monaco.editor.setModelMarkers( model, 'uitdl', markers );
        }
    };

    return (
        <div className='renderer-container' style={ { position: 'relative' } }>
            <div className='renderer-header'>
                <div style={ { color: 'yellow' } }>UITD Editor</div>
                <button className='renderer-button' onClick={ handleCopyToClipboard }>Copy to Clipboard</button>
                <button className='renderer-button' onClick={ handlePasteFromClipboard }>Paste from Clipboard</button>
                <button className='renderer-button' onClick={ handleSaveToFile }>Save to File</button>
                <button className='renderer-button' onClick={ handleFormatCode }>Format Code</button>
                <input
                    type="file"
                    ref={ fileInputRef }
                    style={ { display: 'none' } }
                    onChange={ handleOpenFile }
                    accept=".uitd"
                />
                <button className='renderer-button' onClick={ () => fileInputRef.current.click() }>Open File</button>
            </div>
            <div style={ { minHeight: '20px', color: 'yellow', backgroundColor: message ? 'darkred' : 'transparent' } }>
                { message || '\u00A0' }
            </div>
            <MonacoEditor
                width="100%"
                height="90vh"
                defaultLanguage="uitdl"
                value={ uitdlText }
                onChange={ handleEditorChange }
                onMount={ handleEditorDidMount }
                theme="vs-dark"
                options={ {
                    readOnly: false,
                    minimap: { enabled: true },
                    hover: { enabled: false } // Disable default hover
                } }
            />
            { tooltip && <Tooltip messages={ tooltip.messages } x={ tooltip.x } y={ tooltip.y } severity={ tooltip.severity } /> }
        </div>
    );
};

export default Editor;
