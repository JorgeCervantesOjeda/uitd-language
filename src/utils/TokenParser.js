import { tokenize } from './lexer';
import { TokenType } from './tokens';
import { getInnermostUI } from './utils';

export const validVerbs = [ 'clicks', 'submits', 'selects', 'types', 'toggles', 'uploads', 'downloads', 'saves', 'deletes', 'waits for' ];

class TokenParser {
    constructor( tokens ) {
        this.tokens = tokens;
    }

    getNextToken() {
        return this.tokens.getNext();
    }

    undoGetNextToken() {
        this.tokens.undoGetNextToken();
    }

    expectToken( type, value = null ) {
        const token = this.getNextToken();
        if( token.type !== type || ( value && token.value !== value ) ) {
            throw new Error( `Expected ${value || type}, but got ${token.value} at line ${token.line}, column ${token.column}` );
        }
        return token;
    }

    parse() {
        const result = {
            name: '',
            uis: [],
            fragments: [],
            errors: [],
        };

        let token = null;

        try {
            // Expect UITD Declaration
            this.expectToken( TokenType.KEYWORD, 'UITD' );
            const titleToken = this.expectToken( TokenType.STRING );
            result.name = titleToken.value.slice( 1, -1 );
            this.expectToken( TokenType.PUNCTUATION, '{' );

            // Enter UITD Section Loop
            token = this.getNextToken();
            while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
                if( token.type === TokenType.KEYWORD && token.value === 'UI' ) {
                    this.undoGetNextToken(); // Undo to correctly expect UI token in parseUI
                    this.parseUI( result );
                } else if( token.type === TokenType.KEYWORD && token.value === 'FRAGMENT' ) {
                    this.undoGetNextToken(); // Undo to correctly expect FRAGMENT token in parseFragment
                    this.parseFragment( result );
                } else {
                    throw new Error( `Unexpected token ${token.value} at line ${token.line}, column ${token.column}` );
                }
                token = this.getNextToken();
            }
        } catch( e ) {
            console.error( 'Error:', e );
            result.errors.push( {
                startLineNumber: token ? token.line : 0,
                lineNumber: token ? token.line : 0,
                startColumn: token ? token.column : 0,
                endColumn: token ? token.column + ( token.value ? token.value.length : 0 ) : 0,
                message: e.message
            } );
        }

        return result;
    }

    parseUI( result ) {
        const uiStartToken = this.expectToken( TokenType.KEYWORD, 'UI' );
        const idToken = this.expectToken( TokenType.NUMBER );
        const uiId = parseInt( idToken.value, 10 );
        const nameToken = this.expectToken( TokenType.STRING );
        const uiName = nameToken.value.slice( 1, -1 );
        this.expectToken( TokenType.KEYWORD, 'actions' );
        this.expectToken( TokenType.PUNCTUATION, '{' );

        const actions = [];
        let token = this.getNextToken();
        while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
            if( validVerbs.includes( token.value ) ) {
                const verb = token.value;
                const targetToken = this.expectToken( TokenType.STRING );
                const target = targetToken.value.slice( 1, -1 );
                actions.push( { verb, target, line: token.line, column: token.column } );
            } else {
                throw new Error( `Unexpected token ${token.value} in UI actions at line ${token.line}, column ${token.column}` );
            }
            token = this.getNextToken();
        }

        result.uis.push( {
            id: uiId,
            name: uiName,
            actions,
            line: uiStartToken.line,
            column: uiStartToken.column
        } );
    }

    parseFragment( result ) {
        const fragmentStartToken = this.expectToken( TokenType.KEYWORD, 'FRAGMENT' );
        const nameToken = this.expectToken( TokenType.STRING );
        const fragmentName = nameToken.value.slice( 1, -1 );
        this.expectToken( TokenType.PUNCTUATION, '{' );

        const draws = [];
        const transitions = [];
        let token = this.getNextToken();
        while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
            if( token.type === TokenType.KEYWORD && token.value === 'DRAW' ) {
                this.undoGetNextToken(); // Undo to correctly expect DRAW token in parseDraw
                this.parseDraw( draws );
            } else if( token.type === TokenType.KEYWORD && token.value === 'TRANSITION' ) {
                this.undoGetNextToken(); // Undo to correctly expect TRANSITION token in parseTransition
                this.parseTransition( transitions );
            } else {
                throw new Error( `Unexpected token ${token.value} in FRAGMENT at line ${token.line, token.column}` );
            }
            token = this.getNextToken();
        }

        result.fragments.push( {
            name: fragmentName,
            draws,
            transitions,
            line: fragmentStartToken.line,
            column: fragmentStartToken.column
        } );
    }

    parseDraw( draws ) {
        const drawToken = this.expectToken( TokenType.KEYWORD, 'DRAW' );
        this.expectToken( TokenType.PUNCTUATION, '{' );
        const uiRefs = this.parseUIRefList();
        this.expectToken( TokenType.PUNCTUATION, '}' );
        draws.push( { uiRefs, line: drawToken.line, column: drawToken.column } );
    }

    parseUIRefList() {
        const uiRefs = [];
        let token = this.getNextToken();

        while( !( token.type === TokenType.PUNCTUATION && ( token.value === '}' || token.value === ')' ) ) ) {
            this.undoGetNextToken();
            uiRefs.push( this.parseUIRef() );
            token = this.getNextToken();
            if( token.type === TokenType.PUNCTUATION && token.value === ',' ) {
                token = this.getNextToken();
            }
        }

        this.undoGetNextToken();
        return uiRefs;
    }

    parseUIRef() {
        const idToken = this.expectToken( TokenType.NUMBER );
        let uiRef = { id: idToken.value, nested: [] };
        const nextToken = this.getNextToken();
        if( nextToken.type === TokenType.PUNCTUATION && nextToken.value === '(' ) {
            uiRef.nested = this.parseUIRefList();
            this.expectToken( TokenType.PUNCTUATION, ')' );
        } else {
            this.undoGetNextToken();
        }
        return uiRef;
    }

    parseTransition( transitions ) {
        const startToken = this.expectToken( TokenType.KEYWORD, 'TRANSITION' );
        this.expectToken( TokenType.KEYWORD, 'from' );
        const from = this.parseUIRef();
        this.expectToken( TokenType.KEYWORD, 'to' );
        const to = this.parseUIRef();
        this.expectToken( TokenType.KEYWORD, 'if' );
        this.expectToken( TokenType.KEYWORD, 'user' );
        const actionToken = this.expectToken( TokenType.KEYWORD );
        const action = actionToken.value;
        const targetToken = this.expectToken( TokenType.STRING );
        const target = targetToken.value.slice( 1, -1 );

        let condition = '';
        const nextToken = this.getNextToken();
        if( nextToken.type === TokenType.KEYWORD && nextToken.value === 'AND' ) {
            const conditionToken = this.expectToken( TokenType.STRING );
            condition = conditionToken.value.slice( 1, -1 );
        } else {
            this.undoGetNextToken();
        }

        this.expectToken( TokenType.PUNCTUATION, ';' );

        transitions.push( {
            from,
            to,
            action,
            target,
            condition,
            line: startToken.line,
            column: startToken.column
        } );
    }
}

export function parseUITDL( text ) {
    const tokens = tokenize( text );
    console.log( 'Tokenized input:', tokens );
    const parser = new TokenParser( tokens );
    return parser.parse();
}
