// src/components/FragmentCanvas.jsx
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import useLayout from './logic/useLayout';
import useForceSimulation from './logic/useForceSimulation';
import useDrawCanvas from './logic/useDrawCanvas';
import useCharSizes from './hooks/useCharSizes';


const FragmentCanvas = forwardRef( function FragmentCanvas( {
    fragment,
    vars,
    classes,
    labelClasses,
    animTrigger,
    continueTrigger,
    charLimit,
    transform
}, ref ) {
    const canvasRef = useRef( null );

    // 1) Mide ancho y alto de carácter
    const [ charWidth, lineHeight ] = useCharSizes( canvasRef );

    // 2) Cálculo de layout: posiciones, orden de dibujo y tamaño de canvas
    const { drawOrder, canvasSize, nodesMap, labelMap } = useLayout(
        fragment,
        charLimit,
        charWidth,
        lineHeight,
        animTrigger,
    );

    // 3) Simulación de fuerzas (devuelve un "tick" para disparar redraw)
    const tick = useForceSimulation(
        fragment,
        nodesMap,
        labelMap,
        animTrigger,
        continueTrigger
    );


    // 4) Dibujar en el canvas según el transform pasado desde arriba
    useDrawCanvas( canvasRef, {
        drawOrder,
        canvasSize,
        nodesMap,
        labelMap,
        vars,
        classes,
        labelClasses,
        transform,    // usamos el transform externo
        tick,
        charLimit,
        charWidth,
        lineHeight
    } );

    useImperativeHandle( ref, () => ( {
        canvas: canvasRef.current,
        params: {
            drawOrder,
            canvasSize,
            nodesMap,
            labelMap,
            vars,
            classes,
            labelClasses,
            transform,
            tick,
            charLimit,
            charWidth,
            lineHeight
        }
    } ) );

    return (
        <canvas
            ref={ canvasRef }
            width={ canvasSize.width }
            height={ canvasSize.height }
            style={ {
                border: '1px solid #ddd',
                margin: '20px',
                cursor: transform.scale > 1 ? 'grab' : 'auto'
            } }
        />
    );
} );

export default FragmentCanvas;
