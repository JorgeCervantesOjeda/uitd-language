import { LABEL_PADDING } from './constants';

/**
 * Dibuja un nodo UI (rectángulo con texto envuelto).
 */
export function drawNode( ctx, node, charLimit, vars, classes, charWidth, lineHeight ) {
    const vr = vars[ node.id ] || {};
    const cls = classes[ node.id ]?.style || {};

    // Rectángulo
    ctx.save();
    ctx.fillStyle = vr.fill || cls.fill || '#fff';
    ctx.strokeStyle = vr.stroke || cls.stroke || '#000';
    ctx.lineWidth = cls.strokeWidth ?? 1;
    if( cls.strokeDash && typeof ctx.setLineDash === 'function' ) {
        ctx.setLineDash( [ 5, 5 ] );
    }
    ctx.beginPath();
    ctx.rect( node._x, node._y, node._size.width, node._size.height );
    ctx.fill();
    ctx.stroke();
    if( cls.strokeDash && typeof ctx.setLineDash === 'function' ) {
        ctx.setLineDash( [] );
    }
    ctx.restore();

    // Texto envuelto
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    const lines = wrapText( `${node.id} ${node.label}`, charLimit );
    const startY = node._y + LABEL_PADDING;
    lines.forEach( ( line, i ) => {
        ctx.fillText(
            line,
            node._x + LABEL_PADDING,
            startY + i * lineHeight
        );
    } );
    ctx.restore();
}

/**
 * Dibuja una elipse mediante cuatro Bezier cúbicas.
 */
function drawEllipsePath( ctx, cx, cy, rx, ry ) {
    const kappa = 0.5522847498307936;
    ctx.beginPath();
    ctx.moveTo( cx + rx, cy );
    ctx.bezierCurveTo(
        cx + rx, cy + kappa * ry,
        cx + kappa * rx, cy + ry,
        cx, cy + ry
    );
    ctx.bezierCurveTo(
        cx - kappa * rx, cy + ry,
        cx - rx, cy + kappa * ry,
        cx - rx, cy
    );
    ctx.bezierCurveTo(
        cx - rx, cy - kappa * ry,
        cx - kappa * rx, cy - ry,
        cx, cy - ry
    );
    ctx.bezierCurveTo(
        cx + kappa * rx, cy - ry,
        cx + rx, cy - kappa * ry,
        cx + rx, cy
    );
    ctx.closePath();
}

/**
 * Dibuja una etiqueta (elipse con texto envuelto).
 */
export function drawLabel( ctx, lbl, charLimit, vars, classes ) {

    const cx = lbl.x + lbl.width / 2;
    const cy = lbl.y + lbl.height / 2;
    const rx = lbl.width / 2;
    const ry = lbl.height / 2;

    // 2) Estilos del nodo origen
    const rawOrigin = lbl.origin;
    const originId = rawOrigin.includes( '.' )
        ? rawOrigin.split( '.' ).pop()
        : rawOrigin;

    const vr = vars[ originId ] || {};
    const cls = classes[ originId ]?.style || {};
    const fillCol = vr.fill || cls.fill || '#fff';
    const strokeCol = vr.stroke || cls.stroke || '#000';
    const lineW = cls.strokeWidth ?? 1;

    // Relleno y contorno de la elipse
    ctx.save();
    drawEllipsePath( ctx, cx, cy, rx, ry );
    ctx.fillStyle = fillCol;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = lineW;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Texto envuelto
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    const lines = lbl.lines || wrapText( lbl.text, charLimit );
    const innerH = lbl.height - 2 * LABEL_PADDING;
    const lineH = lines.length > 0
        ? innerH / lines.length
        : innerH;
    lines.forEach( ( line, i ) => {
        ctx.fillText(
            line,
            lbl.x + LABEL_PADDING,
            lbl.y + LABEL_PADDING + i * lineH
        );
    } );
    ctx.restore();
}

/**
 * Prepara parámetros para dibujar una arista:
 * - Calcula x1,y1,x2,y2
 * - Determina stroke y fill según el nodo origen (solo id simple)
 */
