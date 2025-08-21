import { useCallback, useEffect, useRef, useState } from "react";

/**
* Core común de Pan/Zoom.
* Recibe un "adaptador" con:
*  - getHost(): HTMLElement
*  - screenToScene(t, clientX, clientY): {x,y}
*  - apply(t): void
*  - onAttach?(): void
*  - onDetach?(): void
*/
export default function usePanZoomCore( {
    adapter,
    minScale = 0.05,
    maxScale = 50,
} ) {
    const clamp = useCallback(
        ( s ) => Math.max( minScale, Math.min( maxScale, Number( s ) || 1 ) ),
        [ minScale, maxScale ]
    );

    const [ t, setT ] = useState( { x: 0, y: 0, scale: 1 } );
    const tRef = useRef( t );
    useEffect( () => {
        tRef.current = t;
    }, [ t ] );

    const setPanAbs = useCallback( ( x, y ) => {
        setT( ( prev ) => ( {
            ...prev,
            x: Number.isFinite( x ) ? x : prev.x,
            y: Number.isFinite( y ) ? y : prev.y,
        } ) );
    }, [] );

    const setZoomAbs = useCallback(
        ( z ) => setT( ( prev ) => ( { ...prev, scale: clamp( z ) } ) ),
        [ clamp ]
    );

    const onWheel = useCallback(
        ( e ) => {
            e.preventDefault();
            const host = adapter.getHost?.();
            if( !host ) return;
            const rect = host.getBoundingClientRect?.();
            if( !rect ) return;

            const unit = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 100 : 1;
            const factor = Math.pow( 1.0025, e.deltaY * unit );
            const cur = tRef.current;
            const newScale = clamp( cur.scale / factor );

            const scene = adapter.screenToScene( cur, e.clientX, e.clientY );
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const newX = px - scene.x * newScale;
            const newY = py - scene.y * newScale;

            setT( ( prev ) => ( { ...prev, x: newX, y: newY, scale: newScale } ) );
        },
        [ adapter, clamp ]
    );

    const onPointerPan = useCallback( ( e ) => {
        if( e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen" )
            return;
        if( e.button !== 0 ) return;
    }, [] );

    useEffect( () => {
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        let touchCache = [];

        const host = adapter.getHost?.();
        if( !host ) return;
        host.style.touchAction = "none";
        host.style.userSelect = "none";
        host.style.WebkitUserSelect = "none";

        const onPointerDown = ( e ) => {
            if( e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen" )
                return;
            if( e.button !== 0 ) return;
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            try {
                e.currentTarget.setPointerCapture?.( e.pointerId );
            } catch { }
            e.preventDefault();
        };

        const onPointerMove = ( e ) => {
            if( e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen" )
                return;
            if( !dragging ) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            const cur = tRef.current;
            setPanAbs( cur.x + dx, cur.y + dy );
        };

        const onPointerUp = () => {
            dragging = false;
        };

        const onTouchStart = ( e ) => {
            touchCache = Array.from( e.touches );
        };

        const onTouchMove = ( e ) => {
            e.preventDefault();
            if( touchCache.length === 0 ) {
                touchCache = Array.from( e.touches );
                return;
            }
            if( e.touches.length === 1 && touchCache.length === 1 ) {
                // pan
                const prev = touchCache[ 0 ];
                const curT = tRef.current;
                const cur = e.touches[ 0 ];
                const dx = cur.clientX - prev.clientX;
                const dy = cur.clientY - prev.clientY;
                touchCache = [ cur ];
                setPanAbs( curT.x + dx, curT.y + dy );
            } else if( e.touches.length >= 2 ) {
                // pinch
                const p0Prev = touchCache[ 0 ] || e.touches[ 0 ];
                const p1Prev = touchCache[ 1 ] || e.touches[ 1 ];
                const p0 = e.touches[ 0 ];
                const p1 = e.touches[ 1 ];
                const dPrev = Math.hypot(
                    p0Prev.clientX - p1Prev.clientX,
                    p0Prev.clientY - p1Prev.clientY
                );
                const dCur = Math.hypot(
                    p0.clientX - p1.clientX,
                    p0.clientY - p1.clientY
                );
                const factor = ( dCur || 1 ) / ( dPrev || 1 );
                const cur = tRef.current;
                const newScale = clamp( cur.scale * factor );
                const cx = ( p0.clientX + p1.clientX ) / 2;
                const cy = ( p0.clientY + p1.clientY ) / 2;
                const scene = adapter.screenToScene( cur, cx, cy );
                const rect = host.getBoundingClientRect();
                const px = cx - rect.left;
                const py = cy - rect.top;
                const newX = px - scene.x * newScale;
                const newY = py - scene.y * newScale;
                setT( ( prev ) => ( { ...prev, x: newX, y: newY, scale: newScale } ) );
                touchCache = [ p0, p1 ];
            }
        };

        const onTouchEnd = () => {
            touchCache = [];
        };

        host.addEventListener( "pointerdown", onPointerDown );
        host.addEventListener( "pointermove", onPointerMove );
        host.addEventListener( "pointerup", onPointerUp );
        host.addEventListener( "pointercancel", onPointerUp );
        host.addEventListener( "wheel", onWheel, { passive: false } );
        host.addEventListener( "touchstart", onTouchStart, { passive: false } );
        host.addEventListener( "touchmove", onTouchMove, { passive: false } );
        host.addEventListener( "touchend", onTouchEnd );

        adapter.onAttach?.();

        return () => {
            host.removeEventListener( "pointerdown", onPointerDown );
            host.removeEventListener( "pointermove", onPointerMove );
            host.removeEventListener( "pointerup", onPointerUp );
            host.removeEventListener( "pointercancel", onPointerUp );
            host.removeEventListener( "wheel", onWheel );
            host.removeEventListener( "touchstart", onTouchStart );
            host.removeEventListener( "touchmove", onTouchMove );
            host.removeEventListener( "touchend", onTouchEnd );
            adapter.onDetach?.();
        };
    }, [ adapter, onWheel, setPanAbs ] );

    useEffect( () => {
        adapter.apply?.( tRef.current );
    }, [] ); // primera aplicación

    useEffect( () => {
        adapter.apply?.( t );
    }, [ adapter, t ] );

    return {
        t,
        setT,
        setPanAbs,
        setZoomAbs,
    };
}
