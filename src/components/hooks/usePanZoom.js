import { useState, useRef, useEffect } from 'react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;

export default function usePanZoom( canvasRef, resetTrigger ) {
    // Estado React para forzar re-render al transformar
    const [ transform, setTransform ] = useState( { x: 0, y: 0, scale: 1 } );
    // Refs para leer/escribir sin reiniciar el hook
    const transformRef = useRef( transform );
    const draggingRef = useRef( false );
    const oxRef = useRef( 0 );
    const oyRef = useRef( 0 );

    // Mantiene la ref sincronizada con el estado
    useEffect( () => {
        transformRef.current = transform;
    }, [ transform ] );

    // Instalamos listeners UNA ÚNICA vez al montar
    useEffect( () => {
        const canvas = canvasRef.current;
        if( !canvas ) return;

        const onWheel = e => {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            let newScale = transformRef.current.scale * ( 1 + delta );
            newScale = Math.min( Math.max( MIN_SCALE, newScale ), MAX_SCALE );
            const next = { ...transformRef.current, scale: newScale };
            transformRef.current = next;
            setTransform( next );
        };

        const onMouseDown = e => {
            draggingRef.current = true;
            oxRef.current = e.clientX - transformRef.current.x;
            oyRef.current = e.clientY - transformRef.current.y;
            canvas.style.cursor = 'grabbing';
        };

        const onMouseMove = e => {
            if( !draggingRef.current ) return;
            const x = e.clientX - oxRef.current;
            const y = e.clientY - oyRef.current;
            const next = { ...transformRef.current, x, y };
            transformRef.current = next;
            setTransform( next );
        };

        const onMouseUp = () => {
            draggingRef.current = false;
            canvas.style.cursor = transformRef.current.scale > 1 ? 'grab' : 'auto';
        };

        canvas.addEventListener( 'wheel', onWheel, { passive: false } );
        canvas.addEventListener( 'mousedown', onMouseDown );
        window.addEventListener( 'mousemove', onMouseMove );
        window.addEventListener( 'mouseup', onMouseUp );

        return () => {
            canvas.removeEventListener( 'wheel', onWheel );
            canvas.removeEventListener( 'mousedown', onMouseDown );
            window.removeEventListener( 'mousemove', onMouseMove );
            window.removeEventListener( 'mouseup', onMouseUp );
        };
    }, [ canvasRef ] );

    // Cuando resetTrigger (animTrigger) cambia, reiniciamos SOLO el pan (x,y), 
    // pero dejamos el zoom (scale) como estaba.
    useEffect( () => {
        setTransform( t => {
            const next = { x: 0, y: 0, scale: t.scale };
            transformRef.current = next;
            return next;
        } );
    }, [ resetTrigger ] );

    return { transform, handlers: {} };
}
