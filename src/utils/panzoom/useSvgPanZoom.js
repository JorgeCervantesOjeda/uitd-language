import { useCallback, useMemo } from "react";
import usePanZoomCore from "./usePanZoomCore";

// Asegura <g data-panzoom-root> y sizing 100%
function ensureRootG( svg ) {
    if( !svg ) return null;
    svg.removeAttribute( "width" );
    svg.removeAttribute( "height" );
    svg.style.width = "100%";
    svg.style.height = "100%";
    let rootG = svg.querySelector( "g[data-panzoom-root]" );
    if( !rootG ) {
        rootG = document.createElementNS( "http://www.w3.org/2000/svg", "g" );
        rootG.setAttribute( "data-panzoom-root", "" );
        const nodes = Array.from( svg.childNodes );
        nodes.forEach( ( n ) => {
            if( n.nodeType === 1 && n.nodeName.toLowerCase() === "defs" ) return;
            rootG.appendChild( n );
        } );
        svg.appendChild( rootG );
    }
    return rootG;
}

export default function useSvgPanZoom( { svgRef, minScale, maxScale } ) {
    const getHost = useCallback( () => svgRef?.current, [ svgRef ] );

    const screenToScene = useCallback(
        ( t, clientX, clientY ) => {
            const svg = svgRef?.current;
            if( !svg ) return { x: clientX, y: clientY };
            const g = ensureRootG( svg ) || svg;
            const ctm = g.getScreenCTM?.();
            if( ctm && ctm.inverse ) {
                const inv = ctm.inverse();
                const pt = svg.createSVGPoint();
                pt.x = clientX;
                pt.y = clientY;
                const sp = pt.matrixTransform( inv );
                return { x: sp.x, y: sp.y };
            }
            // Fallback aproximado
            const rect = svg.getBoundingClientRect?.() || { left: 0, top: 0 };
            return {
                x: ( clientX - rect.left - t.x ) / t.scale,
                y: ( clientY - rect.top - t.y ) / t.scale,
            };
        },
        [ svgRef ]
    );

    const apply = useCallback(
        ( t ) => {
            const svg = svgRef?.current;
            if( !svg ) return;
            const g = ensureRootG( svg );
            if( !g ) return;
            g.setAttribute(
                "transform",
                `matrix(${t.scale} 0 0 ${t.scale} ${t.x} ${t.y})`
            );
        },
        [ svgRef ]
    );

    const adapter = useMemo(
        () => ( { getHost, screenToScene, apply } ),
        [ getHost, screenToScene, apply ]
    );

    return usePanZoomCore( { adapter, minScale, maxScale } );
}
