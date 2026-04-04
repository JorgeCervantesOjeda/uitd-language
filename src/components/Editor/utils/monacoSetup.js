import { parseUITDL, validVerbs } from '../../../index.js';

const uiBlockPattern = /UI\s+(\d+)\s+"([^"]*)"\s+actions\s*\{([\s\S]*?)\}/g;
const actionPattern = new RegExp(
    `\\b(${validVerbs.map( verb => verb.replace(
 /[.*+?^${}()|[\]\\]/g,
'\\$&' 
) )
        .join( '|' )})\\s+"([^"]*)"\\s*;`,
    'g'
);

const mergeUIContexts = ( parsedUIs = [], regexUIs = [] ) => {
    const uiMap = new Map();

    const ensureUI = ( ui ) => {
        const uiId = ui.id.toString();

        if( !uiMap.has( uiId ) ) {
            uiMap.set(
 uiId,
{
                id: uiId,
                name: ui.name || '',
                actions: []
            } 
);
        }

        const currentUI = uiMap.get( uiId );

        if( !currentUI.name && ui.name ) {
            currentUI.name = ui.name;
        }

        ( ui.actions || [] ).forEach( action => {
            const alreadyExists = currentUI.actions.some( existingAction =>
                existingAction.verb === action.verb &&
                existingAction.target === action.target );

            if( !alreadyExists ) {
                currentUI.actions.push( {
                    verb: action.verb,
                    target: action.target
                } );
            }
        } );
    };

    parsedUIs.forEach( ensureUI );
    regexUIs.forEach( ensureUI );

    return [ ...uiMap.values() ]
        .sort( ( left, right ) => Number( left.id ) - Number( right.id ) );
};

const collectUIContext = ( text ) => {
    let parsedUIs = [];

    try {
        parsedUIs = parseUITDL( text )?.uis ?? [];
    } catch( error ) {
        void error;
    }

    const regexUIs = [];
    let uiMatch;

    uiBlockPattern.lastIndex = 0;
    while( ( uiMatch = uiBlockPattern.exec( text ) ) !== null ) {
        const [ , id, name, actionsBlock ] = uiMatch;
        const actions = [];
        let actionMatch;

        actionPattern.lastIndex = 0;
        while( ( actionMatch = actionPattern.exec( actionsBlock ) ) !== null ) {
            actions.push( {
                verb: actionMatch[ 1 ],
                target: actionMatch[ 2 ]
            } );
        }

        regexUIs.push( {
            id,
            name,
            actions
        } );
    }

    return mergeUIContexts(
 parsedUIs,
regexUIs 
);
};

const getInnermostUIId = ( uiRef ) => {
    const ids = uiRef.match( /\d+/g );

    if( !ids || ids.length === 0 ) {
        return null;
    }

    return ids[ ids.length - 1 ];
};

const formatTransitionUIRef = ( pathIds ) => pathIds.reduceRight(
    ( nestedRef, id ) => ( nestedRef === null ? id : `${id}(${nestedRef})` ),
    null
);

const buildReferenceSortText = ( reference ) => {
    const numericParts = reference.match( /\d+/g ) ?? [ reference ];

    return numericParts.map( part => part.padStart(
        8,
        '0'
    ) )
        .join( '.' );
};

const getLineStartOffsets = ( text ) => {
    const offsets = [ 0 ];

    for( let index = 0; index < text.length; index++ ) {
        if( text[ index ] === '\n' ) {
            offsets.push( index + 1 );
        }
    }

    return offsets;
};

const getLineNumberAtOffset = ( offset, lineStartOffsets ) => {
    let left = 0;
    let right = lineStartOffsets.length - 1;

    while( left <= right ) {
        const middle = Math.floor( ( left + right ) / 2 );
        const lineStart = lineStartOffsets[ middle ];
        const nextLineStart = lineStartOffsets[ middle + 1 ] ?? Number.POSITIVE_INFINITY;

        if( offset >= lineStart && offset < nextLineStart ) {
            return middle + 1;
        }

        if( offset < lineStart ) {
            right = middle - 1;
        } else {
            left = middle + 1;
        }
    }

    return lineStartOffsets.length;
};

const getOffsetAtPosition = ( position, lineStartOffsets ) =>
    ( lineStartOffsets[ position.lineNumber - 1 ] ?? 0 ) + position.column - 1;

