// ==================== PALETA ====================
const fillColors = [
    { nombre: "rojo-claro1", hex: "#ffb3b3" },
    { nombre: "rojo-claro2", hex: "#ffcccc" },
    { nombre: "azul-claro1", hex: "#b3c6ff" },
    { nombre: "azul-claro2", hex: "#cce0ff" },
    { nombre: "amarillo-claro1", hex: "#ffffb3" },
    { nombre: "amarillo-claro2", hex: "#ffffcc" },
    { nombre: "naranja-claro1", hex: "#ffd9b3" },
    { nombre: "naranja-claro2", hex: "#ffe6cc" },
    { nombre: "violeta-claro1", hex: "#e6ccff" },
    { nombre: "violeta-claro2", hex: "#f3e6ff" },
    { nombre: "marron-claro1", hex: "#e6ccb3" },
    { nombre: "marron-claro2", hex: "#f3e6d7" },
    { nombre: "rosa-claro1", hex: "#ffd6e6" },
    { nombre: "rosa-claro2", hex: "#ffe6f3" },
    { nombre: "verde-claro1", hex: "#b3ffb3" },
    { nombre: "verde-claro2", hex: "#ccffcc" },
    { nombre: "gris-claro1", hex: "#e6e6e6" },
    { nombre: "gris-claro2", hex: "#f3f3f3" },
    { nombre: "cian-claro1", hex: "#b3fff9" },
    { nombre: "cian-claro2", hex: "#ccfff9" }
];

const strokeColors = [
    // Rojos
    { nombre: "rojo-oscuro", hex: "#a83232" },
    { nombre: "rojo-medio", hex: "#e6194b" },
//    { nombre: "rojo-claro1", hex: "#ffb3b3" },
//    { nombre: "rojo-claro2", hex: "#ffcccc" },
    // Azules
    { nombre: "azul-oscuro", hex: "#174ea6" },
    { nombre: "azul-medio", hex: "#4363d8" },
//    { nombre: "azul-claro1", hex: "#b3c6ff" },
//    { nombre: "azul-claro2", hex: "#cce0ff" },
    // Amarillos
    { nombre: "amarillo", hex: "#ffee00" },
//    { nombre: "amarillo-medio", hex: "#ffe119" },
//    { nombre: "amarillo-claro1", hex: "#ffffb3" },
//    { nombre: "amarillo-claro2", hex: "#ffffcc" },
    // Naranjas
    { nombre: "naranja-oscuro", hex: "#cc7a00" },
    { nombre: "naranja-medio", hex: "#f58231" },
//    { nombre: "naranja-claro1", hex: "#ffd9b3" },
//    { nombre: "naranja-claro2", hex: "#ffe6cc" },
    // Violetas
    { nombre: "violeta-oscuro", hex: "#4b2e83" },
    { nombre: "violeta-medio", hex: "#911eb4" },
//    { nombre: "violeta-claro1", hex: "#e6ccff" },
//    { nombre: "violeta-claro2", hex: "#f3e6ff" },
    // Marrones
    { nombre: "marron-oscuro", hex: "#5b3a29" },
    { nombre: "marron-medio", hex: "#9a6324" },
//    { nombre: "marron-claro1", hex: "#e6ccb3" },
//    { nombre: "marron-claro2", hex: "#f3e6d7" },
    // Rosas
    { nombre: "rosa-oscuro", hex: "#c71585" },
    { nombre: "rosa-medio", hex: "#fabebe" },
//    { nombre: "rosa-claro1", hex: "#ffd6e6" },
//    { nombre: "rosa-claro2", hex: "#ffe6f3" },
    // Verdes
    { nombre: "verde-oscuro", hex: "#008000" },
    { nombre: "verde-medio", hex: "#3cb44b" },
//    { nombre: "verde-claro1", hex: "#b3ffb3" },
//    { nombre: "verde-claro2", hex: "#ccffcc" },
    // Grises
    { nombre: "gris-oscuro", hex: "#666666" },
    { nombre: "gris-medio", hex: "#a9a9a9" },
//    { nombre: "gris-claro1", hex: "#e6e6e6" },
//    { nombre: "gris-claro2", hex: "#f3f3f3" },
    // Cian
    { nombre: "cian-oscuro", hex: "#009999" },
    { nombre: "cian-medio", hex: "#42d4f4" },
//    { nombre: "cian-claro1", hex: "#b3fff9" },
//    { nombre: "cian-claro2", hex: "#ccfff9" }
];

// ==================== REGLAS DE ARMONÍA ====================
const combinacionesDisonantes = new Set( [
    "rojo|verde", "verde|rojo",
    "azul|verde", "verde|azul",
    "cian|verde", "verde|cian",
    "naranja|verde", "verde|naranja",
    "rojo|azul", "azul|rojo",
    "naranja|rosa", "rosa|naranja",
    "marron|verde", "verde|marron"
] );

// ==================== UTILITARIOS ====================
function getBaseColor( nombre ) {
    return nombre.split( "-" )[ 0 ];
}

