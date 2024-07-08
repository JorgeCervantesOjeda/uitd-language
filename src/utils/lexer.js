import { Token, TokenType, Tokens } from './tokens';

const tokenSpec = [
    [ TokenType.KEYWORD, /\b(UITD|UI|FRAGMENT|DRAW|TRANSITION|actions|from|to|if|user|AND|clicks|submits|selects|types|toggles|uploads|downloads|saves|deletes|waits for)\b/ ],
    [ TokenType.NUMBER, /\d+/ ],
    [ TokenType.STRING, /"([^"\\]|\\.)*"/ ],
    [ TokenType.PUNCTUATION, /[{}(),;]/ ],
    [ TokenType.COMMENT, /#.*/ ],
    [ TokenType.WHITESPACE, /\s+/ ],
    [ TokenType.UNKNOWN, /./ ]
];

export function tokenize( code ) {
    const tokens = new Tokens();
    let line = 1;
    let column = 1;
    let position = 0;

    while( position < code.length ) {
        let match = null;
        for( let [ type, pattern ] of tokenSpec ) {
            const regex = new RegExp( pattern );
            match = regex.exec( code.substring( position ) );
            if( match && match.index === 0 ) {
                const value = match[ 0 ];
                if( type !== TokenType.WHITESPACE ) {
                    tokens.push( new Token( type, value, line, column ) );
                }

                const lines = value.split( '\n' );
                if( lines.length > 1 ) {
                    line += lines.length - 1;
                    column = lines[ lines.length - 1 ].length + 1;
                } else {
                    column += value.length;
                }

                position += value.length;
                break;
            }
        }
        if( !match ) {
            throw new Error( `Unexpected character: ${code[ position ]} at position ${position}` );
        }
    }
    return tokens;
}
