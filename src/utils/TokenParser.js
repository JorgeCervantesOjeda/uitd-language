// TokenParser.js
import { tokenize } from './lexer';
import { TokenType } from './tokens';
import { getInnermostUIStr, getInnermostUIRef, formatUIRef } from './utils';
import { validateData } from './validation';

export const validVerbs = [
    'clicks', 'submits', 'selects', 'types', 'toggles',
    'uploads', 'downloads', 'saves', 'deletes', 'waits for'
];

class TokenParser {
    constructor( tokens ) {
        this.tokens = tokens;
        this.currentToken = null;
        this.result = null;
    }

    initializeResult() {
        this.result = {
            name: '',
            uis: [],
            fragments: [],
            errors: [],
        };
    }

    getNextToken() {
        this.currentToken = this.tokens.getNext();
        return this.currentToken;
    }

    undoGetNextToken() {
        this.currentToken = this.tokens.undoGetNextToken();
    }

    expectToken( type, value = null ) {
        const token = this.getNextToken();
        this.currentToken = token;

        if( type === TokenType.STRING ) {
            // Handle string tokens with preceding and following quote tokens
            if( token.type !== TokenType.QUOTE || ( value && token.value !== '"' ) ) {
                throw new Error( `Expected opening quote, but got ${token.value} at line ${token.line}, column ${token.column}` );
            }

            const stringToken = this.getNextToken();
            if( stringToken.type !== TokenType.STRING ) {
                throw new Error( `Expected string, but got ${stringToken.value} at line ${stringToken.line}, column ${stringToken.column}` );
            }

            const closingQuoteToken = this.getNextToken();
            if( closingQuoteToken.type !== TokenType.QUOTE || ( value && closingQuoteToken.value !== '"' ) ) {
                throw new Error( `Expected closing quote, but got ${closingQuoteToken.value} at line ${closingQuoteToken.line}, column ${closingQuoteToken.column}` );
            }

            // Correct the string token if it has double spaces
            if( stringToken.value.includes( '  ' ) ) {
                stringToken.value = stringToken.value.replace( / {2,}/g, ' ' );
                this.result.errors.push( {
                    severity: 4,
                    startLineNumber: stringToken.line,
                    lineNumber: stringToken.line,
                    startColumn: stringToken.column,
                    endColumn: stringToken.column + stringToken.value.length,
                    message: 'Double space',
                } );
            }

            return stringToken;
        }

        if( token.type !== type || ( value && token.value !== value ) ) {
            throw new Error( `Expected ${value || type}, but got ${token.value} at line ${token.line}, column ${token.column}` );
        }

        return token;
    }

    handleParsingError( e ) {
        console.error( 'Error:', e );
        const token = this.currentToken;
        this.result.errors.push( {
            severity: 8,
            startLineNumber: token ? token.line : 0,
            lineNumber: token ? token.line : 0,
            startColumn: token ? token.column : 0,
            endColumn: token ? token.column + ( token.value ? token.value.length : 0 ) : 0,
            message: e.message
        } );
    }

    parse() {
        this.initializeResult();

        try {
            // Expect UITD Declaration
            this.expectToken( TokenType.KEYWORD, 'UITD' );
            const titleToken = this.expectToken( TokenType.STRING );
            this.result.name = titleToken.value;
            this.expectToken( TokenType.PUNCTUATION, '{' );

            // Enter UITD Section Loop
            let token = this.getNextToken();
            while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
                try {
                    if( token.type === TokenType.KEYWORD && token.value === 'UI' ) {
                        this.undoGetNextToken();
                        this.parseUI();
                    } else if( token.type === TokenType.KEYWORD && token.value === 'FRAGMENT' ) {
                        this.undoGetNextToken();
                        this.parseFragment();
                    } else {
                        throw new Error( `Unexpected token ${token.value} at line ${token.line}, column ${token.column}` );
                    }
                    token = this.getNextToken();
                } catch( e ) {
                    this.handleParsingError( e );
                    break; // Exit the loop on error
                }
            }
        } catch( e ) {
            this.handleParsingError( e );
        }

        // Process transitions to set the `full` field
        this.processFullField();

        // Incorporate validation errors
        const validationErrors = validateData( this.result );
        this.result.errors = [ ...this.result.errors, ...validationErrors ];

