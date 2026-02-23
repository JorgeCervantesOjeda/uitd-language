import { getInnermostUIRef, formatUIRef } from './utils';

export const validateData = ( parsedData ) => {
    const markers = [];
    const uiNames = new Set();
    const fragmentNames = new Set();
    const uiIds = new Set();

    
    // Check if at least 1 UI is defined
    if( parsedData.uis.length === 0 ) {
        markers.push( {
            severity: 8,
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 1,
            message: `There are no UIs defined.`,
        } );
    }

    // Check for UIs with no actions and duplicate UI names
    parsedData.uis.forEach( ui => {
        if( ui.actions.length === 0 ) {
            markers.push( {
                severity: 4,
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `UI ${ui.id} has no actions defined.`,
            } );
        }
        if( uiIds.has( ui.id.toString() ) ) {
            markers.push( {
                severity: 8,
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `Duplicate UI Id: ${ui.id.toString()}.`,
            } );
        } else {
            uiIds.add( ui.id.toString() );
        }
        if( uiNames.has( ui.name ) ) {
            markers.push( {
                severity: 8,
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `Duplicate UI name: ${ui.name}.`,
            } );
        } else {
            uiNames.add( ui.name );
        }
    } );

    // Check for duplicate fragment names
    parsedData.fragments.forEach( fragment => {
        if( fragmentNames.has( fragment.name ) ) {
            markers.push( {
                severity: 8,
                startLineNumber: fragment.line,
                startColumn: fragment.column,
                endLineNumber: fragment.line,
                endColumn: fragment.column + fragment.name.length,
                message: `Duplicate fragment name: ${fragment.name}.`,
            } );
        } else {
            fragmentNames.add( fragment.name );
        }
    } );

    // Check for undrawn UIs referenced in transitions and duplicate transitions
    parsedData.fragments.forEach( fragment => {
        const drawnUIs = new Set();
        const uniqueTransitions = new Set(); // Track unique transitions
        const transitionsByAction = new Map();

        const collectDrawnUIs = ( ref ) => {
            drawnUIs.add( ref.id.toString() );
            ref.nested.forEach( nestedRef => collectDrawnUIs( nestedRef ) );
        };

        fragment.draws.forEach( ( { uiRefs } ) => {
            uiRefs.forEach( ref => {
                collectDrawnUIs( ref );
            } );
        } );

        // Detect ambiguous transitions:
        // same origin + action + target with one unconditional and one/more conditional transitions.
        fragment.transitions.forEach( transition => {
            const fromRef = formatUIRef( transition.from );
            const actionKey = `${fromRef}:${transition.action}:${transition.target}`;
            const list = transitionsByAction.get( actionKey ) || [];
            list.push( transition );
            transitionsByAction.set( actionKey, list );
        } );

        transitionsByAction.forEach( ( list, actionKey ) => {
            if( list.length < 2 ) return;
            const hasUnconditional = list.some( t => !( t.condition || '' ).trim() );
            const hasConditional = list.some( t => ( t.condition || '' ).trim() );
            if( !hasUnconditional || !hasConditional ) return;

            list.forEach( transition => {
                markers.push( {
                    severity: 8,
                    startLineNumber: transition.line,
                    startColumn: transition.verbColumn,
                    endLineNumber: transition.line,
                    endColumn: transition.verbColumn + transition.action.length + 1 + 1 + transition.target.length + 1,
                    message: `Ambiguous transitions for ${actionKey}: an unconditional transition overlaps with conditional transition(s).`,
                    code: 'ambiguous-transition'
                } );
            } );
        } );

        fragment.transitions.forEach( transition => {
            // Use fromUI, toUI, and actionKey as requested
            const fromUI = getInnermostUIRef( transition.from );
            const toUI = getInnermostUIRef( transition.to );
            const actionKey = `${fromUI}:${transition.action}:${transition.target}:${transition.condition || ''}`;

            // Check for duplicate transitions (same 'from' UI, action, and condition)
            if( uniqueTransitions.has( actionKey ) ) {
                markers.push( {
                    severity: 8,
                    startLineNumber: transition.line,
                    startColumn: transition.column,
                    endLineNumber: transition.line,
                    endColumn: transition.column + 20,
                    message: `Duplicate transition found from ${fromUI}, action ${transition.action} "${transition.target}"` +
                        ( transition.condition ? ` AND "${transition.condition}"` : '' ) + '.',
                } );
            } else {
                uniqueTransitions.add( actionKey );
            }

            // Check if 'from' and 'to' UIs are drawn in the fragment
            const checkUI = ( uiRef, uiId ) => {
                if( !drawnUIs.has( uiId ) ) {
                    const uiRefString = formatUIRef( uiRef );
                    markers.push( {
                        severity: 8,
                        startLineNumber: transition.line,
                        startColumn: transition.column + 16,
                        endLineNumber: transition.line,
                        endColumn: transition.column + 16 + uiRefString.length + 4 + 2,
                        message: `Undrawn UI ${uiRefString} referenced in transition.`,
                    } );
                }
            };
            checkUI( transition.from, fromUI );
            checkUI( transition.to, toUI );

            // Check if the 'from' and 'to' UIs exist
            const fromUIExists = uiIds.has( fromUI );
            const toUIExists = uiIds.has( toUI );

            if( !fromUIExists ) {
                const uiRefString = formatUIRef( transition.from );
                markers.push( {
                    severity: 8,
                    startLineNumber: transition.line,
                    startColumn: transition.column,
                    endLineNumber: transition.line,
                    endColumn: transition.column + 16 + uiRefString.length,
                    message: `Referenced 'from' UI ${uiRefString} does not exist.`,
                } );
            }

            if( !toUIExists ) {
                const uiRefString = formatUIRef( transition.to );
                markers.push( {
                    severity: 8,
                    startLineNumber: transition.line,
                    startColumn: transition.column,
                    endLineNumber: transition.line,
                    endColumn: transition.column + 16 + uiRefString.length,
                    message: `Referenced 'to' UI ${uiRefString} does not exist.`,
                } );
            }

            // Validate that transition actions are defined in the origin UI
            const originUI = parsedData.uis.find( ui => ui.id.toString() === fromUI );
            if( !originUI || !originUI.actions.some( action => action.verb === transition.action && action.target === transition.target ) ) {
                const uiRefString = formatUIRef( transition.from );
                markers.push( {
                    severity: 8,
                    startLineNumber: transition.line,
                    startColumn: transition.verbColumn,
                    endLineNumber: transition.line,
                    endColumn: transition.verbColumn + transition.action.length + 1 + 1 + transition.target.length + 1, // verbo + espacio + comillas + target
                    message: `Action ${transition.action} "${transition.target}" in transition is not defined in UI ${uiRefString}.`,
                    code: 'invalid-action'
                } );
            }
        } );

        // Check if the referenced UIs in DRAW statements exist
        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( uiRef => {
                const checkUIExists = ( ref ) => {
                    const innermostId = getInnermostUIRef( ref );
                    if( !uiIds.has( innermostId ) ) {
                        const uiRefString = formatUIRef( ref );
                        markers.push( {
                            severity: 8,
                            startLineNumber: draw.line,
                            startColumn: draw.column,
                            endLineNumber: draw.line,
                            endColumn: draw.column + 4,
                            message: `Referenced UI ${uiRefString} in DRAW does not exist.`,
                        } );
                    }
                    ref.nested.forEach( nestedRef => checkUIExists( nestedRef ) );
                };

                checkUIExists( uiRef );
            } );
        } );
    } );

    // Check for unused actions in UIs
    parsedData.uis.forEach( ui => {
        ui.actions.forEach( action => {
            const used = parsedData.fragments.some( fragment =>
                fragment.transitions.some( transition =>
                    getInnermostUIRef( transition.from ) === ui.id.toString() && transition.action === action.verb && transition.target === action.target
                )
            );
            if( !used ) {
                markers.push( {
                    severity: 4,
                    startLineNumber: action.line,
                    startColumn: action.column,
                    endLineNumber: action.line,
                    endColumn: action.column + 1 + action.verb.length + 1 + action.target.length + 1,
                    message: `Unused action: ${action.verb} "${action.target}" in UI ${ui.id}.`,
                } );
            }
        } );
    } );

    // Check if each UI is drawn at least once in at least one fragment
    parsedData.uis.forEach( ui => {
        const isDrawn = parsedData.fragments.some( fragment =>
            fragment.draws.some( draw =>
                draw.uiRefs.some( ref => {
                    const checkNestedUIRefs = ( uiRef ) => {
                        if( uiRef.id.toString() === ui.id.toString() ) {
                            return true;
                        }
                        return uiRef.nested.some( nestedRef => checkNestedUIRefs( nestedRef ) );
                    };
                    return checkNestedUIRefs( ref );
                } )
            )
        );

        if( !isDrawn ) {
            markers.push( {
                severity: 4,
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `UI ${ui.id} is not drawn in any fragment.`,
            } );
        }
    } );

    // Check if each UI is used as 'from' UI in at least one transition in at least one fragment
    parsedData.uis.forEach( ui => {
        const isUsedAsFrom = parsedData.fragments.some( fragment =>
            fragment.transitions.some( transition => {
                const innermostFromUI = getInnermostUIRef( transition.from );
                return innermostFromUI === ui.id.toString();
            } )
        );

        if( !isUsedAsFrom ) {
            markers.push( {
                severity: 4,
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + 3 + ui.id.toString().length,
                message: `UI ${ui.id} is not used as 'from' UI in any transition.`,
            } );
        }
    } );

    return markers;
};