const findFragmentBlocks = ( text ) => {
    const fragmentPattern = /FRAGMENT\s+"[^"]*"\s*\{/g;
    const lineStartOffsets = getLineStartOffsets( text );
    const fragments = [];
    let fragmentMatch;

    while( ( fragmentMatch = fragmentPattern.exec( text ) ) !== null ) {
        const openBraceIndex = text.indexOf(
 '{',
fragmentMatch.index 
);

        if( openBraceIndex < 0 ) {
            continue;
        }

        let depth = 0;
        let endIndex = text.length - 1;

        for( let index = openBraceIndex; index < text.length; index++ ) {
            if( text[ index ] === '{' ) {
                depth++;
            } else if( text[ index ] === '}' ) {
                depth--;
                if( depth === 0 ) {
                    endIndex = index;
                    break;
                }
            }
        }

        fragments.push( {
            startLine: getLineNumberAtOffset(
                fragmentMatch.index,
                lineStartOffsets
            ),
            endLine: getLineNumberAtOffset(
                endIndex,
                lineStartOffsets
            ),
            text: text.slice(
 fragmentMatch.index,
endIndex + 1 
)
        } );
    }

    return fragments;
};

const parseDrawRefList = ( input ) => {
    let index = 0;

    const skipWhitespace = () => {
        while( index < input.length && /\s/.test( input[ index ] ) ) {
            index++;
        }
    };

    const parseList = ( closingToken = null ) => {
        const refs = [];

        while( index < input.length ) {
            skipWhitespace();

            if( closingToken && input[ index ] === closingToken ) {
                index++;
                break;
            }

            const idMatch = input.slice( index )
                .match( /^\d+/ );

            if( !idMatch ) {
                break;
            }

            index += idMatch[ 0 ].length;
            const ref = {
                id: idMatch[ 0 ],
                nested: []
            };

            skipWhitespace();

            if( input[ index ] === '[' || input[ index ] === '(' ) {
                const openingToken = input[ index ];
                const closingNestedToken = openingToken === '[' ? ']' : ')';
                index++;
                ref.nested = parseList( closingNestedToken );
            }

            refs.push( ref );
            skipWhitespace();

            if( input[ index ] === ',' ) {
                index++;
                continue;
            }

            if( closingToken && input[ index ] === closingToken ) {
                index++;
                break;
            }
        }

        return refs;
    };

    return parseList();
};

const collectTransitionRefsFromDrawRefs = ( drawRefs ) => {
    const refs = new Set();

    const visit = ( ref, ancestors = [] ) => {
        const currentPath = [ ...ancestors, ref.id.toString() ];

        refs.add( formatTransitionUIRef( currentPath ) );
        ref.nested.forEach( nestedRef => visit(
 nestedRef,
currentPath 
) );
    };

    drawRefs.forEach( drawRef => visit( drawRef ) );

    return [ ...refs ].sort( ( left, right ) => {
        const depthDiff = ( left.match( /\(/g ) || [] ).length -
            ( right.match( /\(/g ) || [] ).length;

        if( depthDiff !== 0 ) {
            return depthDiff;
        }

        return left.localeCompare(
 right,
undefined,
{ numeric: true } 
);
    } );
};

const getCurrentFragmentTransitionRefs = ( text, lineNumber ) => {
    const currentFragment = findFragmentBlocks( text )
        .find( fragment => lineNumber >= fragment.startLine && lineNumber <= fragment.endLine );

    if( !currentFragment ) {
        return [];
    }

    const drawPattern = /DRAW\s*\{([^}]*)\}\s*;/g;
    const drawRefs = [];
    let drawMatch;

    while( ( drawMatch = drawPattern.exec( currentFragment.text ) ) !== null ) {
        drawRefs.push( ...parseDrawRefList( drawMatch[ 1 ] ) );
    }

    return collectTransitionRefsFromDrawRefs( drawRefs );
};

const buildUIReferenceSuggestions = (
    references,
    uiContext,
    range,
    monacoInstance,
    currentFragmentOnly = false,
    filterPrefix = ''
) => {
    const uiMap = new Map( uiContext.map( ui => [ ui.id, ui ] ) );

    return references.map( reference => {
        const innermostUIId = getInnermostUIId( reference ) || reference;
        const ui = uiMap.get( innermostUIId );
        const labelSuffix = ui?.name ? ` - ${ui.name}` : '';

        return {
            label: `${reference}${labelSuffix}`,
            kind: monacoInstance.languages.CompletionItemKind.Reference,
            insertText: reference,
            detail: currentFragmentOnly ?
                `Reference from current DRAW${labelSuffix}` :
                `UI ${reference}${labelSuffix}`,
            documentation: currentFragmentOnly ?
                `Valid transition reference in the current fragment${labelSuffix}` :
                `Defined UI ${reference}${labelSuffix}`,
            filterText: `${filterPrefix} ${reference} ${ui?.name || ''}`.trim(),
            sortText: buildReferenceSortText( reference ),
            range
        };
    } );
};

const buildCompletionRange = ( monacoInstance, position, transitionContext ) => {
    const replaceRange = new monacoInstance.Range(
        position.lineNumber,
        transitionContext.rangeStartColumn,
        position.lineNumber,
        transitionContext.rangeEndColumn ?? position.column
    );

    if( ( transitionContext.rangeEndColumn ?? position.column ) > position.column ) {
        return {
            insert: new monacoInstance.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
            ),
            replace: replaceRange
        };
    }

    return replaceRange;
};