        return this.result;
    }

    parseUI() {
        try {
            const uiStartToken = this.expectToken( TokenType.KEYWORD, 'UI' );
            const idToken = this.expectToken( TokenType.NUMBER );
            const uiId = parseInt( idToken.value, 10 );
            const nameToken = this.expectToken( TokenType.STRING );
            const uiName = nameToken.value;
            this.expectToken( TokenType.KEYWORD, 'actions' );
            this.expectToken( TokenType.PUNCTUATION, '{' );

            const actions = [];
            let token = this.getNextToken();
            while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
                if( validVerbs.includes( token.value ) ) {
                    const verb = token.value;
                    const targetToken = this.expectToken( TokenType.STRING );
                    const target = targetToken.value;
                    actions.push( { verb, target, line: token.line, column: token.column } );
                    this.expectToken( TokenType.PUNCTUATION, ';' );
                } else {
                    throw new Error( `Unexpected token ${token.value} in UI actions at line ${token.line}, column ${token.column}` );
                }
                token = this.getNextToken();
            }

            this.result.uis.push( {
                id: uiId,
                name: uiName,
                actions,
                line: uiStartToken.line,
                column: uiStartToken.column
            } );
        } catch( e ) {
            this.handleParsingError( e );
        }
    }

    parseFragment() {
        try {
            const fragmentStartToken = this.expectToken( TokenType.KEYWORD, 'FRAGMENT' );
            const nameToken = this.expectToken( TokenType.STRING );
            const fragmentName = nameToken.value;
            this.expectToken( TokenType.PUNCTUATION, '{' );

            const draws = [];
            const transitions = [];
            let token = this.getNextToken();
            while( token.type !== TokenType.PUNCTUATION || token.value !== '}' ) {
                try {
                    if( token.type === TokenType.KEYWORD && token.value === 'DRAW' ) {
                        this.undoGetNextToken();
                        this.parseDraw( draws );
                    } else if( token.type === TokenType.KEYWORD && token.value === 'TRANSITION' ) {
                        this.undoGetNextToken();
                        this.parseTransition( transitions );
                    } else {
                        throw new Error( `Unexpected token ${token.value} in FRAGMENT at line ${token.line}, column ${token.column}` );
                    }
                    token = this.getNextToken();
                } catch( e ) {
                    this.handleParsingError( e );
                    break; // Exit the loop on error
                }
            }

            this.result.fragments.push( {
                name: fragmentName,
                draws,
                transitions,
                line: fragmentStartToken.line,
                column: fragmentStartToken.column
            } );
        } catch( e ) {
            this.handleParsingError( e );
        }
    }

    parseDraw( draws ) {
        try {
            const drawToken = this.expectToken( TokenType.KEYWORD, 'DRAW' );
            this.expectToken( TokenType.PUNCTUATION, '{' );
            const uiRefs = this.parseUIRefList();
            this.expectToken( TokenType.PUNCTUATION, '}' );
            this.expectToken( TokenType.PUNCTUATION, ';' );
            draws.push( { uiRefs, line: drawToken.line, column: drawToken.column } );
        } catch( e ) {
            this.handleParsingError( e );
        }
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
        let uiRef = { id: idToken.value, nested: [], full: false };
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
        try {
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
            const target = targetToken.value;

            let condition = '';
            const nextToken = this.getNextToken();
            if( nextToken.type === TokenType.KEYWORD && nextToken.value === 'AND' ) {
                const conditionToken = this.expectToken( TokenType.STRING );
                condition = conditionToken.value;
            } else {
                this.undoGetNextToken();
            }

            let width = null;
            const nextWidthToken = this.getNextToken();
            if( nextWidthToken.type === TokenType.KEYWORD && nextWidthToken.value === 'width' ) {
                const widthToken = this.expectToken( TokenType.NUMBER );
                width = parseInt( widthToken.value, 10 );
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
                width,  // Add width to the transition object
                line: startToken.line,
                column: startToken.column
            } );
        } catch( e ) {
            this.handleParsingError( e );
        }
    }

    processFullField() {
        const allTransitions = this.gatherAllTransitions();

        this.result.fragments.forEach( fragment => {
            const fragmentTransitions = this.gatherFragmentTransitions( fragment );

            const processRef = ( ref, parentId = null ) => {
                const refIdStr = parentId ? `${parentId}(${ref.id})` : ref.id;

                const innermostId = getInnermostUIStr( refIdStr );
                const allTransitionsSet = allTransitions[ innermostId ] || new Set();
                const fragmentTransitionsSet = fragmentTransitions[ refIdStr ] || new Set();

                if( allTransitionsSet.size > 0 && allTransitionsSet.size === fragmentTransitionsSet.size ) {
                    ref.full = true;
                } else {
                    ref.full = false;
                }

                ref.nested.forEach( nestedRef => processRef( nestedRef, ref.id ) );
            };

            fragment.draws.forEach( ( { uiRefs } ) => {
                uiRefs.forEach( ref => {
                    processRef( ref, null );
                } );
            } );
        } );
    }

    gatherAllTransitions() {
        const uiTransitions = {};

        this.result.fragments.forEach( fragment => {
            fragment.transitions.forEach( transition => {
                const fromUI = getInnermostUIRef( transition.from );
                const toUI = getInnermostUIRef( transition.to );

                if( !uiTransitions[ fromUI ] ) {
                    uiTransitions[ fromUI ] = new Set();
                }
                if( !uiTransitions[ toUI ] ) {
                    uiTransitions[ toUI ] = new Set();
                }

                const transitionStr = `${fromUI}->${toUI}:${transition.action} "${transition.target}" ${transition.condition ? 'AND\n(' + transition.condition + ')' : ''}`;
                uiTransitions[ fromUI ].add( transitionStr );
                uiTransitions[ toUI ].add( transitionStr );
            } );
        } );

        return uiTransitions;
    }

    gatherFragmentTransitions( fragment ) {
        const fragmentTransitions = {};

        fragment.transitions.forEach( transition => {
            const fromKey = formatUIRef( transition.from );
            const toKey = formatUIRef( transition.to );

            if( !fragmentTransitions[ fromKey ] ) {
                fragmentTransitions[ fromKey ] = new Set();
            }
            if( !fragmentTransitions[ toKey ] ) {
                fragmentTransitions[ toKey ] = new Set();
            }

            const transitionStr = `${fromKey}->${toKey}:${transition.action} "${transition.target}" ${transition.condition ? 'AND\n(' + transition.condition + ')' : ''}`;
            fragmentTransitions[ fromKey ].add( transitionStr );
            fragmentTransitions[ toKey ].add( transitionStr );
        } );

        return fragmentTransitions;
    }
}

export function parseUITDL( text ) {
    const tokens = tokenize( text );
    const parser = new TokenParser( tokens );
    const parsed = parser.parse();
    return parsed;
}
