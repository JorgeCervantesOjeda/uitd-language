import { getInnermostUI, formatUIRef } from './utils';

export const validateData = ( parsedData ) => {
    const markers = [];
    const uiNames = new Set();
    const fragmentNames = new Set();

    // Check for UIs with no actions and duplicate UI names
    parsedData.uis.forEach( ui => {
        if( ui.actions.length === 0 ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `UI ${ui.id} has no actions defined`,
            } );
        }
        if( uiNames.has( ui.name ) ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: ui.line,
                startColumn: ui.column,
                endLineNumber: ui.line,
                endColumn: ui.column + ui.name.length,
                message: `Duplicate UI name: ${ui.name}`,
            } );
        } else {
            uiNames.add( ui.name );
        }
    } );

    // Check for duplicate fragment names
    parsedData.fragments.forEach( fragment => {
        if( fragmentNames.has( fragment.name ) ) {
            markers.push( {
                severity: 'Error',
                startLineNumber: fragment.line,
                startColumn: fragment.column,
                endLineNumber: fragment.line,
                endColumn: fragment.column + fragment.name.length,
                message: `Duplicate fragment name: ${fragment.name}`,
            } );
        } else {
            fragmentNames.add( fragment.name );
        }
    } );

    // Check if there are undrawn UIs referenced in transitions
    parsedData.fragments.forEach( fragment => {
        const drawnUIs = new Set();

        const collectDrawnUIs = ( ref ) => {
            drawnUIs.add( ref.id );
            ref.nested.forEach( nestedRef => collectDrawnUIs( nestedRef ) );
        };

        fragment.draws.forEach( ( { uiRefs } ) => {
            uiRefs.forEach( ref => {
                collectDrawnUIs( ref );
            } );
        } );

        fragment.transitions.forEach( transition => {
            const checkUI = ( uiRef ) => {
                const innermostId = getInnermostUI( uiRef );
                if( !drawnUIs.has( innermostId ) ) {
                    const uiRefString = formatUIRef( uiRef );
                    markers.push( {
                        severity: 'Error',
                        startLineNumber: transition.line,
                        startColumn: transition.column + 16,
                        endLineNumber: transition.line,
                        endColumn: transition.column + 16 + uiRefString.length + 4 + 2,
                        message: `Undrawn UI referenced in transition: ${uiRefString}`,
                    } );
                }
            };

            checkUI( transition.from );
            checkUI( transition.to );

            // Validate that transition actions are defined in the origin UI
            const originUI = parsedData.uis.find( ui => ui.id.toString() === getInnermostUI( transition.from ) );
            if( !originUI || !originUI.actions.some( action => action.verb === transition.action && action.target === transition.target ) ) {
                const uiRefString = formatUIRef( transition.from );
                markers.push( {
                    severity: 'Error',
                    startLineNumber: transition.line,
                    startColumn: transition.column + 16,
                    endLineNumber: transition.line,
                    endColumn: transition.column + 16 + uiRefString.length,
                    message: `Action "${transition.action} ${transition.target}" in transition is not defined in UI ${uiRefString}`,
                } );
            }
        } );
    } );

    // Check for unused actions in UIs
    parsedData.uis.forEach( ui => {
        ui.actions.forEach( action => {
            const used = parsedData.fragments.some( fragment =>
                fragment.transitions.some( transition =>
                    getInnermostUI( transition.from ) === ui.id.toString() && transition.action === action.verb && transition.target === action.target
                )
            );
            if( !used ) {
                markers.push( {
                    severity: 'Warning',
                    startLineNumber: action.line,
                    startColumn: action.column,
                    endLineNumber: action.line,
                    endColumn: action.column + 1 + action.verb.length + 1 + action.target.length + 1,
                    message: `Unused action: ${action.verb} "${action.target}" in UI ${ui.id}`,
                } );
            }
        } );
    } );

    return markers;
};