const getHoverReferenceRange = ( lineContent, position ) => {
    const transitionContext = getTransitionContext(
        lineContent,
        position
    );

    if(
        transitionContext &&
        ( transitionContext.type === 'transition-from' ||
            transitionContext.type === 'transition-to' )
    ) {
        return {
            startColumn: transitionContext.rangeStartColumn,
            endColumn: transitionContext.rangeEndColumn ?? position.column
        };
    }

    return null;
};

const getTransitionContext = ( lineContent, position ) => {
    const cursorIndex = position.column - 1;
    const completedTransitionMatch = lineContent.match( /(\bTRANSITION\s+from\s+)([0-9()]+)(\s+to\s+)([0-9()]+)(\s+if\s+user\s+)([A-Za-z]+)(\s+")([^"]*)(")/ );

    if( completedTransitionMatch ) {
        const matchStart = completedTransitionMatch.index ?? 0;
        const fromStart = matchStart + completedTransitionMatch[ 1 ].length;
        const fromEnd = fromStart + completedTransitionMatch[ 2 ].length;
        const toStart = fromEnd + completedTransitionMatch[ 3 ].length;
        const toEnd = toStart + completedTransitionMatch[ 4 ].length;
        const actionStart = toEnd + completedTransitionMatch[ 5 ].length;
        const actionEnd = actionStart + completedTransitionMatch[ 6 ].length;
        const targetStart = actionEnd + completedTransitionMatch[ 7 ].length;
        const targetEnd = targetStart + completedTransitionMatch[ 8 ].length;

        if( cursorIndex >= fromStart && cursorIndex <= fromEnd ) {
            return {
                type: 'transition-from',
                rangeStartColumn: fromStart + 1,
                rangeEndColumn: fromEnd + 1,
                filterPrefix: lineContent.slice(
 fromStart,
cursorIndex 
)
            };
        }

        if( cursorIndex >= toStart && cursorIndex <= toEnd ) {
            return {
                type: 'transition-to',
                rangeStartColumn: toStart + 1,
                rangeEndColumn: toEnd + 1,
                filterPrefix: lineContent.slice(
 toStart,
cursorIndex 
)
            };
        }

        if( cursorIndex >= actionStart && cursorIndex <= actionEnd ) {
            return {
                type: 'transition-action',
                fromRef: completedTransitionMatch[ 2 ],
                rangeStartColumn: actionStart + 1,
                rangeEndColumn: actionEnd + 1,
                insertTargetSnippet: false,
                filterPrefix: lineContent.slice(
 actionStart,
cursorIndex 
)
            };
        }

        if( cursorIndex >= targetStart && cursorIndex <= targetEnd ) {
            return {
                type: 'transition-target',
                fromRef: completedTransitionMatch[ 2 ],
                verb: completedTransitionMatch[ 6 ],
                rangeStartColumn: targetStart + 1,
                rangeEndColumn: targetEnd + 1,
                filterPrefix: lineContent.slice(
 targetStart,
cursorIndex 
)
            };
        }
    }

    const lineUntilCursor = lineContent.slice(
 0,
cursorIndex 
);
    const targetMatch = lineUntilCursor.match( /\bTRANSITION\s+from\s+([0-9()]+)\s+to\s+[0-9()]+\s+if\s+user\s+([A-Za-z]+)\s+"([^"]*)$/ );

    if( targetMatch ) {
        return {
            type: 'transition-target',
            fromRef: targetMatch[ 1 ],
            verb: targetMatch[ 2 ],
            rangeStartColumn: position.column - targetMatch[ 3 ].length,
            rangeEndColumn: position.column,
            filterPrefix: targetMatch[ 3 ]
        };
    }

    const actionMatch = lineUntilCursor.match( /\bTRANSITION\s+from\s+([0-9()]+)\s+to\s+[0-9()]+\s+if\s+user\s+([A-Za-z]*)$/ );

    if( actionMatch ) {
        return {
            type: 'transition-action',
            fromRef: actionMatch[ 1 ],
            rangeStartColumn: position.column - actionMatch[ 2 ].length,
            rangeEndColumn: position.column,
            insertTargetSnippet: !lineContent.slice( cursorIndex )
                .includes( '"' ),
            filterPrefix: actionMatch[ 2 ]
        };
    }

    const toMatch = lineUntilCursor.match( /\bTRANSITION\s+from\s+[0-9()]+\s+to\s+([0-9()]*)$/ );

    if( toMatch ) {
        return {
            type: 'transition-to',
            rangeStartColumn: position.column - toMatch[ 1 ].length,
            rangeEndColumn: position.column,
            filterPrefix: toMatch[ 1 ]
        };
    }

    const fromMatch = lineUntilCursor.match( /\bTRANSITION\s+from\s+([0-9()]*)$/ );

    if( fromMatch ) {
        return {
            type: 'transition-from',
            rangeStartColumn: position.column - fromMatch[ 1 ].length,
            rangeEndColumn: position.column,
            filterPrefix: fromMatch[ 1 ]
        };
    }

    return null;
};

