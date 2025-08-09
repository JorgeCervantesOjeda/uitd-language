// src/components/logic/useDrawCanvas.js

import { useEffect } from 'react';
import { drawDiagram } from '../../utils/drawDiagram';

export default function useDrawCanvas( canvasRef, params ) {
    useEffect( () => {
        const canvas = canvasRef.current;
        if( !canvas ) return;

        // 1) Ajuste para pantallas de alta densidad
        const dpr = window.devicePixelRatio || 1;
        const container = canvas.parentElement;
        const availWidth = container ? container.clientWidth : params.canvasSize.width;
        const availHeight = container ? container.clientHeight : params.canvasSize.height;

        canvas.width = availWidth * dpr;
        canvas.height = availHeight * dpr;
        canvas.style.width = `${availWidth}px`;
        canvas.style.height = `${availHeight}px`;

        const ctx = canvas.getContext( '2d' );
        ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );

        // Dibujo inicial
        drawDiagram( ctx, { ...params } );

        // Estado de arrastre
        let dragging = false;
        let selected = null;
        let startMouse = { x: 0, y: 0 };
        let initialPositions = {};

        // Convierte coords de mouse a coords del diagrama
        const getTransformed = ( e ) => {
            const rect = canvas.getBoundingClientRect();
            const x = ( e.clientX - rect.left - params.transform.x ) / params.transform.scale;
            const y = ( e.clientY - rect.top - params.transform.y ) / params.transform.scale;
            return { x, y };
        };

        const onMouseDown = ( e ) => {
            const { x, y } = getTransformed( e );
            let hit = null;

            // 1) Hit-test nodos
            for( const node of Object.values( params.nodesMap ) ) {
                if(
                    x >= node._x &&
                    x <= node._x + node._size.width &&
                    y >= node._y &&
                    y <= node._y + node._size.height
                ) {
                    hit = node;
                    break;
                }
            }
            // 2) Si no, hit-test etiquetas
            if( !hit ) {
                for( const lbl of Object.values( params.labelMap ) ) {
                    if(
                        x >= lbl.x &&
                        x <= lbl.x + lbl.width &&
                        y >= lbl.y &&
                        y <= lbl.y + lbl.height
                    ) {
                        hit = lbl;
                        break;
                    }
                }
            }
            // 3) Si no impacta nada, salimos para que quede el pan activado
            if( !hit ) return;

            // en src/components/logic/useDrawCanvas.js, dentro de onMouseDown:


            // 4) Preparamos el arrastre tomando como raíz el ancestro más alto
            dragging = true;
            // si es nodo, calculamos su clave de raíz: antes del primer "."
            const isNode = hit._x !== undefined && hit.key;
            const rootKey = isNode
                ? hit.key.split( '.' )[ 0 ]  // ancestro más alto
                : null;
            selected = hit;
            startMouse = { x, y };
            initialPositions = {};

            if( isNode ) {
                // Registramos la posición original del ancestro y todos sus descendientes
                const prefix = rootKey + '.';
                for( const [ key, node ] of Object.entries( params.nodesMap ) ) {
                    if( key === rootKey || key.startsWith( prefix ) ) {
                        initialPositions[ key ] = { x: node._x, y: node._y };
                    }
                }
            } else {
                // Etiqueta (sin hijos)
                initialPositions[ hit.id ] = { x: hit.x, y: hit.y };
            }

            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = ( e ) => {
            if( !dragging || !selected ) return;
            const { x, y } = getTransformed( e );
            const dx = x - startMouse.x;
            const dy = y - startMouse.y;

            // 6) Aplicamos el desplazamiento a todos los afectados
            for( const [ key, pos ] of Object.entries( initialPositions ) ) {
                if( params.nodesMap[ key ] ) {
                    params.nodesMap[ key ]._x = pos.x + dx;
                    params.nodesMap[ key ]._y = pos.y + dy;
                } else if( params.labelMap[ key ] ) {
                    params.labelMap[ key ].x = pos.x + dx;
                    params.labelMap[ key ].y = pos.y + dy;
                }
            }

            // 7) Redibujamos
            ctx.clearRect( 0, 0, canvas.width, canvas.height );
            drawDiagram( ctx, { ...params } );
        };

        const onMouseUp = () => {
            dragging = false;
            selected = null;
        };

        // 8) Registramos listeners solo en el canvas
        canvas.addEventListener( 'mousedown', onMouseDown );
        canvas.addEventListener( 'mousemove', onMouseMove );
        canvas.addEventListener( 'mouseup', onMouseUp );

        return () => {
            canvas.removeEventListener( 'mousedown', onMouseDown );
            canvas.removeEventListener( 'mousemove', onMouseMove );
            canvas.removeEventListener( 'mouseup', onMouseUp );
        };
    }, [
        canvasRef,
        params.drawOrder,
        params.canvasSize,
        params.nodesMap,
        params.labelMap,
        params.transform,
        params.vars,
        params.classes,
        params.labelClasses,
        params.charLimit,
        params.charWidth,
        params.lineHeight,
        params.animTrigger,
        params.continueTrigger,
        params.tick
    ] );
}
