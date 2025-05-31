function posorderWithDepthConstraint( graph ) {
    const nodes = Object.keys( graph );
    const visited = {};
    const maxDepth = {};
    const posorder = [];

    // Función para calcular la máxima profundidad alcanzable desde un nodo
    function getMaxDepth( node ) {
        visited[ node ] = true;
        let children = graph[ node ];
        let depths = [];

        for( let child of children ) {
            if( !visited[ child ] ) {
                depths.push( getMaxDepth( child ) );
            }
        }

        visited[ node ] = false; // Limpiar visitado para el próximo cálculo

        // Ordenar hijos por profundidad descendente
        depths.sort( ( a, b ) => b - a );

        // Calcular la máxima profundidad alcanzable desde este nodo
        let maxChildDepth = 0;
        for( let i = 0; i < depths.length; i++ ) {
            maxChildDepth = Math.max( maxChildDepth, depths[ i ] + i );
        }
        maxDepth[ node ] = maxChildDepth;

        return maxChildDepth;
    }

    // Iniciar el cálculo desde el primer nodo en la lista de aristas (nodo 'A' en este caso)
    const startNode = nodes[ 0 ];
    getMaxDepth( startNode );

    console.log( "Máximas profundidades alcanzables:", maxDepth ); // Debug: Verifica las profundidades calculadas

    // Función para realizar el recorrido en posorden
    function dfsPosorder( node ) {
        visited[ node ] = true;
        let children = graph[ node ];

        // Obtener las profundidades de los hijos
        let childDepths = children.map( child => ( {
            node: child,
            depth: maxDepth[ child ]
        } ) );

        // Ordenar hijos por profundidad descendente y cantidad de nodos en el camino
        childDepths.sort( ( a, b ) => {
            const depthDiff = a.depth - b.depth;
            if( depthDiff !== 0 ) {
                return depthDiff; // Menor profundidad primero
            } else {
                const nodeCountA = graph[ a.node ].length;
                const nodeCountB = graph[ b.node ].length;
                return nodeCountA - nodeCountB; // Menos nodos primero en caso de empate en profundidad
            }
        } );

        // Recorrer los hijos en orden determinado
        for( let { node } of childDepths ) {
            if( !visited[ node ] ) {
                dfsPosorder( node );
            }
        }

        posorder.push( node );
    }

    // Iniciar el recorrido en posorden desde el nodo inicial
    dfsPosorder( startNode );

    console.log( "Recorrido en posorden :", posorder ); // Debug: Verifica el recorrido en posorden

    return posorder;
}

// Ejemplo de uso:
// Definición de la gráfica como un objeto
const graph = {
    A: [ 'B', 'C', 'E', 'H' ],
    B: [ 'A' ],
    C: [ 'D', 'E' ],
    D: [ 'F', 'H' ],
    E: [ 'G' ],
    F: [],
    G: [],
    H: []
};


posorderWithDepthConstraint( graph );
