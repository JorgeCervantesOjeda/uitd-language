import { Token, TokenType, Tokens } from './tokens';

const tokenSpec = [
    [ TokenType.KEYWORD, /\b(UITD|UI|FRAGMENT|DRAW|TRANSITION|actions|from|to|if|user|AND|clicks|submits|selects|types|toggles|uploads|downloads|saves|deletes|waits|WIDTH)\b/ ],
    [ TokenType.NUMBER, /\d+/ ],
    [ TokenType.QUOTE, /"/ ], // Quotation marks
    [ TokenType.PUNCTUATION, /[{}(),;]/ ],
    [ TokenType.COMMENT, /#.*/ ],
    [ TokenType.WHITESPACE, /\s+/ ],
    [ TokenType.UNKNOWN, /[^\s{}(),;"#]+/ ] // Pattern to match unknown words
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
            const sub = code.substring( position );
            match = regex.exec( sub );
            if( match && match.index === 0 ) {
                const value = match[ 0 ];

                if( type === TokenType.QUOTE ) {
                    // Handle quotes and text between them
                    tokens.push( new Token( TokenType.QUOTE, '"', line, column ) );

                    // Start looking for the closing quote
                    let textStart = position + value.length;
                    let foundClosingQuote = false;

                    while( textStart < code.length ) {
                        let subText = code.substring( textStart );
                        let quoteMatch = /"/.exec( subText );

                        if( quoteMatch ) {
                            if( quoteMatch.index === 0 ) {
                                // Closing quote found immediately
                                const characters = code.substring( position + 1, textStart ); // Text between opening and closing quote
                                tokens.push( new Token( TokenType.STRING, characters, line, column + 1 ) );
                                tokens.push( new Token( TokenType.QUOTE, '"', line, column + 1 + characters.length + 1 ) );
                                position = textStart + quoteMatch.index + 1;
                                column += characters.length + 2; // +2 for the quotes
                                foundClosingQuote = true;
                                break;
                            } else {
                                // Closing quote found after some text
                                const characters = code.substring( textStart, textStart + quoteMatch.index ); // Text between quotes
                                tokens.push( new Token( TokenType.STRING, characters, line, column + 1 ) );
                                tokens.push( new Token( TokenType.QUOTE, '"', line, column + 1 + characters.length + 1 ) );
                                position = textStart + quoteMatch.index + 1;
                                column += characters.length + 2; // +2 for the quotes
                                foundClosingQuote = true;
                                break;
                            }
                        }

                        // Move to next character and update positions
                        textStart++;
                    }

                    // If no closing quote was found, treat the end of code as the end of the string
                    if( !foundClosingQuote ) {
                        const characters = code.substring( position + 1 ); // Text from opening quote to end of code
                        tokens.push( new Token( TokenType.STRING, characters, line, column + 1 ) );
                        tokens.push( new Token( TokenType.UNKNOWN, ' ', line, column + 1 + characters.length ) );
                        position = code.length;
                        column += characters.length + 1; // +1 for the closing quote
                    }
                } else if( type !== TokenType.WHITESPACE ) {
                    tokens.push( new Token( type, value, line, column ) );
                    column += value.length;
                    position += value.length;
                } else {
                    // Update line and column for whitespace
                    const lines = value.split( '\n' );
                    if( lines.length > 1 ) {
                        line += lines.length - 1;
                        column = lines[ lines.length - 1 ].length + 1;
                    } else {
                        column += value.length;
                    }
                    position += value.length;
                }

                break;
            }
        }
        if( !match ) {
            throw new Error( `Unexpected character: ${code[ position ]} at position ${position}` );
        }
    }

    return tokens;
}
