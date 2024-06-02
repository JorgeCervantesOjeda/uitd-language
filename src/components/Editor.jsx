import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import * as monaco from 'monaco-editor';
import { parseUITDL } from '../utils/Parser';

const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

const Editor = ( { value, onChange } ) => {
    const editorRef = useRef( null );
    const [ markers, setMarkers ] = useState( [] );

    const validateAndSetMarkers = ( value, monaco ) => {
        try {
            parseUITDL( value );
            monaco.editor.setModelMarkers( editorRef.current.getModel(), 'owner', [] );
        } catch( error ) {
            const lineNumberMatch = error.message.match( /line (\d+)/ );
            const lineNumber = lineNumberMatch ? parseInt( lineNumberMatch[ 1 ] ) : 1;
            const message = error.message.replace( / at line \d+/, '' );
            monaco.editor.setModelMarkers( editorRef.current.getModel(), 'owner', [ {
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: 1,
                message: message,
                severity: monaco.MarkerSeverity.Error,
            } ] );
        }
    };

    const handleEditorChange = ( value ) => {
        try {
            onChange( value );
            validateAndSetMarkers( value, monaco );
        } catch( error ) {
            console.error( "Error in handleEditorChange:", error );
        }
    };

    const handleEditorDidMount = ( editor, monaco ) => {
        editorRef.current = editor;

        // Register a new language
        monaco.languages.register( { id: 'uitdl' } );

        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider( 'uitdl', {
            tokenizer: {
                root: [
                    [ /\b(clicks|submits|selects|types|toggles|uploads|downloads|saves|deletes|waits for)\b/, 'keyword' ],
                    [ /\b(UITD|UI|actions|FRAGMENT|DRAW|TRANSITION|from|to|if|user|AND)\b/, 'keyword' ],
                    [ /[{}]/, '@brackets' ],
                    [ /\d+/, 'number' ],
                    [ /".*?"/, 'string' ],
                    [ /\w+/, 'identifier' ],
                ],
            },
        } );

        // Define a completion item provider for the language
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
                        label: 'AND',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'AND "${1:condition}"\n',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a condition',
                    },
                    {
                        label: 'FRAGMENT',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'FRAGMENT "${1:name}" {\n\tDRAW ${2:id}\n\tTRANSITION from ${3:sourceUI} to ${4:targetUI} if user \n}',
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
                        insertText: 'TRANSITION from ${1:sourceUI} to ${2:targetUI} if user ',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a transition between UIs with conditions',
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

        // Configure auto-closing pairs for braces and quotes
        monaco.languages.setLanguageConfiguration( 'uitdl', {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '"', close: '"' },
            ],
        } );

        // Add custom validation
        const model = editor.getModel();
        try {
            validateAndSetMarkers( model.getValue(), monaco );
        } catch( error ) {
            console.error( "Error during editor mount validation:", error );
        }
        model.onDidChangeContent( () => {
            try {
                validateAndSetMarkers( model.getValue(), monaco );
            } catch( error ) {
                console.error( "Error during content change validation:", error );
            }
        } );
    };

    return (
        <ResizableBox
            width={ Math.max( window.innerWidth * 0.3, 500 ) }
            height={ window.innerHeight }
            minConstraints={ [ 500, window.innerHeight ] }
            maxConstraints={ [ window.innerWidth * 0.7, window.innerHeight ] }
            axis="x"
            resizeHandles={ [ 'e' ] }
            style={ { display: 'flex', flexDirection: 'column' } }
        >
            <MonacoEditor
                height={ 800 }
                width={ 1000 }
                defaultLanguage="uitdl"
                value={ value }
                onChange={ handleEditorChange }
                onMount={ handleEditorDidMount }
                options={ { automaticLayout: true } }
            />
        </ResizableBox>
    );
};

export default Editor;
