// d2Language.js
export const d2Language = {
    defaultToken: '',
    tokenPostfix: '.d2',

    keywords: [
        'direction',
        'right',
        'left',
        'up',
        'down',
        'clicks',
        'Button'
    ],

    operators: [
        '->'
    ],

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // identifiers and keywords
            [ /[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } } ],
            [ /[A-Z][\w$]*/, 'type.identifier' ],  // to show class names nicely

            // whitespace
            { include: '@whitespace' },

            // delimiters and operators
            [ /[{}()[\]]/, '@brackets' ],
            [ /(->)/, 'operator' ],

            // numbers
            [ /\d+/, 'number' ],

            // strings
            [ /"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-terminated string
            [ /"$/, 'string.invalid' ],
            [ /"([^"\\]|\\.)*$/, 'string.invalid' ],
            [ /"/, 'string', '@string' ],

            // characters
            [ /'[^\\']'/, 'string' ],
            [ /'/, 'string.invalid' ]
        ],

        string: [
            [ /[^\\"]+/, 'string' ],
            [ /@escapes/, 'string.escape' ],
            [ /\\./, 'string.escape.invalid' ],
            [ /"/, { token: 'string.quote', bracket: '@close', next: '@pop' } ]
        ],

        whitespace: [
            [ /[ \t\r\n]+/, '' ],
            [ /\/\*/, 'comment', '@comment' ],
            [ /\/\/.*$/, 'comment' ]
        ],

        comment: [
            [ /[^\/*]+/, 'comment' ],
            [ /[\/*]/, 'comment' ],
            [ /\/\*/, 'comment', '@push' ],    // nested comment
            [ "\\*/", 'comment', '@pop' ],
            [ /[\/*]/, 'comment' ]
        ]
    }
};

export const d2Conf = {
    comments: {
        lineComment: '//',
        blockComment: [ '/*', '*/' ]
    },
    brackets: [
        [ '{', '}' ],
        [ '[', ']' ],
        [ '(', ')' ]
    ],
    autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
    ]
};
