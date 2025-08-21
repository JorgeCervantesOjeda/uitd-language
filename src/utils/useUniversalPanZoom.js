// src/utils/useUniversalPanZoom.js
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import svgPanZoom from 'svg-pan-zoom';

export default function useUniversalPanZoom(
    containerRef,
    resetTrigger,
    { minZoom = 0.05, maxZoom = 10 } = {}
) {
    const panZoomInst = useRef( null );
    const [ transform, setTransform ] = useState( { x: 0, y: 0, scale: 1 } );
    const stateRef = useRef( transform );

    // 1) Mantener stateRef sincronizado con el último transform
    useEffect( () => {
        stateRef.current = transform;
    }, [ transform ] );

    // 2) Montar y limpiar SVG o Canvas según el contenido del contenedor
    useLayoutEffect( () => {
        const container = containerRef.current;
        if( !container ) return;

        const svgElem = container.querySelector( 'svg' );
        let instance;
        let wheelHandler, downHandler, moveHandler, upHandler;

        if( svgElem ) {
            // ————— MODO SVG —————
            svgElem.removeAttribute( 'width' );
            svgElem.removeAttribute( 'height' );
            svgElem.style.width = '100%';
            svgElem.style.height = '100%';

            instance = svgPanZoom( svgElem, {
                zoomEnabled: true,
                panEnabled: true,
                controlIconsEnabled: false,
                mouseWheelZoomEnabled: false,
                dblClickZoomEnabled: false,
                minZoom,
                maxZoom,
                fit: true,
                center: true,
                // NUEVO: sincronizar estado con svg-pan-zoom para conocer zoom/pan actuales
                onZoom: ( zoom ) => {
                    try {
                        const pan = instance.getPan();
                        const next = { x: pan.x, y: pan.y, scale: zoom };
                        stateRef.current = next;
                        setTransform( next );
                    } catch { }
                },
                onPan: ( pan ) => {
                    try {
                        const zoom = instance.getZoom();
                        const next = { x: pan.x, y: pan.y, scale: zoom };
                        stateRef.current = next;
                        setTransform( next );
                    } catch { }
                }

            } );
            panZoomInst.current = instance;

            // Zoom centrado en el punto del cursor
            wheelHandler = e => {
                e.preventDefault();
                const rect = svgElem.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;
                const factor = 1 - e.deltaY * 0.001;
                instance.zoomAtPointBy( factor, { x: offsetX, y: offsetY } );
            };
            svgElem.addEventListener( 'wheel', wheelHandler, { passive: false } );

            // NUEVO: inicializar transform con el estado real del viewer
            try {
                const initZoom = instance.getZoom();
                const initPan = instance.getPan();
                const init = { x: initPan.x, y: initPan.y, scale: initZoom };
                stateRef.current = init;
                setTransform( init );
            } catch { 

            }
            
        } else {
            // ————— MODO CANVAS —————
            let dragging = false;
            let ox = 0, oy = 0;

            // Zoom centrado en el punto del cursor
            wheelHandler = e => {
                e.preventDefault();
                const rect = container.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                const delta = -e.deltaY * 0.001;
                const s0 = stateRef.current.scale;
                const s1 = Math.min( maxZoom, Math.max( minZoom, s0 * ( 1 + delta ) ) );
                const { x: x0, y: y0 } = stateRef.current;
                const x1 = cx - ( cx - x0 ) * ( s1 / s0 );
                const y1 = cy - ( cy - y0 ) * ( s1 / s0 );
                const next = { x: x1, y: y1, scale: s1 };
                stateRef.current = next;
                setTransform( next );
            };
            downHandler = e => {
                dragging = true;
                ox = e.clientX - stateRef.current.x;
                oy = e.clientY - stateRef.current.y;
                container.style.cursor = 'grabbing';
            };
            moveHandler = e => {
                if( !dragging ) return;
                const x = e.clientX - ox;
                const y = e.clientY - oy;
                const next = { ...stateRef.current, x, y };
                stateRef.current = next;
                setTransform( next );
            };
            upHandler = () => {
                dragging = false;
                container.style.cursor =
                    stateRef.current.scale > 1 ? 'grab' : 'auto';
            };

            container.addEventListener( 'wheel', wheelHandler, { passive: false } );
            container.addEventListener( 'mousedown', downHandler );
            window.addEventListener( 'mousemove', moveHandler );
            window.addEventListener( 'mouseup', upHandler );
        }

        // Cleanup al desmontar o antes de re-montar
        return () => {
            if( svgElem && wheelHandler ) {
                svgElem.removeEventListener( 'wheel', wheelHandler );
            }
            if( instance ) {
                try {
                    instance.destroy();
                } catch( err ) {
                    console.warn( 'svg-pan-zoom destroy error', err );
                }
                if( panZoomInst.current === instance ) {
                    panZoomInst.current = null;
                }
            }
            if( !svgElem ) {
                container.removeEventListener( 'wheel', wheelHandler );
                container.removeEventListener( 'mousedown', downHandler );
                window.removeEventListener( 'mousemove', moveHandler );
                window.removeEventListener( 'mouseup', upHandler );
            }
        };
    }, [
        containerRef.current,
        resetTrigger,
        minZoom,
        maxZoom
    ] );

    // 3) resetTrigger solo limpia el pan (x,y), no el zoom (scale)
    useEffect( () => {
        setTransform( t => ( { x: 0, y: 0, scale: t.scale } ) );
        stateRef.current = { x: 0, y: 0, scale: stateRef.current.scale };
    }, [ resetTrigger ] );

    return transform;
}
