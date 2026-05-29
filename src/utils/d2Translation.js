// src/utils/d2Translation.js
// Shared UITD-to-D2 translation helpers for the React renderer and CLI scripts.
import { asignarColores } from '../components/color-assignment.js';

const DEFAULT_COLOR_CACHE_KEY = 'uiColors';

const hasLocalStorage = () => typeof globalThis.localStorage !== 'undefined';

const readColorCache = ( cacheKey ) => {
    if( !hasLocalStorage() ) return null;

    const raw = globalThis.localStorage.getItem( cacheKey );
    if( !raw ) return null;

    try {
        return JSON.parse( raw );
    } catch( error ) {
        void error;
        return null;
    }
};

const writeColorCache = ( cacheKey, colorMap ) => {
    if( hasLocalStorage() ) {
        globalThis.localStorage.setItem(
 cacheKey,
JSON.stringify( colorMap ) 
);
    }
};

export const clearUIColorMap = ( cacheKey = DEFAULT_COLOR_CACHE_KEY ) => {
    if( hasLocalStorage() ) {
        globalThis.localStorage.removeItem( cacheKey );
    }
};

export const generateUIColorMap = ( uis, { cacheKey = DEFAULT_COLOR_CACHE_KEY, persist = hasLocalStorage() } = {} ) => {
    if( persist ) {
        const cached = readColorCache( cacheKey );
        if( cached ) return cached;
    }

    const folderToNodes = {};
    uis.forEach( ui => {
        folderToNodes[ ui.id ] = [ ui.id ];
    } );

    const colorMap = asignarColores( folderToNodes );

    if( persist ) {
        writeColorCache(
 cacheKey,
colorMap 
);
    }

    return colorMap;
};

const formatTransitionUIRef = ( uiRef ) => {
    if( !uiRef.nested || uiRef.nested.length === 0 ) {
        return uiRef.id;
    }

    return `${uiRef.id}.${uiRef.nested.map( nestedRef => formatTransitionUIRef( nestedRef ) )
.join( '.' )}`;
};

const flattenUIRefs = ( ref, parentKey = '' ) => {
    const key = parentKey ? `${parentKey}.${ref.id}` : ref.id;
    let keys = [ key ];

    if( ref.nested && ref.nested.length > 0 ) {
        ref.nested.forEach( nr => {
            keys = keys.concat( flattenUIRefs(
 nr,
key 
) );
        } );
    }

    return keys;
};

const formatString = ( name, maxLength = 15 ) => {
    if( !name ) return '';

    const words = name.split( ' ' );
    let formattedName = '';
    let line = '';

    words.forEach( word => {
        if( ( line + word ).length > maxLength ) {
            if( line ) {
                formattedName += `${line}\\n`;
                line = '';
            }
        }
        line = line ? `${line} ${word}` : word;
    } );

    if( line ) {
        formattedName += line;
    }

    return formattedName;
};

const escapeD2String = ( value ) => value
    .replaceAll(
        '\r\n',
        '\\n'
    )
    .replaceAll(
        '\n',
        '\\n'
    )
    .replaceAll(
        '\r',
        '\\n'
    )
    .replaceAll(
        '"',
        '\\"'
    );

const ordenarTransiciones = ( transitions, uiOrder ) => {
    const usadas = Array( transitions.length )
.fill( false );
    const resultado = [];

    const dfs = ( actual ) => {
        transitions.forEach( ( t, i ) => {
            const fromKey = formatTransitionUIRef( t.from );
            const toKey = formatTransitionUIRef( t.to );
            if( !usadas[ i ] && fromKey === actual && toKey === actual ) {
                resultado.push( t );
                usadas[ i ] = true;
            }
        } );

        const uniqueOrder = uiOrder.filter( ( v, i, a ) => a.indexOf( v ) === i );
        const vecinos = uniqueOrder.filter( key => {
            if( key === actual ) return false;
            return transitions.some( ( t, i ) => {
                if( usadas[ i ] ) return false;
                const fromKey = formatTransitionUIRef( t.from );
                const toKey = formatTransitionUIRef( t.to );
                return ( fromKey === actual && toKey === key )
                    || ( fromKey === key && toKey === actual );
            } );
        } );

        vecinos.forEach( b => {
            transitions.forEach( ( t, i ) => {
                const fromKey = formatTransitionUIRef( t.from );
                const toKey = formatTransitionUIRef( t.to );
                if( !usadas[ i ] && (
                    ( fromKey === actual && toKey === b ) ||
                    ( fromKey === b && toKey === actual )
                ) ) {
                    resultado.push( t );
                    usadas[ i ] = true;
                }
            } );
            dfs( b );
        } );
    };

    uiOrder.forEach( id => dfs( id ) );
    return resultado;
};