export function getEdgeRenderParams(
    e, nodesMap, labelMap, vars, classes, labelClasses
) {
    // 1) Obtén extremos
    const fromItem = nodesMap[ e.from ] || labelMap[ e.from ];
    const toItem = nodesMap[ e.to ] || labelMap[ e.to ];
    if( !fromItem || !toItem ) return null;

    // 2) Centros
    const x1 = ( fromItem._x ?? fromItem.x ) + ( ( fromItem._size?.width ?? fromItem.width ) / 2 );
    const y1 = ( fromItem._y ?? fromItem.y ) + ( ( fromItem._size?.height ?? fromItem.height ) / 2 );
    const x2 = ( toItem._x ?? toItem.x ) + ( ( toItem._size?.width ?? toItem.width ) / 2 );
    const y2 = ( toItem._y ?? toItem.y ) + ( ( toItem._size?.height ?? toItem.height ) / 2 );

    // 3) Determina nodo origen real: si viene de etiqueta, usa lbl.origin

    // Nodo origen real: si viene de etiqueta nos da algo como "2.3"
    // extraemos solo el segmento final ("3"), si no sirve el simple fromItem.id
    const rawOrigin = labelMap[ e.from ]?.origin || fromItem.id;
    const originId = rawOrigin.includes( '.' )
        ? rawOrigin.split( '.' ).pop()
        : rawOrigin;


    // 4) Extrae estilo SOLO por originId
    const vr = vars[ originId ] || {};
    const cls = classes[ originId ]?.style || {};
    const lblS = labelClasses[ originId ]?.style || {};

    const stroke = vr.stroke
        || cls.stroke
        || lblS.stroke
        || '#333';
    const fill = vr.fill
        || cls.fill
        || lblS.fill
        || '#fff';

    // 5) Punteado si sale de etiqueta
    const strokeDash = Boolean( labelMap[ e.from ]?.origin );

    return {
        x1, y1, x2, y2,
        style: { stroke, fill, strokeDash }
    };
}

/**
 * Dibuja una línea punteada, alternando entre dos colores:
 * segmentos pares en color1, segmentos impares en color2.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1 - X origen
 * @param {number} y1 - Y origen
 * @param {number} x2 - X destino
 * @param {number} y2 - Y destino
 * @param {number} dash      - longitud de cada guión
 * @param {number} gap       - espacio entre guiones
 * @param {string} color1    - color para guiones pares (stroke)
 * @param {string} color2    - color para guiones impares (fill)
 * @param {number} lineWidth - grosor de la línea
 */
function drawAlternatingDashLine(
    ctx,
    x1, y1, x2, y2,
    dash = 5,
    gap = 5,
    color1,
    color2,
    lineWidth
) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot( dx, dy );
    if( len < 1 ) return;

    const ux = dx / len, uy = dy / len;
    let traveled = 0;
    let segmentIndex = 0;

    while( traveled < len ) {
        const segLen = Math.min( dash, len - traveled );
        const sx = x1 + ux * traveled;
        const sy = y1 + uy * traveled;
        const ex = sx + ux * segLen;
        const ey = sy + uy * segLen;

        ctx.save();
        ctx.strokeStyle = ( segmentIndex % 2 === 0 ) ? color1 : color2;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo( sx, sy );
        ctx.lineTo( ex, ey );
        ctx.stroke();
        ctx.restore();

        traveled += dash + gap;
        segmentIndex++;
    }
}

/**
 * Dibuja una arista con opción a línea sólida o punteada y punta de flecha centrada.
 */
export function drawEdge( ctx, e ) {
    const {
        x1, y1, x2, y2,
        style: {
            stroke,
            strokeDash = false,
            strokeWidth = 4,
            arrowLength = 24,
            arrowWidth = 18,
            dash = 5,
            gap = 5,
            fill = '#fff'
        } = {}
    } = e;

    // Línea sólida o punteada
    if( strokeDash ) {
        drawAlternatingDashLine(
            ctx,
            x1, y1, x2, y2,
            dash, gap,
            stroke,  // color de segmentos pares
            fill,    // color de segmentos impares
            strokeWidth
        );
    } else {
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.moveTo( x1, y1 );
        ctx.lineTo( x2, y2 );
        ctx.stroke();
        ctx.restore();
    }

    // Punta de flecha en el centro
    const midX = ( x1 + x2 ) / 2;
    const midY = ( y1 + y2 ) / 2;
    const angle = Math.atan2( y2 - y1, x2 - x1 );

    ctx.save();
    ctx.translate( midX, midY );
    ctx.rotate( angle );
    ctx.beginPath();
    ctx.moveTo( 0, 0 );
    ctx.lineTo( -arrowLength, arrowWidth / 2 );
    ctx.lineTo( -arrowLength, -arrowWidth / 2 );
    ctx.closePath();
    ctx.fillStyle = stroke;
    ctx.fill();
    ctx.restore();
}

/**
 * Envuelve un texto en varias líneas según un límite de caracteres.
 */
export function wrapText( text, charLimit ) {
    const words = text.split( ' ' );
    const lines = [];
    let line = '';

    for( const word of words ) {
        const test = line ? `${line} ${word}` : word;
        if( test.length > charLimit ) {
            if( line ) lines.push( line );
            line = word;
        } else {
            line = test;
        }
    }

    if( line ) lines.push( line );
    return lines;
}
