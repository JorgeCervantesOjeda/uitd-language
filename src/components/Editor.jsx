import React, { useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

// Constructing the regular expression pattern dynamically
const verbPattern = `\\b(?:${validVerbs.join( '|' )})\\b`;



const Editor = ( { value, onChange } ) => {
    const editorRef = useRef( null );

    const handleEditorChange = ( value ) => {
        onChange( value );
    };

    const handleEditorDidMount = ( editor, monaco ) => {
        editorRef.current = editor;

        // Register a new language
        monaco.languages.register( { id: 'uitdl' } );

        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider( 'uitdl', {
            tokenizer: {
                root: [
                    [ new RegExp( verbPattern ), 'keyword' ],
                    [ /\b(UITD|UI|actions|FRAGMENT|DRAW|TRANSITION|from|to|if|user|AND)\b/, 'keyword' ],
                    [ /[{}]/, '@brackets' ],
                    [ /\d+/, 'number' ],
                    [ /"[^"]*"/, 'string' ],
                    [ /\b[\w-]+\b/, 'identifier' ],
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
                        documentation: 'Define a UI with an ID, name, and actions',
                    },

                    {
                        label: 'FRAGMENT',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'FRAGMENT "${1:name}" {\n\tDRAW ${2:id}\n\tTRANSITION from ${3:sourceUIid} to ${4:targetUIid} if user\n}',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a fragment with draw and transitions',
                    },
                    {
                        label: 'DRAW',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'DRAW ${1:UIid}',
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
                    ...validVerbs.map( ( verb ) => ( {
                        label: verb,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: verb + ' "${1:target}" ',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Define a ${verb} action',
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
        const validateAndSetMarkers = () => {
            const text = model.getValue();
            const markers = validateUITDL( text, monaco );
            monaco.editor.setModelMarkers( model, 'uitdl', markers );
        };

        validateAndSetMarkers();
        model.onDidChangeContent( validateAndSetMarkers );
    };

    const validateUITDL = ( text, monaco ) => {
        const lines = text.split( '\n' );
        const markers = [];
        let lineNumber = 0;

        lines.forEach( ( line ) => {
            lineNumber++;
            const trimmedLine = line.trim();

            if( trimmedLine.startsWith( 'UITD' ) ) {
                const match = trimmedLine.match( /^UITD\s+"[^"]+"\s*{/ );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: 'Invalid UITD declaration. Correct format: UITD "title" {',
                    } );
                }
            } else if( trimmedLine.startsWith( 'UI' ) ) {
                const match = trimmedLine.match( /^UI\s+\d+\s+"[^"]+"\s+actions\s*{/ );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: 'Invalid UI declaration. Correct format: UI id "name" actions {',
                    } );
                }
            } else if( validVerbs.some( ( verb ) => trimmedLine.startsWith( verb ) ) ) {
                const match = trimmedLine.match( new RegExp( `^(${validVerbs.join( '|' )})\\s+"[^"]+"` ) );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: `Invalid action. Correct format: ${validVerbs.join( ' "target", ' )} "target"`,
                    } );
                }
            } else if( trimmedLine.startsWith( 'FRAGMENT' ) ) {
                const match = trimmedLine.match( /^FRAGMENT\s+"[^"]+"\s*{/ );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: 'Invalid FRAGMENT declaration. Correct format: FRAGMENT "name" {',
                    } );
                }
            } else if( trimmedLine.startsWith( 'DRAW' ) ) {
                const match = trimmedLine.match( /^DRAW\s+\d+/ );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: 'Invalid DRAW declaration. Correct format: DRAW ui_ids',
                    } );
                }
            } else if( trimmedLine.startsWith( 'TRANSITION' ) ) {
                const match = trimmedLine.match( /^TRANSITION\s+from\s+\d+\s+to\s+\d+\s+if\s+user\s+\w+\s+"[^"]+"\s*(AND\s+"[^"]+")?/ );
                if( !match ) {
                    markers.push( {
                        severity: monaco.MarkerSeverity.Error,
                        startLineNumber: lineNumber,
                        startColumn: 1,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1,
                        message: 'Invalid TRANSITION declaration. Correct format: TRANSITION from sourceUI to targetUI if user action "target" AND "condition"',
                    } );
                }
            }
        } );
        return markers;
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
                height={ 600 }
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
