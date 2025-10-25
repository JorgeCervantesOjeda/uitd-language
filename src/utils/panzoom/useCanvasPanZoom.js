import { useCallback, useMemo } from "react";
import usePanZoomCore from "./usePanZoomCore";

/**
* canvasRef: <canvas> donde dibujas
* containerRef: contenedor interactivo (puede ser el mismo canvas si quieres)
* drawScene: (ctx) => void   (debe dibujar la escena en coords de escena)
*/
export default function useCanvasPanZoom( {
    canvasRef,
    containerRef,
    drawScene,
    minScale,
    maxScale,
} ) {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const getHost = useCallback(
        () => ( containerRef?.current ? containerRef.current : canvasRef?.current ),
        [ containerRef, canvasRef ]
    );

    const screenToScene = useCallback(
        ( t, clientX, clientY ) => {
            const host = getHost();
            const rect = host?.getBoundingClientRect?.() || { left: 0, top: 0 };
            return {
                x: ( clientX - rect.left - t.x ) / t.scale,
                y: ( clientY - rect.top - t.y ) / t.scale,
            };
        },
        [ getHost ]
    );

    const apply = useCallback(
        ( t ) => {
            const canvas = canvasRef?.current;
            if( !canvas ) return;
            const ctx = canvas.getContext( "2d" );
            const rect = canvas.getBoundingClientRect();

            // Buffer físico en DPR
            const w = Math.round( rect.width * dpr );
            const h = Math.round( rect.height * dpr );
            if( canvas.width !== w || canvas.height !== h ) {
                canvas.width = w;
                canvas.height = h;
            }

            // Limpia y aplica transform
            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
            ctx.clearRect( 0, 0, canvas.width, canvas.height );
            ctx.setTransform( t.scale * dpr, 0, 0, t.scale * dpr, t.x * dpr, t.y * dpr );

            drawScene?.( ctx );
        },
        [ canvasRef, drawScene, dpr ]
    );

    const adapter = useMemo(
        () => ( { getHost, screenToScene, apply } ),
        [ getHost, screenToScene, apply ]
    );

    return usePanZoomCore( { adapter, minScale, maxScale } );
}