const getDeepestRef = ( ref ) =>
    ref.nested && ref.nested.length > 0
        ? getDeepestRef( ref.nested[ ref.nested.length - 1 ] )
        : ref;

const buildUIHierarchy = ( ref, indentLevel, uis ) => {
    const ui = uis.find( u => u.id === parseInt(
 ref.id,
10 
) );
    if( !ui ) return '';

    const indent = '  '.repeat( indentLevel );
    let out = '';
    out += `${indent}${ref.id}.class: ui${ui.id}\n`;
    out += ref.full ? '' : `${indent}${ref.id}.style.stroke-dash: 5\n`;

    if( ref.nested.length > 0 ) {
        out += `${indent}${ref.id}: ${ref.id} ${formatString(
 ui.name,
20 
)} {\n`;
        ref.nested.forEach( nr => {
            out += buildUIHierarchy(
 nr,
indentLevel + 1,
uis 
);
        } );
        out += `${indent}}\n`;
    } else {
        out += `${indent}${ref.id}: ${ref.id} ${formatString(
 ui.name,
20 
)}\n`;
    }

    return out;
};

const buildHierarchyObject = ( ref, uis, uiColorMap ) => {
    const ui = uis.find( u => u.id === parseInt(
 ref.id,
10 
) );
    if( !ui ) return null;

    const node = {
        id: ref.id,
        className: `ui${ui.id}`,
        style: {
            fill: uiColorMap[ ui.id ]?.fill || '#eeeeee',
            stroke: uiColorMap[ ui.id ]?.stroke || '#cccccc',
            strokeDash: ref.full ? 0 : 5
        },
        label: ui.name,
        children: []
    };

    if( ref.nested ) {
        node.children = ref.nested
            .map( nr => buildHierarchyObject(
 nr,
uis,
uiColorMap 
) )
            .filter( Boolean );
    }

    return node;
};

export const translateToD2 = ( parsedData, options = {} ) => {
    if( !parsedData || !parsedData.name ) return '';

    const uiColorMap = generateUIColorMap(
 parsedData.uis,
options 
);

    let varsBlock = 'vars: {\n';
    parsedData.uis.forEach( ui => {
        varsBlock += `  ui${ui.id}: {\n`;
        varsBlock += `    fill: "${uiColorMap[ ui.id ]?.fill || '#eeeeee'}"\n`;
        varsBlock += `    stroke: "${uiColorMap[ ui.id ]?.stroke || '#cccccc'}"\n`;
        varsBlock += '  }\n';
    } );
    varsBlock += '}\n\n';

    let uiClasses = '';
    let labelUiClasses = '';
    parsedData.uis.forEach( ui => {
        uiClasses += `  ui${ui.id}: {\n`;
        uiClasses += '    shape: rectangle\n';
        uiClasses += '    style: {\n';
        uiClasses += `      fill: \${ui${ui.id}.fill}\n`;
        uiClasses += `      stroke: \${ui${ui.id}.stroke}\n`;
        uiClasses += '      stroke-width: 6\n';
        uiClasses += '      3d: false\n';
        uiClasses += '    }\n';
        uiClasses += '  }\n';
        labelUiClasses += `  label_ui${ui.id}: {\n`;
        labelUiClasses += '    shape: oval\n';
        labelUiClasses += '    style: {\n';
        labelUiClasses += `      fill: \${ui${ui.id}.fill}\n`;
        labelUiClasses += `      stroke: \${ui${ui.id}.stroke}\n`;
        labelUiClasses += '      stroke-width: 6\n';
        labelUiClasses += '      font-color: "#003311"\n';
        labelUiClasses += '    }\n';
        labelUiClasses += '  }\n';
    } );

    let d2 =
        'direction: right\n\n' +
        varsBlock +
        '# Classes generated for each UI\n' +
        'classes: {\n' +
        uiClasses +
        labelUiClasses +
        '}\n\n' +
        '# Main container\n' +
        'UITD.style.fill: "#ffffff"\n' +
        'UITD.style.stroke-width: 0\n' +
        `UITD: ${parsedData.name} {\n`;

    parsedData.fragments.forEach( ( fragment, fIdx ) => {
        const fragLetter = String.fromCharCode( 65 + fIdx );
        const bgColor = fragment.color || '#eeeeee';
        const defaultWidth = fragment.width ?? 15;
        const uiOrder = fragment.draws
            .flatMap( draw => draw.uiRefs.flatMap( ref => flattenUIRefs( ref ) ) )
            .filter( ( v, i, a ) => a.indexOf( v ) === i );
        const sortedTransitions = ordenarTransiciones(
 fragment.transitions,
uiOrder 
);

        d2 += `  ${fragLetter}.style.fill: "${bgColor}"\n`;
        d2 += `  ${fragLetter}.style.stroke-dash: 1\n`;
        d2 += `  ${fragLetter}: ${formatString(
 fragment.name,
20 
)} {\n`;

        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace(
 /\./g,
'_' 
)}_${toId.replace(
 /\./g,
'_' 
)}`;
            d2 += `    ${fromId} -> ${lblId}\n`;
            d2 += `    ${lblId} -> ${toId}:{style.stroke-dash:5}\n`;
        } );

        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace(
 /\./g,
'_' 
)}_${toId.replace(
 /\./g,
'_' 
)}`;
            const originRef = getDeepestRef( t.from );
            d2 += `    ${lblId}.class: label_ui${originRef.id}\n`;
            let action = `${t.action} "${t.target}"`;
            if( t.condition ) action += ` AND (${t.condition})`;
            const label = formatString(
 action,
t.width ?? defaultWidth 
);
            d2 += `    ${lblId}: "${escapeD2String( label )}"\n`;
        } );

        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                d2 += buildUIHierarchy(
 ref,
2,
parsedData.uis 
);
            } );
        } );

        d2 += '  }\n';
    } );

    d2 += '}\n';
    return d2;
};

