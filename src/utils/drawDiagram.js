// src/utils/drawDiagram.js

import {
    drawEdge,
    drawNode,
    drawLabel,
    getEdgeRenderParams
} from './canvasUtils';

export function drawDiagram( ctx, params ) {
    const {
        drawOrder,
        canvasSize,
        nodesMap,
        labelMap,
        vars,
        classes,
        labelClasses,
        transform,
        charLimit,
        charWidth,
        lineHeight
    } = params;

    ctx.save();
    ctx.clearRect( 0, 0, canvasSize.width, canvasSize.height );
    ctx.translate( transform.x, transform.y );
    ctx.scale( transform.scale, transform.scale );

    drawOrder.forEach( item => {
        if( item.type === 'edge' ) {
            const renderParams = getEdgeRenderParams(
                item.edge,
                nodesMap,
                labelMap,
                vars,
                classes,
                labelClasses
            );
            if( renderParams ) {
                drawEdge( ctx, renderParams );
            }

        } else if( item.type === 'ui' ) {
            drawNode( ctx, item.node, charLimit, vars, classes, charWidth, lineHeight );

        } else if( item.type === 'label' ) {
            drawLabel( ctx, item.lbl, charLimit, vars, classes );
        }
    } );

    ctx.restore();
}
  