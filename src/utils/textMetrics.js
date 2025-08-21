// src/utils/textMetrics.js
import { LABEL_PADDING } from './constants';
import { wrapText } from './canvasUtils';

export function computeTextMetrics( text, charLimit, charWidth, lineH ) {
    const lines = wrapText( text, charLimit );
    // ancho de la línea más larga
    const maxChars = Math.max( ...lines.map( l => l.length ) );
    const width = maxChars * charWidth + 2 * LABEL_PADDING;
    // altura total: n líneas × altura + padding arriba y abajo
    const height = lines.length * lineH + LABEL_PADDING;
    return { lines, width, height };
}