export const translateToD2Structure = ( parsedData, options = {} ) => {
    if( !parsedData || !parsedData.name ) return null;

    const uiColorMap = generateUIColorMap(
 parsedData.uis,
options 
);
    const structure = {
        direction: 'right',
        vars: {},
        classes: {},
        labelClasses: {},
        mainContainer: { id: 'UITD', name: parsedData.name, style: { fill: '#ffffff', strokeWidth: 0 } },
        fragments: []
    };

    parsedData.uis.forEach( ui => {
        structure.vars[ ui.id ] = {
            fill: uiColorMap[ ui.id ]?.fill || '#eeeeee',
            stroke: uiColorMap[ ui.id ]?.stroke || '#cccccc'
        };
    } );

    parsedData.uis.forEach( ui => {
        const v = structure.vars[ ui.id ];
        structure.classes[ ui.id ] = {
            shape: 'rectangle',
            style: {
                fill: v.fill,
                stroke: v.stroke,
                strokeWidth: 6,
                '3d': false
            }
        };
        structure.labelClasses[ ui.id ] = {
            shape: 'oval',
            style: {
                fill: v.fill,
                stroke: v.stroke,
                strokeWidth: 6,
                fontColor: '#003311'
            }
        };
    } );

    parsedData.fragments.forEach( ( fragment, fIdx ) => {
        const fragLetter = String.fromCharCode( 65 + fIdx );
        const uiOrder = fragment.draws
            .flatMap( d => d.uiRefs.flatMap( r => flattenUIRefs( r ) ) )
            .filter( ( v, i, a ) => a.indexOf( v ) === i );
        const sortedTransitions = ordenarTransiciones(
 fragment.transitions,
uiOrder 
);

        const fragObj = {
            id: fragLetter,
            name: fragment.name,
            width: fragment.width || 15,
            style: { fill: fragment.color || '#eeeeee', strokeDash: 1 },
            transitions: [],
            labels: [],
            hierarchy: []
        };

        sortedTransitions.forEach( ( t, tIdx ) => {
            const fromId = formatTransitionUIRef( t.from );
            const toId = formatTransitionUIRef( t.to );
            const lblId = `lbl_${tIdx + 1}_${fromId.replace(
 /\./g,
'_' 
)}_${toId.replace(
 /\./g,
'_' 
)}`;

            fragObj.transitions.push( {
                from: fromId,
                to: lblId,
                style: {}
            } );
            fragObj.transitions.push( {
                from: lblId,
                to: toId,
                style: { strokeDash: 5 }
            } );

            const originRef = getDeepestRef( t.from );
            let action = `${t.action} "${t.target}"`;
            if( t.condition ) action += ` AND (${t.condition})`;
            fragObj.labels.push( {
                id: lblId,
                className: `label_ui${originRef.id}`,
                text: action,
                width: t.width
            } );
        } );

        fragment.draws.forEach( draw => {
            draw.uiRefs.forEach( ref => {
                const obj = buildHierarchyObject(
 ref,
parsedData.uis,
uiColorMap 
);
                if( obj ) fragObj.hierarchy.push( obj );
            } );
        } );

        structure.fragments.push( fragObj );
    } );

    return structure;
};
