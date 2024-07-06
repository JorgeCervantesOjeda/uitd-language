import React, { useRef, useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import 'react-resizable/css/styles.css';
import { parseUITDL, validateData, validVerbs } from '../utils/Parser';
import { saveAs } from 'file-saver';

const Editor = ( { uitdlText, onChange } ) => {
    const editorRef = useRef( null );
    const [ lastSaved, setLastSaved ] = useState( Date.now() );
    const [ reminder, setReminder ] = useState( false );
    const [ isModified, setIsModified ] = useState( false );
    const fileInputRef = useRef( null );

    const handleEditorChange = ( value ) => {
        onChange( value );
        setIsModified( true );
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText( uitdlText ).then( () => {
            const copyMessage = document.getElementById( 'copyMessageEditor' );
            copyMessage.style.visibility = 'visible';
            setTimeout( () => {
                copyMessage.style.visibility = 'hidden';
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
        setReminder( false );
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
                    setReminder( true );
                }
            }, 60 * 1000 );

            return () => clearInterval( timer );
        }
    }, [ lastSaved, isModified ] );

    const handleEditorDidMount = ( editor, monaco ) => {
        // Set cursor position (line, column)
        const initialCursorPosition = new monaco.Position( 2, 5 ); // Example: line 2, column 5
        editor.setPosition( initialCursorPosition );
        editor.focus();

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
                        insertText: 'FRAGMENT "${1:name}" {\n\tDRAW ${2:id}\n\tTRANSITION from ${3:id} to ${4:id} if user ${5:verb}\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a fragment with draw and transitions',
                    },
                    {
                        label: 'DRAW',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'DRAW ${1:id}',
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

        const validateAndSetMarkers = () => {
            const model = editor.getModel();
            const text = model.getValue();
            const parsed = parseUITDL( text );
            const markers = [
                ...parsed.errors.map( error => ( {
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: error.lineNumber,
                    startColumn: error.startColumn,
                    endLineNumber: error.lineNumber,
                    endColumn: error.endColumn,
                    message: error.message,
                } ) ),
                ...validateData( parsed ),
            ];
            monaco.editor.setModelMarkers( model, 'uitdl', markers );
        };

        validateAndSetMarkers();
        editor.getModel().onDidChangeContent( validateAndSetMarkers );
    };

    return (
        <div>
            <div>
                <div>UITD Editor</div>
                <button onClick={ handleCopyToClipboard }>Copy to Clipboard</button>
                <button onClick={ handlePasteFromClipboard }>Paste from Clipboard</button>
                <button onClick={ handleSaveToFile }>Save to File</button>
                <input
                    type="file"
                    ref={ fileInputRef }
                    style={ { display: 'none' } }
                    onChange={ handleOpenFile }
                    accept=".uitd"
                />
                <button onClick={ () => fileInputRef.current.click() }>Open File</button>
            </div>
            { reminder && (
                <div style={ { color: 'yellow', backgroundColor: 'darkred' } }>
                    Remember to save your file!
                </div>
            ) }
            <span id="copyMessageEditor" style={ { marginLeft: '10px', visibility: 'hidden' } }>Copied to clipboard!</span>
            <MonacoEditor
                width="100%"
                height="80vh"
                defaultLanguage="uitdl"
                value={ uitdlText }
                onChange={ handleEditorChange }
                onMount={ handleEditorDidMount }
                theme="vs-dark"
                options={ {
                    readOnly: false,
                    minimap: { enabled: true },
                } }
            />
        </div>
    );
};

export default Editor;
