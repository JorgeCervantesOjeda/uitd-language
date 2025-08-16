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
    transform,
    onSimFinish,
    onDragEnd
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

    // Viewport actual en coordenadas de escena según transform y tamaño visible
    const getViewportBounds = () => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if( !container ) return null;
        const w = container.clientWidth || 0;
        const h = container.clientHeight || 0;
        const s = transform?.scale || 1;
        const tx = transform?.x || 0;
        const ty = transform?.y || 0;
        const minX = ( -tx ) / s;
        const minY = ( -ty ) / s;
        const maxX = ( w - tx ) / s;
        const maxY = ( h - ty ) / s;
        return { minX, minY, maxX, maxY };
    };

    // 3) Simulación de fuerzas (devuelve un "tick" para disparar redraw)
    const tick = useForceSimulation(
        fragment,
        nodesMap,
        labelMap,
        animTrigger,
        continueTrigger,
        undefined,
        undefined,
        onSimFinish,
        getViewportBounds
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
        lineHeight,
        onDragEnd
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
