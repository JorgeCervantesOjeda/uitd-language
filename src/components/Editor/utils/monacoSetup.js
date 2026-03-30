import { validVerbs } from '../../../index.js';

export const setupMonaco = ( monacoInstance ) => {
    monacoInstance.languages.register( { id: 'uitdl' } );

    monacoInstance.languages.setMonarchTokensProvider(
 'uitdl',
{
        tokenizer: {
            root: [
                [ new RegExp( validVerbs.join( '|' ) ), 'keyword' ],
                [ /\b(UITD|UI|actions|FRAGMENT|DRAW|TRANSITION|from|to|if|user|AND|WIDTH)\b/, 'keyword' ],
                [ /[{}[\]]/, '@brackets' ],
                [ /\d+/, 'number' ],
                [ /"[^"]*"/, 'string' ],
                [ /\b[\w-]+\b/, 'identifier' ],
            ],
        },
    } 
);

    monacoInstance.languages.registerCompletionItemProvider(
 'uitdl',
{
        provideCompletionItems: () => {
            const suggestions = [
                {
                    label: 'UITD',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'UITD "${1:title}" {\n\tUI 1 "${2:name}" actions {\n\t\t${3:clicks} "${4:target}";\n\t}\n\tFRAGMENT "${5:description}" {\n\t\tDRAW { 1 };\n\t\tTRANSITION from 1 to ${6:id} if user ${3:clicks} "${4:target}";\n\t}\n}',
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
                    insertText: 'FRAGMENT "${1:description}" {\n\tDRAW { ${2:drawIds} };\n\tTRANSITION from ${3:fromId} to ${4:toId} if user ${5:clicks} "${6:target}";\n}',
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
                    label: 'WIDTH',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'WIDTH ${1:20};',
                    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Define width option',
                },
                {
                    label: 'TRANSITION',
                    kind: monacoInstance.languages.CompletionItemKind.Snippet,
                    insertText: 'TRANSITION from ${1:id} to ${2:id} if user ${3:clicks} "${4:target}";',
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
    } 
);

    monacoInstance.languages.setLanguageConfiguration(
 'uitdl',
{
        // Indica que {} son delimiters
        brackets: [ [ '{', '}' ], [ '[', ']' ] ],
        // Auto-fold con esas llaves
        folding: {
            offSide: false, // desactiva indent-based folding
            markers: {
                // opcional: plegado vía comentarios tipo //#region / //#endregion
                start: /^\s*\/\/\s*#?region\b/,
                end: /^\s*\/\/\s*#?endregion\b/
            }
        },
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
            { open: '(', close: ')' },
        ],
    } 
);

    monacoInstance.editor.defineTheme(
 'uitdlTheme',
{
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'number', foreground: 'e5eE08' },
            { token: 'comment', foreground: '6A9955' },
            // …tus otros token-rules…
        ],
        colors: {
            // text color
            'editor.foreground': '#F8F8F8',
        }
    } 
);

    // Tema oscuro personalizado
    monacoInstance.editor.defineTheme(
 'uitdlTheme-dark',
{
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'number', foreground: 'e5eE08' },
            { token: 'comment', foreground: '6A9955' },
            // ...otros token-rules...
        ],
        colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#F8F8F8',
            'editorWidget.background': '#252526',
            'editorWidget.border': '#3c3c3c',
            'quickInput.background': '#252526',
            'quickInput.foreground': '#f8f8f8',
            'quickInputList.focusBackground': '#094771',
            'quickInputList.focusForeground': '#ffffff',
            'input.background': '#3c3c3c',
            'input.foreground': '#f8f8f8',
            'input.border': '#3c3c3c',
        }
    } 
);

    // Tema claro personalizado
    monacoInstance.editor.defineTheme(
 'uitdlTheme-light',
{
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'number', foreground: 'a57900' },
            { token: 'comment', foreground: '6A9955' },
            // ...otros token-rules...
        ],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#222222',
            'editorWidget.background': '#f8f8f8',
            'editorWidget.border': '#d4d4d4',
            'quickInput.background': '#f8f8f8',
            'quickInput.foreground': '#222222',
            'quickInputList.focusBackground': '#dbeafe',
            'quickInputList.focusForeground': '#111827',
            'input.background': '#ffffff',
            'input.foreground': '#222222',
            'input.border': '#cbd5e1',
        }
    } 
);

    monacoInstance.languages.registerFoldingRangeProvider(
 'uitdl',
{
        provideFoldingRanges( model ) {
            const ranges = [];
            const stack = [];
            const total = model.getLineCount();

            for( let line = 1; line <= total; line++ ) {
                const text = model.getLineContent( line );
                // Por cada “{” detectada, anotamos la línea
                for( const match of text.matchAll( /{/g ) ) {
                    void match;
                    stack.push( line );
                }
                // Por cada “}”, emparejamos con la última apertura
                for( const match of text.matchAll( /}/g ) ) {
                    void match;
                    const start = stack.pop();
                    // Sólo plegar si tiene al menos una línea interna
                    if( start != null && line > start + 1 ) {
                        ranges.push( {
                            start,
                            end: line,
                            kind: monacoInstance.languages.FoldingRangeKind.Region
                        } );
                    }
                }
            }

            return ranges;
        }
    } 
);

};


// in utils/monacoSetup.js (or utils/d2Setup.js)

export function setupD2( monaco ) {
    monaco.languages.register( { id: 'd2' } );

    monaco.languages.setMonarchTokensProvider(
 'd2',
{
        // very crude example—tweak to match your D2 syntax
        tokenizer: {
            root: [
                [ /\b(direction|style|stroke|width|right|fill|dash)\b/, 'keyword' ],
                [ /\b\d+(?:\.\d+)?\b/, 'number' ],
                [ /"[^"]*"/, 'string' ],
                [ /[{};]/, '@brackets' ],
                [ /[(),:]/, 'delimiter' ],
                [ /[A-Za-z_]\w*/, 'identifier' ],
            ]
        }
    } 
);

    monaco.languages.setLanguageConfiguration(
 'd2',
{
        brackets: [ [ '{', '}' ], [ '(', ')' ] ],
        autoClosingPairs: [ { open: '{', close: '}' }, { open: '(', close: ')' } ],
        surroundingPairs: [ { open: '"', close: '"' } ],
    } 
);
}
