import React, { useRef, useEffect } from 'react';

const Renderer = ( { data } ) => {
    const svgRef = useRef( null );

    useEffect( () => {
        if( !data || !data.fragments ) return;

        const svg = svgRef.current;
        svg.innerHTML = '';

        let yPosition = 20;
        const xStart = 20;
        const initialHeight = 50;
        const initialWidth = 150;
        const verticalSpacing = 40;
        const horizontalPadding = 20;
        const verticalPadding = 20;

        const uiPositions = {};
        const transitions = [];

        data.fragments.forEach( fragment => {
            fragment.draws.forEach( draw => {
                let xPosition = xStart;
                let maxHeight = 0;

                draw.uiRefs.forEach( ref => {
                    const dimensions = drawUI( ref, xPosition, yPosition, initialWidth, initialHeight, svg );
                    uiPositions[ ref.id ] = { x: xPosition, y: yPosition, width: initialWidth, height: dimensions.height };
                    xPosition += initialWidth + horizontalPadding;
                    maxHeight = Math.max( maxHeight, dimensions.height );
                } );
                yPosition += maxHeight + verticalSpacing;
            } );

            fragment.transitions.forEach( transition => {
                const transitionData = prepareTransition( transition, uiPositions );
                if( transitionData ) transitions.push( transitionData );
            } );
        } );

        transitions.forEach( ( { line } ) => svg.appendChild( line ) );

        checkAndAdjustOverlaps( transitions );

        function drawUI( ref, x, y, width, height, svgElement, parentId = null ) {
            const uiId = parentId ? `${parentId}(${ref.id})` : ref.id;
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            rect.setAttribute( "x", x );
            rect.setAttribute( "y", y );
            rect.setAttribute( "width", width );
            rect.setAttribute( "height", height );
            rect.setAttribute( "fill", "none" );
            rect.setAttribute( "stroke", "black" );

            const text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );
            text.setAttribute( "x", x + 10 );
            text.setAttribute( "y", y + 20 );
            text.textContent = `${ref.id}: ${data.uis.find( ui => ui.id.toString() === ref.id ).name}`;
            svgElement.appendChild( rect );
            svgElement.appendChild( text );

            let nestedHeight = height;
            if( ref.nested && ref.nested.length > 0 ) {
                let nestedY = y + height + verticalPadding;
                ref.nested.forEach( nestedRef => {
                    const nestedDimensions = drawUI( nestedRef, x + horizontalPadding, nestedY, width - 2 * horizontalPadding, height, svgElement, uiId );
                    nestedY += nestedDimensions.height + verticalPadding;
                    nestedHeight = nestedY - y;
                } );
            }
            rect.setAttribute( "height", nestedHeight );
            return { width, height: nestedHeight };
        }

        function prepareTransition( transition, positions ) {
            const fromId = getNestedId( transition.from, positions );
            const toId = getNestedId( transition.to, positions );
            const fromPos = positions[ fromId ];
            const toPos = positions[ toId ];

            if( !fromPos || !toPos ) return null;

            const line = document.createElementNS( "http://www.w3.org/2000/svg", "line" );
            line.setAttribute( "x1", fromPos.x + fromPos.width / 2 );
            line.setAttribute( "y1", fromPos.y + fromPos.height );
            line.setAttribute( "x2", toPos.x + toPos.width / 2 );
            line.setAttribute( "y2", toPos.y );
            line.setAttribute( "stroke", "blue" );
            line.setAttribute( "marker-end", "url(#arrowhead)" );

            return { line, fromPos, toPos, transition };
        }

        function checkAndAdjustOverlaps( transitions ) {
            // Logic to detect and adjust overlapping transitions
        }

        function getNestedId( idPath, positions ) {
            return Object.keys( positions ).find( key => key.endsWith( `(${idPath})` ) || key === idPath );
        }

        const defs = document.createElementNS( "http://www.w3.org/2000/svg", "defs" );
        const marker = document.createElementNS( "http://www.w3.org/2000/svg", "marker" );
        marker.setAttribute( "id", "arrowhead" );
        marker.setAttribute( "markerWidth", "10" );
        marker.setAttribute( "markerHeight", "7" );
        marker.setAttribute( "refX", "0" );
        marker.setAttribute( "refY", "3.5" );
        marker.setAttribute( "orient", "auto" );
        const polygon = document.createElementNS( "http://www.w3.org/2000/svg", "polygon" );
        polygon.setAttribute( "points", "0 0, 10 3.5, 0 7" );
        polygon.setAttribute( "fill", "blue" );
        marker.appendChild( polygon );
        defs.appendChild( marker );
        svg.appendChild( defs );
    }, [ data ] );

    return <svg ref={ svgRef } width="100%" height="1000" style={ { border: '1px solid black', backgroundColor: 'white' } }></svg>;
};

export default Renderer;
