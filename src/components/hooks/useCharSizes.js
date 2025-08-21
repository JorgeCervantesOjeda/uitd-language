import { useState, useLayoutEffect } from 'react';
import { LINE_SPACING } from '../../utils/constants';

/**
* Hook para medir ancho y alto de carácter en pixels
* @param {React.RefObject<HTMLCanvasElement>} canvasRef
* @returns {[charWidth: number, lineHeight: number]}
*/
export default function useCharSizes( canvasRef ) {
    const [ sizes, setSizes ] = useState( [ 8, 10 ] );

    useLayoutEffect( () => {
        const canvas = canvasRef.current;
        if( !canvas ) return;

        const ctx = canvas.getContext( '2d' );
        // Aplica la fuente actual del canvas
        const font = window.getComputedStyle( canvas ).font;
        if( font ) ctx.font = font;

        const sample = 'MMM';
        const measured = ctx.measureText( sample );
        const charWidth = measured.width / sample.length / 2;
        const lineHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent + LINE_SPACING;

        setSizes( [ charWidth, lineHeight ] );
    }, [ canvasRef.current ] );

    return sizes;
}