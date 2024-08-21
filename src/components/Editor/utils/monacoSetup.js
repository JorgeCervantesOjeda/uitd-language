import * as monaco from 'monaco-editor';
import { validVerbs } from '../../../utils/TokenParser';

export const setupMonaco = ( monacoInstance ) => {
    monacoInstance.languages.register( { id: 'uitdl' } );

    monacoInstance.languages.setMonarchTokensProvider( 'uitdl', {
        tokenizer: {
            root: [
                [ new RegExp( validVerbs.join( '|' ) ), 'keyword' ],
                [ /\b(UITD|UI|actions|FRAGMENT|DRAW|TRANSITION|from|to|if|user|AND|width)\b/, 'keyword' ],
                [ /[{}]/, '@brackets' ],
                [ /\d+/, 'number' ],
                [ /"[^"]*"/, 'string' ],
                [ /\b[\w-]+\b/, 'identifier' ],
            ],
        },
    } );

    monacoInstance.languages.registerCompletionItemProvider( 'uitdl', {
        provideCompletionItems: () => {
            const suggestions = [
                {
                    label: 'UITD',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'UITD "${1:title}" {\n\tUI 1 "${2:name}" actions {\n\t\t${3:verb}\n\t}\n\tFRAGMENT "${4:description}" {\n\t\tDRAW { 1 };\n\t\tTRANSITION from 1 to ${5:id} if user ${6:verb}\n\t}\n}',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define the UITD structure with a title, a UI and a fragment',
                },
                {
                    label: 'UI',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'UI ${1:id} "${2:name}" actions {\n\t${3}\n}',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define a UI with an ID, name, and actions',
                },
                {
                    label: 'FRAGMENT',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'FRAGMENT "${1:description}" {\n\tDRAW {${2:id}};\n\tTRANSITION from ${3:id} to ${4:id} if user ${5:verb}\n}',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define a fragment with draw and transitions',
                },
                {
                    label: 'DRAW',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'DRAW {${1:id}};',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define draw statements with UI IDs',
                },
                {
                    label: 'width',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'width ${1:id}',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define width option',
                },
                {
                    label: 'TRANSITION',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'TRANSITION from ${1:id} to ${2:id} if user ${3:verb};',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define a transition between UIs with conditions',
                },
                {
                    label: 'AND',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'AND "${1:condition}"',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define the UITD structure with a title',
                },
                ...validVerbs.map( verb => ( {
                    label: verb,
                    kind: monacoInstance.languages.CompletionItemKind.Keyword,
                    insertText: verb + ' "${1:target}";',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: `Define a ${verb} action`,
                } ) ),
            ];
            return { suggestions: suggestions };
        },
    } );

    monacoInstance.languages.setLanguageConfiguration( 'uitdl', {
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '"', close: '"' },
            { open: '(', close: ')' },
        ],
    } );
};
