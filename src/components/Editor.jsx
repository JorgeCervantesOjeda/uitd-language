import React, { useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import 'react-resizable/css/styles.css';
import { parseUITDL, validateData, validVerbs } from '../utils/Parser';

const Editor = ( { value, onChange } ) => {
    const editorRef = useRef( null );

    const handleEditorChange = ( value ) => {
        onChange( value );
    };


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
        <MonacoEditor
            width="100%"
            height="100%"
            defaultLanguage="uitdl"
            value={ value }
            onChange={ handleEditorChange }
            onMount={ handleEditorDidMount }
            theme="vs-dark"
            options={ {
                readOnly: false,
                minimap: { enabled: true },
            } }
        />
    );
};

export default Editor;
