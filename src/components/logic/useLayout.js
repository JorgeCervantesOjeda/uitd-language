// src/logic/useLayout.js
import { useMemo } from 'react';
import {
    LABEL_PADDING,
    UI_PADDING,
    VERTICAL_SPACING
} from '../../utils/constants';
import { computeTextMetrics } from '../../utils/textMetrics';
import { wrapText } from '../../utils/canvasUtils';
import { random } from 'lodash';

export default function useLayout( fragment, charLimit, charWidth, lineH, animTrigger ) {
    const LOCAL_KEY = 'forcesLayout';

    return useMemo( () => {
        // 1) Ancho medio de carácter
        if( charWidth <= 0 ) {
            return {
                drawOrder: [],
                canvasSize: { width: 0, height: 0 },
                nodesMap: {},
                labelMap: {}
            };
        }

        // 1) Anotar keys en cada nodo
        const roots = fragment.hierarchy;
        function annotate( node, prefix = '' ) {
            node.key = prefix ? `${prefix}.${node.id}` : node.id;
            node.children?.forEach( child => annotate( child, node.key ) );
        }
        roots.forEach( r => annotate( r ) );

        // 2) Calcular tamaños (_size) y altura de hijos (_childrenHeight)
        function computeSizes( node ) {
            const fullLabel = `${node.id} ${node.label}`;
            const { width: textW, height: textH } =
                computeTextMetrics( fullLabel, charLimit, charWidth, lineH );
            const labelH = textH;
            let w = textW;

            if( node.children?.length ) {
                const childSizes = node.children.map( computeSizes );
                const maxChildW = Math.max( ...childSizes.map( c => c.width ) );
                const totalChildH =
                    childSizes.reduce( ( sum, c ) => sum + c.height, 0 ) +
                    UI_PADDING * ( childSizes.length - 1 );

                w = Math.max( w, maxChildW + UI_PADDING * 2 );
                node._childrenHeight = totalChildH;
            }

            const h = node.children?.length
                ? labelH + UI_PADDING + node._childrenHeight + UI_PADDING
                : labelH;

            node._size = { width: w, height: h, labelH };
            return node._size;
        }
        roots.forEach( r => computeSizes( r ) );

        // 3) Calcular posiciones (_x, _y)
        function computePos( node, x, y ) {
            node._x = x;
            node._y = y;
            let currentY = y + node._size.labelH + UI_PADDING;
            node.children?.forEach( child => {
                computePos( child, x + UI_PADDING, currentY );
                currentY += child._size.height + UI_PADDING;
            } );
        }
        roots.forEach( r => {
            computePos( r, UI_PADDING + random( 1000.0 ), UI_PADDING + random( 1000.0 ) );
        } );

        // 4) Coleccionar nodos y niveles
        const nodesMap = {};
        const levels = {};
        function collect( node, lvl = 0 ) {
            nodesMap[ node.key ] = node;
            levels[ node.key ] = lvl;
            node.children?.forEach( child => collect( child, lvl + 1 ) );
        }
        roots.forEach( r => collect( r ) );

        const maxLevel = Math.max( ...Object.values( levels ) );
        const nodesByLevel = Array.from( { length: maxLevel + 1 }, () => [] );
        Object.entries( nodesMap ).forEach( ( [ key, node ] ) => {
            nodesByLevel[ levels[ key ] ].push( node );
        } );

        // 5) Posicionar etiquetas (elipses)
        const labelOrigins = {};
        fragment.transitions.forEach( t => {
            if( t.to?.startsWith( 'lbl' ) ) {
                labelOrigins[ t.to ] = t.from;
            }
        } );

        const labelMap = {};
        let ly = UI_PADDING;
        fragment.labels.forEach( lbl => {
            const { lines, width, height } = computeTextMetrics(
                lbl.text, charLimit, charWidth, lineH
            );
            labelMap[ lbl.id ] = {
                id: lbl.id,
                x: 320 + random( 1000.0 ),
                y: ly + random( 1000.0 ),
                width,
                height,
                text: lbl.text,
                lines,            // guardamos las líneas para no volver a envolver
                origin: labelOrigins[ lbl.id ]
            };
        } );

        // 6) Rehidratación SINCRÓNICA desde localStorage (si existe)
        try {
            const raw = localStorage.getItem( LOCAL_KEY );
            if( raw ) {
                const snap = JSON.parse( raw );
                const sNodes = snap?.nodes || {};
                const sLabels = snap?.labels || {};
                // Rehidratar por raíz para preservar la estructura interna.
                // Si se aplican coordenadas por hijo (de otro diagrama/shape),
                // pueden quedar nodos "sueltos" fuera de su contenedor.
                const rootIds = Object.keys( nodesMap ).filter( id => !id.includes( '.' ) );
                rootIds.forEach( rootId => {
                    const s = sNodes[ rootId ];
                    if( !( s && Number.isFinite( s.x ) && Number.isFinite( s.y ) ) ) return;

                    const root = nodesMap[ rootId ];
                    const dx = s.x - root._x;
                    const dy = s.y - root._y;
                    const prefix = `${rootId}.`;

                    Object.keys( nodesMap ).forEach( id => {
                        if( id === rootId || id.startsWith( prefix ) ) {
                            nodesMap[ id ]._x += dx;
                            nodesMap[ id ]._y += dy;
                        }
                    } );
                } );
                Object.keys( labelMap ).forEach( id => {
                    const s = sLabels[ id ];
                    if( s && Number.isFinite( s.x ) && Number.isFinite( s.y ) ) {
                        labelMap[ id ].x = s.x;
                        labelMap[ id ].y = s.y;
                    }
                } );
            }
        } catch { /* snapshot corrupto → ignorar */ }

        // 7) Crear aristas con coordenadas iniciales
        const transitions = fragment.transitions.map( e => {
            const fromNode = nodesMap[ e.from ] || labelMap[ e.from ];
            const toNode = nodesMap[ e.to ] || labelMap[ e.to ];
            const x1 = ( fromNode._x ?? fromNode.x ) + ( ( fromNode._size?.width ?? fromNode.width ) / 2 );
            const y1 = ( fromNode._y ?? fromNode.y ) + ( ( fromNode._size?.height ?? fromNode.height ) / 2 );
            const x2 = ( toNode._x ?? toNode.x ) + ( ( toNode._size?.width ?? toNode.width ) / 2 );
            const y2 = ( toNode._y ?? toNode.y ) + ( ( toNode._size?.height ?? toNode.height ) / 2 );
            return { ...e, x1, y1, x2, y2 };
        } );

        // 8) Agrupar aristas por nivel
        const edgesByLevel = Array.from( { length: maxLevel + 1 }, () => [] );
        transitions.forEach( edge => {
            const lvl = levels[ edge.from ] ?? levels[ edge.to ];
            edgesByLevel[ lvl ].push( edge );
        } );

        // 9) Orden de dibujo: aristas, nodos por nivel, luego etiquetas
        const drawOrder = [];
        for( let lvl = 0; lvl <= maxLevel; lvl++ ) {
            edgesByLevel[ lvl ].forEach( edge => drawOrder.push( { type: 'edge', edge } ) );
            nodesByLevel[ lvl ].forEach( node => drawOrder.push( { type: 'ui', node } ) );
        }
        Object.values( labelMap ).forEach( lbl => drawOrder.push( { type: 'label', lbl } ) );

        // 10) Tamaño total del canvas
        const xs = [
            ...Object.values( nodesMap ).map( n => n._x + n._size.width ),
            ...Object.values( labelMap ).map( l => l.x + l.width )
        ];
        const ys = [
            ...Object.values( nodesMap ).map( n => n._y + n._size.height ),
            ...Object.values( labelMap ).map( l => l.y + l.height )
        ];
        const canvasSize = {
            width: Math.max( ...xs ) + UI_PADDING,
            height: Math.max( ...ys ) + UI_PADDING
        };

        return { drawOrder, canvasSize, nodesMap, labelMap };
    }, [ fragment, charLimit, charWidth, animTrigger ] );
}
