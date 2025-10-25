import { useState, useEffect, useRef } from 'react';
import {
    SIMULATION_STEPS,
    SPRING_K,
    FRICTION_GAMMA,
    COULOMB_C,
    TIME_STEP,
    EQUILIBRIUM_DIST
} from '../../utils/constants';

export default function useForceSimulation(
    fragment,
    nodesMap,
    labelMap,
    animTrigger,
    continueTrigger,
    hiddenSteps = 10,      // NUEVO: pasos iniciales sin mostrar
    stepsPerFrame = 10,     // NUEVO: pasos por cuadro antes de pintar
    onFinish,
    getViewportBounds
) {
    const [ tick, setTick ] = useState( 0 );
    const posRef = useRef( {} );
    const velRef = useRef( {} );
    const basePosRef = useRef( null );
    const prevAnimRef = useRef();
    const prevContinueRef = useRef();
    const finishedRef = useRef( false );
    const firstMountRef = useRef( true ); // evitar tratar el primer render como "restart"
    // Mantener funciones estables durante la animación
    const onFinishRef = useRef( onFinish );
    const getViewportBoundsRef = useRef( getViewportBounds );
    useEffect( () => { onFinishRef.current = onFinish; }, [ onFinish ] );
    useEffect( () => { getViewportBoundsRef.current = getViewportBounds; }, [ getViewportBounds ] );


    useEffect( () => {

        // --- detectar cambios, ignorando el primer montaje ---
        const rawAnimChanged = prevAnimRef.current !== animTrigger;
        const rawContinueChanged = prevContinueRef.current !== continueTrigger;
        const isFirstMount = firstMountRef.current === true;
        firstMountRef.current = false;
        prevAnimRef.current = animTrigger;
        prevContinueRef.current = continueTrigger;
        const animChanged = !isFirstMount && rawAnimChanged;               // "Restart Simulation"
        const continueChanged = !isFirstMount && rawContinueChanged;       // "Continue Animation"
        console.log( '[UFS INIT] isFirstMount=', isFirstMount, 'rawAnimChanged=', rawAnimChanged, 'rawContinueChanged=', rawContinueChanged );
        console.log( '[UFS INIT] computed animChanged=', animChanged, 'continueChanged=', continueChanged );

        if( animChanged || continueChanged )
            finishedRef.current = false;
        // Considerar "restart" solo después del primer montaje del hook
        const isRestart = animChanged && !firstMountRef.current;
        if( firstMountRef.current ) {
            firstMountRef.current = false;
        }

        const nodeIds = Object.keys( nodesMap );
        const labelIds = Object.keys( labelMap );
        const allIds = [ ...nodeIds, ...labelIds ];
        console.log( '[UFS INIT] nodeIds=', nodeIds.length, 'labelIds=', labelIds.length );

        // 1) Helper para tomar posiciones base actuales (tras rehidratación)
        const computeBasePos = () => {
            const bp = {};
            nodeIds.forEach( id => {
                const n = nodesMap[ id ];
                bp[ id ] = { x: n._x, y: n._y };
            } );
            labelIds.forEach( id => {
                const l = labelMap[ id ];
                bp[ id ] = { x: l.x, y: l.y };
            } );
            return bp;
        };

        // NUEVO: base aleatoria que **preserva la forma interna** de cada subárbol.
        // Toma el layout/rehidratación actual y traslada *todo el subárbol* a un ancla aleatoria por raíz.
        // El área inicial crece con √(número total de elementos).
        const computeRandomBasePosPreservingLayout = () => {
            const base = computeBasePos();
            const roots = Array.from( new Set( allIds.map( id => id.split( '.' )[ 0 ] ) ) );
            const N = Math.max( 1, allIds.length );
            const SPACING = 200;
            const side = Math.max( SPACING, Math.ceil( Math.sqrt( N ) ) * SPACING );
            const minX = -side / 2, minY = -side / 2;
            const rnd = () => Math.random() * side;
            // Objetivo aleatorio por raíz
            const target = {};
            roots.forEach( r => { target[ r ] = { x: minX + rnd(), y: minY + rnd() }; } );
            // Desplazar cada id por el offset (target_r - base_r)
            const out = {};
            allIds.forEach( id => {
                const r = id.split( '.' )[ 0 ];
                const dx = ( target[ r ].x - ( base[ r ]?.x ?? 0 ) );
                const dy = ( target[ r ].y - ( base[ r ]?.y ?? 0 ) );
                const bx = base[ id ]?.x ?? 0;
                const by = base[ id ]?.y ?? 0;
                out[ id ] = { x: bx + dx, y: by + dy };
            } );
            return out;
        };

        // Inicializa/renueva basePos
        let baseSource = null;
        if( animChanged ) {
            // Restart explícito: nuevas posiciones aleatorias (agrupadas por raíz)
            basePosRef.current = computeRandomBasePosPreservingLayout();
            baseSource = 'restart';
        } else if( continueChanged ) {
            // CONTINUE: tomar como base las posiciones *actuales* (incluye drag)
            basePosRef.current = computeBasePos();
            const rootIds = Array.from( new Set( allIds.map( id => id.split( '.' )[ 0 ] ) ) );
            rootIds.forEach( r => {
                // Δpos en 0 para evitar “saltos”; aseguramos velRef existente
                posRef.current[ r ] = { x: 0, y: 0 };
                if( !velRef.current[ r ] ) velRef.current[ r ] = { x: 0, y: 0 };
            } );
            baseSource = 'continue';    
        } else if( isFirstMount && !basePosRef.current ) {
            // Primer montaje: usar SIEMPRE la base ya rehidratada por FragmentCanvas (no randomizar)
            basePosRef.current = computeBasePos();
            baseSource = 'first-mount';
        }
        console.log( '[UFS BASE] source=', baseSource, 'basePosKeys=', basePosRef.current ? Object.keys( basePosRef.current ).length : 0 );

        // 2) Raíces
        const rootIds = Array.from( new Set( allIds.map( id => id.split( '.' )[ 0 ] ) ) );

        // 3) Inicializa o reutiliza estado dinámico
        if( isRestart ) {
            rootIds.forEach( r => {
                posRef.current[ r ] = { x: 0, y: 0 };
                velRef.current[ r ] = { x: 0, y: 0 };
            } );
            // Aplicar inmediatamente la base aleatoria a pantalla (todos los hijos en la misma (x,y) que su raíz)
            const basePos = basePosRef.current || computeRandomBasePosPreservingLayout();
            allIds.forEach( id => {
                const root = id.split( '.' )[ 0 ];
                const x = basePos[ id ].x + ( posRef.current[ root ]?.x || 0 );
                const y = basePos[ id ].y + ( posRef.current[ root ]?.y || 0 );
                if( nodesMap[ id ] ) {
                    nodesMap[ id ]._x = x; nodesMap[ id ]._y = y;
                } else if( labelMap[ id ] ) {
                    labelMap[ id ].x = x; labelMap[ id ].y = y;
                }
            } );
            setTick( t => t + 1 );

        }

        const edgePairs = fragment.transitions.map( e => [ e.from, e.to ] );

        // 4) Parámetros de integración
        const DT_MIN = 0.01;
        const DT_MAX = 20;
        const THRESH_HIGH = 50;
        const THRESH_LOW = 10;
        const ADJUST_PERCENT = 0.1;
        const MAX_DISPLACEMENT = 50;
        let dt = TIME_STEP;

        let step = 0;
        let rafId = null;

        // --- NUEVO: separar integración y commit para poder "ocultar" pasos ---
        function integrateOneStep() {
            // Asegurar basePos una sola vez, en el primer paso efectivo
            if( !basePosRef.current ) basePosRef.current = computeBasePos();
            const basePos = basePosRef.current;

            // a) Fuerzas iniciales a cero
            const force = {};
            allIds.forEach( id => { force[ id ] = { x: 0, y: 0 }; } );

            // b) Resortes
            edgePairs.forEach( ( [ u, v ] ) => {
                const rU = u.split( '.' )[ 0 ], rV = v.split( '.' )[ 0 ];
                const p1 = { x: basePos[ u ].x + posRef.current[ rU ].x, y: basePos[ u ].y + posRef.current[ rU ].y };
                const p2 = { x: basePos[ v ].x + posRef.current[ rV ].x, y: basePos[ v ].y + posRef.current[ rV ].y };
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const dist = Math.hypot( dx, dy ) || 1e-6;
                const dif = dist - EQUILIBRIUM_DIST;
                const fs = SPRING_K * Math.sign( dif ) * dif * dif;
                const fx = fs * ( dx / dist ), fy = fs * ( dy / dist );
                force[ u ].x += fx; force[ u ].y += fy;
                force[ v ].x -= fx; force[ v ].y -= fy;
            } );

            // c) Coulomb
            for( let i = 0; i < allIds.length; i++ ) {
                for( let j = i + 1; j < allIds.length; j++ ) {
                    const a = allIds[ i ], b = allIds[ j ];
                    const rA = a.split( '.' )[ 0 ], rB = b.split( '.' )[ 0 ];
                    const pa = { x: basePos[ a ].x + posRef.current[ rA ].x, y: basePos[ a ].y + posRef.current[ rA ].y };
                    const pb = { x: basePos[ b ].x + posRef.current[ rB ].x, y: basePos[ b ].y + posRef.current[ rB ].y };
                    const dx = pb.x - pa.x, dy = pb.y - pa.y;
                    const dist2 = dx * dx + dy * dy || 1e-6;
                    const f = COULOMB_C / dist2;
                    const d = Math.sqrt( dist2 );
                    const fx = f * ( dx / d ), fy = f * ( dy / d );
                    force[ a ].x -= fx; force[ a ].y -= fy;
                    force[ b ].x += fx; force[ b ].y += fy;
                }
            }

            // e) Suma por raíz
            const rootForce = {};
            rootIds.forEach( r => { rootForce[ r ] = { x: 0, y: 0 }; } );
            allIds.forEach( id => {
                const root = id.split( '.' )[ 0 ];
                rootForce[ root ].x += force[ id ].x;
                rootForce[ root ].y += force[ id ].y;
            } );

            // f) Integración
            let maxDisp = 0;
            rootIds.forEach( r => {
                // asegurar estructuras por raíz para evitar "v es undefined"
                const p = ( posRef.current[ r ] ||= { x: 0, y: 0 } );
                const v = ( velRef.current[ r ] ||= { x: 0, y: 0 } );
                v.x += ( rootForce[ r ].x - FRICTION_GAMMA * v.x ) * dt;
                v.y += ( rootForce[ r ].y - FRICTION_GAMMA * v.y ) * dt;
                let dx = v.x * dt;
                let dy = v.y * dt;
                const disp = Math.hypot( dx, dy );
                if( disp > MAX_DISPLACEMENT ) {
                    const s = MAX_DISPLACEMENT / disp;
                    dx *= s; dy *= s;
                }
                p.x += dx;
                p.y += dy;
                maxDisp = Math.max( maxDisp, disp );
            } );

            // g) Adaptación de dt
            if( maxDisp > THRESH_HIGH ) {
                dt = Math.max( DT_MIN, dt * ( 1 - ADJUST_PERCENT ) );
            } else if( maxDisp < THRESH_LOW ) {
                dt = Math.min( DT_MAX, dt * ( 1 + ADJUST_PERCENT ) );
            }

            step++;
        }

        function commitPositions() {
            const basePos = basePosRef.current || computeBasePos();
            // h) Calcular posiciones provisionales y bounding por raíz
            const tempPos = {};          // id -> { x, y }
            const rootBounds = {};       // root -> { minX, minY, maxX, maxY }

            allIds.forEach( id => {
                const root = id.split( '.' )[ 0 ];
                const rawX = basePos[ id ].x + posRef.current[ root ].x;
                const rawY = basePos[ id ].y + posRef.current[ root ].y;
                tempPos[ id ] = { x: rawX, y: rawY };

                // dimensiones del ítem
                let w = 0, h = 0;
                if( nodesMap[ id ]?._size ) {
                    w = nodesMap[ id ]._size.width || 0;
                    h = nodesMap[ id ]._size.height || 0;
                } else if( labelMap[ id ] ) {
                    w = labelMap[ id ].width || 0;
                    h = labelMap[ id ].height || 0;
                }
                const x1 = rawX, y1 = rawY;
                const x2 = rawX + w, y2 = rawY + h;
                const b = rootBounds[ root ] || { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
                if( x1 < b.minX ) b.minX = x1;
                if( y1 < b.minY ) b.minY = y1;
                if( x2 > b.maxX ) b.maxX = x2;
                if( y2 > b.maxY ) b.maxY = y2;
                rootBounds[ root ] = b;
            } );



            // j) Aplicar posiciones finales (SIN clamping/shift por viewport)
            allIds.forEach( id => {
                const x = tempPos[ id ].x;
                const y = tempPos[ id ].y;
                if( nodesMap[ id ] ) {
                    nodesMap[ id ]._x = x; nodesMap[ id ]._y = y;
                } else {
                    labelMap[ id ].x = x; labelMap[ id ].y = y;
                }
            } );
        }        // --- FIN NUEVO ---

        // “fast-forward” inicial solo cuando el usuario pulsa Continue
        if( continueChanged && hiddenSteps > 0 ) {
            const target = Math.min( hiddenSteps, SIMULATION_STEPS );
            while( step < target )
                integrateOneStep();
            commitPositions();         // aplicamos solo una vez
            setTick( t => t + 1 );       // un solo render tras el salto
        }
        // --- FIN NUEVO ---

        function frame() {
            // Hacer varios pasos antes de pintar
            let count = 0;
            const toDo = Math.max( 1, stepsPerFrame | 0 );
            while( count < toDo && step < SIMULATION_STEPS ) {
                integrateOneStep();
                count++;
            }
            commitPositions();
            setTick( t => t + 1 );

            if( step < SIMULATION_STEPS ) {
                rafId = requestAnimationFrame( frame );
            } else {
                if( !finishedRef.current ) {
                    finishedRef.current = true;
                    if( onFinishRef.current ) onFinishRef.current();
                }
            }
        }

        // Arranca SOLO si el usuario pulsó "continuar"
        if( !( continueChanged && continueTrigger !== 0 ) )
            return;
        console.log( '[UFS START] scheduling RAF; continueChanged=', continueChanged, 'continueTrigger=', continueTrigger );
        rafId = requestAnimationFrame( frame );
        return () => rafId && cancelAnimationFrame( rafId );

    }, [ fragment, nodesMap, labelMap, animTrigger, continueTrigger, hiddenSteps, stepsPerFrame ] );

    return tick;
}
