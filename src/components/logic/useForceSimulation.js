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
    continueTrigger
) {
    const [ tick, setTick ] = useState( 0 );
    const posRef = useRef( {} );
    const velRef = useRef( {} );
    const prevAnimRef = useRef();  // para detectar reinicio completo
    const prevContinueRef = useRef();  // para detectar continuaciones

    useEffect( () => {
        if( continueTrigger === 0 ) return;

        // Detectamos cambios en triggers
        const animChanged = prevAnimRef.current !== animTrigger;
        prevAnimRef.current = animTrigger;
        const continueChanged = prevContinueRef.current !== continueTrigger;
        prevContinueRef.current = continueTrigger;

        const nodeIds = Object.keys( nodesMap );
        const labelIds = Object.keys( labelMap );
        const allIds = [ ...nodeIds, ...labelIds ];

        // 1) Posiciones base
        const basePos = {};
        nodeIds.forEach( id => {
            const n = nodesMap[ id ];
            basePos[ id ] = { x: n._x, y: n._y };
        } );
        labelIds.forEach( id => {
            const l = labelMap[ id ];
            basePos[ id ] = { x: l.x, y: l.y };
        } );

        // 2) Raíces
        const rootIds = Array.from( new Set( allIds.map( id => id.split( '.' )[ 0 ] ) ) );

        // 3) Inicializa o reutiliza estado dinámico
        if( animChanged ) {
            // Reinicio completo: reset pos y vel
            rootIds.forEach( r => {
                posRef.current[ r ] = { x: 0, y: 0 };
                velRef.current[ r ] = { x: 0, y: 0 };
            } );
        } else if( continueChanged ) {
            // Continuación: reset solo offsets para evitar saltos
            rootIds.forEach( r => {
                posRef.current[ r ] = { x: 0, y: 0 };
            } );
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

        function stepSimulation() {
            // a) Fuerzas iniciales a cero
            const force = {};
            allIds.forEach( id => { force[ id ] = { x: 0, y: 0 }; } );

            // b) Fuerzas de resorte
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

            // c) Fuerzas de Coulomb
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

            // f) Integración semiexplícita (sin clamp de posiciones negativas)
            let maxDisp = 0;
            rootIds.forEach( r => {
                const v = velRef.current[ r ];
                v.x += ( rootForce[ r ].x - FRICTION_GAMMA * v.x ) * dt;
                v.y += ( rootForce[ r ].y - FRICTION_GAMMA * v.y ) * dt;
                let dx = v.x * dt;
                let dy = v.y * dt;
                const disp = Math.hypot( dx, dy );
                if( disp > MAX_DISPLACEMENT ) {
                    const s = MAX_DISPLACEMENT / disp;
                    dx *= s; dy *= s;
                }
                posRef.current[ r ].x += dx;
                posRef.current[ r ].y += dy;
                maxDisp = Math.max( maxDisp, disp );
            } );

            // g) Adaptación de dt
            if( maxDisp > THRESH_HIGH ) {
                dt = Math.max( DT_MIN, dt * ( 1 - ADJUST_PERCENT ) );
            } else if( maxDisp < THRESH_LOW ) {
                dt = Math.min( DT_MAX, dt * ( 1 + ADJUST_PERCENT ) );
            }

            // h) Aplicar posiciones finales (permitir coordenadas negativas)
            allIds.forEach( id => {
                const root = id.split( '.' )[ 0 ];
                const rawX = basePos[ id ].x + posRef.current[ root ].x;
                const rawY = basePos[ id ].y + posRef.current[ root ].y;
                const x = rawX;
                const y = rawY;
                if( nodesMap[ id ] ) {
                    nodesMap[ id ]._x = x; nodesMap[ id ]._y = y;
                } else {
                    labelMap[ id ].x = x; labelMap[ id ].y = y;
                }
            } );

            setTick( t => t + 1 );
            step++;
            if( step < SIMULATION_STEPS ) {
                rafId = requestAnimationFrame( stepSimulation );
            }
        }

        step = 0;
        stepSimulation();
        return () => rafId && cancelAnimationFrame( rafId );
    }, [ fragment, nodesMap, labelMap, animTrigger, continueTrigger ] );

    return tick;
}