const getDrawContext = ( text, position ) => {
    const drawPattern = /DRAW\s*\{/g;
    const lineStartOffsets = getLineStartOffsets( text );
    const cursorOffset = getOffsetAtPosition(
        position,
        lineStartOffsets
    );
    let drawMatch;

    while( ( drawMatch = drawPattern.exec( text ) ) !== null ) {
        const openBraceIndex = text.indexOf(
 '{',
drawMatch.index 
);

        if( openBraceIndex < 0 ) {
            continue;
        }

        let depth = 0;
        let closeBraceIndex = -1;

        for( let index = openBraceIndex; index < text.length; index++ ) {
            if( text[ index ] === '{' ) {
                depth++;
            } else if( text[ index ] === '}' ) {
                depth--;
                if( depth === 0 ) {
                    closeBraceIndex = index;
                    break;
                }
            }
        }

        if( closeBraceIndex < 0 ) {
            continue;
        }

        if( cursorOffset < openBraceIndex + 1 || cursorOffset > closeBraceIndex ) {
            continue;
        }

        let tokenStart = cursorOffset;
        let tokenEnd = cursorOffset;

        while( tokenStart > openBraceIndex + 1 && /\d/.test( text[ tokenStart - 1 ] ) ) {
            tokenStart--;
        }

        while( tokenEnd < closeBraceIndex && /\d/.test( text[ tokenEnd ] ) ) {
            tokenEnd++;
        }

        const startLine = getLineNumberAtOffset(
            tokenStart,
            lineStartOffsets
        );
        const endLine = getLineNumberAtOffset(
            tokenEnd,
            lineStartOffsets
        );

        if( startLine !== position.lineNumber || endLine !== position.lineNumber ) {
            return {
                type: 'draw-ui',
                rangeStartColumn: position.column,
                rangeEndColumn: position.column,
                filterPrefix: ''
            };
        }

        return {
            type: 'draw-ui',
            rangeStartColumn: tokenStart - lineStartOffsets[ startLine - 1 ] + 1,
            rangeEndColumn: tokenEnd - lineStartOffsets[ endLine - 1 ] + 1,
            filterPrefix: text.slice(
                tokenStart,
                cursorOffset
            )
        };
    }

    return null;
};

const buildUIHoverContents = ( ui, reference ) => {
    if( !ui ) {
        return [];
    }

    const header = ui.name ?
        `**UI ${ui.id}**\n\n${ui.name}` :
        `**UI ${ui.id}**`;

    if( !reference || reference === ui.id ) {
        return [ { value: header } ];
    }

    return [
        { value: header },
        { value: `Ref: \`${reference}\`` }
    ];
};

export const getAutocompleteContextAtPosition = ( model, position ) => {
    if( !model || !position ) {
        return null;
    }

    const text = model.getValue();
    const lineContent = model.getLineContent( position.lineNumber );
    return getTransitionContext(
        lineContent,
        position
    ) || getDrawContext(
        text,
        position
    );
};

const buildStaticSuggestions = ( monacoInstance ) => [
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
        triggerCharacters: [ ' ', '"', '(', '[', '{', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ],
        provideCompletionItems: ( model, position ) => {
            const text = model.getValue();
            const uiContext = collectUIContext( text );
            const transitionContext = getAutocompleteContextAtPosition(
                model,
                position
            );

            if( transitionContext ) {
                const range = buildCompletionRange(
                    monacoInstance,
                    position,
                    transitionContext
                );

                if( uiContext.length === 0 ) {
                    return { suggestions: [] };
                }

                if( transitionContext.type === 'transition-from' ||
                    transitionContext.type === 'transition-to' ) {
                    const currentFragmentRefs = getCurrentFragmentTransitionRefs(
                        text,
                        position.lineNumber
                    );
                    const suggestions = currentFragmentRefs.length > 0 ?
                        buildUIReferenceSuggestions(
                            currentFragmentRefs,
                            uiContext,
                            range,
                            monacoInstance,
                            true,
                            transitionContext.filterPrefix || ''
                        ) :
                        buildUIReferenceSuggestions(
                            uiContext.map( ui => ui.id ),
                            uiContext,
                            range,
                            monacoInstance,
                            false,
                            transitionContext.filterPrefix || ''
                        );

                    return { suggestions };
                }

                if( transitionContext.type === 'draw-ui' ) {
                    return {
                        suggestions: buildUIReferenceSuggestions(
                            uiContext.map( ui => ui.id ),
                            uiContext,
                            range,
                            monacoInstance,
                            false,
                            transitionContext.filterPrefix || ''
                        )
                    };
                }

                const fromUIId = getInnermostUIId( transitionContext.fromRef );
                const originUI = uiContext.find( ui => ui.id === fromUIId );

                if( transitionContext.type === 'transition-action' && originUI ) {
                    const verbs = [ ...new Set( originUI.actions.map( action => action.verb ) ) ];
                    const suggestions = verbs.map( verb => ( {
                        label: verb,
                        kind: monacoInstance.languages.CompletionItemKind.Keyword,
                        insertText: transitionContext.insertTargetSnippet === false ?
                            verb :
                            verb + ' "${1:target}"',
                        insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        detail: originUI.name ? `Action from UI ${originUI.id} - ${originUI.name}` : `Action from UI ${originUI.id}`,
                        documentation: `Action defined in the origin UI ${originUI.id}`,
                        filterText: `${transitionContext.filterPrefix || ''} ${verb}`.trim(),
                        range
                    } ) );

                    return { suggestions };
                }

                if( transitionContext.type === 'transition-target' && originUI ) {
                    const targets = [ ...new Set( originUI.actions
                            .filter( action => action.verb === transitionContext.verb )
                            .map( action => action.target ) ) ];
                    const suggestions = targets.map( target => ( {
                        label: target,
                        kind: monacoInstance.languages.CompletionItemKind.Value,
                        insertText: target,
                        detail: originUI.name ? `Target from UI ${originUI.id} - ${originUI.name}` : `Target from UI ${originUI.id}`,
                        documentation: `Target defined for ${transitionContext.verb} in UI ${originUI.id}`,
                        filterText: `${transitionContext.filterPrefix || ''} ${target}`.trim(),
                        range
                    } ) );

                    return { suggestions };
                }
            }

            return { suggestions: buildStaticSuggestions( monacoInstance ) };
        },
    } 
);

    monacoInstance.languages.registerHoverProvider(
 'uitdl',
{
        provideHover: ( model, position ) => {
            const word = model.getWordAtPosition( position );

            if( !word || !/^\d+$/.test( word.word ) ) {
                return null;
            }

            const context = getAutocompleteContextAtPosition(
                model,
                position
            );

            if(
                !context ||
                ( context.type !== 'transition-from' &&
                    context.type !== 'transition-to' &&
                    context.type !== 'draw-ui' )
            ) {
                return null;
            }

            const text = model.getValue();
            const uiContext = collectUIContext( text );
            const ui = uiContext.find( candidate => candidate.id === word.word );

            if( !ui ) {
                return null;
            }

            const lineContent = model.getLineContent( position.lineNumber );
            const hoverRange = getHoverReferenceRange(
                lineContent,
                position
            );
            const reference = hoverRange ?
                lineContent.slice(
                    hoverRange.startColumn - 1,
                    hoverRange.endColumn - 1
                )
                    .trim() :
                word.word;

            return {
                range: new monacoInstance.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn
                ),
                contents: buildUIHoverContents(
                    ui,
                    reference
                )
            };
        }
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