function agruparPorBase( colores ) {
    const mapa = {};
    colores.forEach( c => {
        const base = getBaseColor( c.nombre );
        mapa[ base ] ??= [];
        mapa[ base ].push( c );
    } );
    return mapa;
}

function esDisonante( nombreFill, nombreStroke ) {
    const baseFill = getBaseColor( nombreFill );
    const baseStroke = getBaseColor( nombreStroke );
    return combinacionesDisonantes.has( `${baseFill}|${baseStroke}` );
}

// ... (listas de fillColors, strokeColors, combinacionesDisonantes y utilidades ya definidas arriba) ...

/**
 * Distribuye equitativamente los elementos de 'bases' entre 'total' entidades.
 * Devuelve un array (longitud total) con la base asignada a cada entidad.
 */
function repartirEquitativamente( bases, total ) {
    const baseCount = bases.length;
    const result = [];
    const counts = Array( baseCount ).fill( Math.floor( total / baseCount ) );
    // reparte el resto
    for( let i = 0; i < total % baseCount; i++ ) counts[ i ]++;
    let idx = 0;
    for( let i = 0; i < baseCount; i++ ) {
        for( let j = 0; j < counts[ i ]; j++ ) {
            result[ idx++ ] = bases[ i ];
        }
    }
    // Mezcla para que no estén agrupados por base
    for( let i = result.length - 1; i > 0; i-- ) {
        const j = Math.floor( Math.random() * ( i + 1 ) );
        [ result[ i ], result[ j ] ] = [ result[ j ], result[ i ] ];
    }
    return result;
}

/**
 * Dada una lista de nombres de base para entidades,
 * asigna tonos equitativamente de entre los disponibles para esa base.
 * @param {Array} entidades - [{key: id, base: nombre_base}]
 * @param {Object} baseTonosMap - { base: [tonos...] }
 * @returns {Object} - { id: color }
 */
function repartirTonos( entidades, baseTonosMap ) {
    const asignacion = {};
    const agrupados = {};
    // Agrupa por base
    entidades.forEach( e => {
        agrupados[ e.base ] ??= [];
        agrupados[ e.base ].push( e.key );
    } );
    Object.entries( agrupados ).forEach( ( [ base, keys ] ) => {
        const tonos = baseTonosMap[ base ];
        for( let i = 0; i < keys.length; i++ ) {
            asignacion[ keys[ i ] ] = tonos[ i % tonos.length ];
        }
    } );
    return asignacion;
}

/**
 * Asignador general para fill o stroke.
 * @param {Array} ids
 * @param {Array} colorList
 * @returns {Object} { id: {nombre, hex} }
 */
function asignarColoresEquitativamente( ids, colorList ) {
    const baseMap = agruparPorBase( colorList );
    const bases = Object.keys( baseMap );

    // 1. Reparto de bases equitativo
    const baseAsignadas = repartirEquitativamente( bases, ids.length );
    // 2. Construye array [{key, base}]
    const entidades = ids.map( ( id, i ) => ( { key: id, base: baseAsignadas[ i ] } ) );
    // 3. Reparto de tonos equitativo
    const tonosAsignados = repartirTonos( entidades, baseMap );

    // 4. Resultado
    const resultado = {};
    ids.forEach( id => {
        resultado[ id ] = tonosAsignados[ id ];
    } );
    return resultado;
}

/**
 * Asigna colores a entidades asegurando reglas de disonancia y no repetición de hex.
 * @param {Object} folderToNodes - { id: [...] }
 * @returns {Object} { id: {fill, stroke} }
 */
function asignarColores( folderToNodes ) {
    const ids = Object.keys( folderToNodes );

    // Primero, fill equitativo
    const fillAsignados = asignarColoresEquitativamente( ids, fillColors );
    // Luego, stroke equitativo
    const strokeAsignados = asignarColoresEquitativamente( ids, strokeColors );

    // Aplica restricciones (disonancia, != hex)
    const resultado = {};
    for( let i = 0; i < ids.length; i++ ) {
        const id = ids[ i ];
        let fill = fillAsignados[ id ];
        let stroke = strokeAsignados[ id ];
        let intentos = 0;
        // Si hay disonancia o es el mismo hex, gira stroke a otro tono dentro del mismo base
        while(
            ( esDisonante( fill.nombre, stroke.nombre ) ||
                fill.hex === stroke.hex ) && intentos < strokeColors.length
        ) {
            // Rota al siguiente tono de stroke base
            const base = getBaseColor( stroke.nombre );
            const tonos = agruparPorBase( strokeColors )[ base ];
            const idxActual = tonos.findIndex( t => t.hex === stroke.hex );
            stroke = tonos[ ( idxActual + 1 ) % tonos.length ];
            intentos++;
        }
        resultado[ id ] = { fill: fill.hex, stroke: stroke.hex };
    }
    return resultado;
}

// ====== Exportación ======
export {
    asignarColores,
    fillColors,
    strokeColors,
    combinacionesDisonantes
};
