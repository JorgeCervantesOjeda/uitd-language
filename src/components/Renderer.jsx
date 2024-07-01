import React, { useRef, useEffect } from 'react';

const Renderer = ( { data } ) => {
    const svgRef = useRef( null );

    useEffect( () => {
        if( !data || !data.fragments ) return;

        const svg = svgRef.current;
        svg.innerHTML = '';

        let yPosition = 20;
        const xStart = 20;
        const initialHeight = 30;
        const initialWidth = 150;
        const verticalSpacing = 40;
        const horizontalPadding = 20;
        const verticalPadding = 20;

        const uiPositions = {}; // Store the positions of each UI element for transitions
        const arrowData = []; // Store data for all arrows to check overlaps

        data.fragments.forEach( fragment => {
            let xPosition = xStart;
            let maxHeight = 0; // Reset maxHeight for each row

            fragment.draws.forEach( draw => {
                draw.uiRefs.forEach( ref => {
                    const dimensions = drawUI( ref, xPosition, yPosition, initialWidth, initialHeight, svg );
                    xPosition += dimensions.width + horizontalPadding;
                    maxHeight = Math.max( maxHeight, dimensions.height );
                } );
                xPosition = xStart; // Reset xPosition after each row
                yPosition += maxHeight + verticalSpacing; // Move yPosition down by maxHeight and verticalSpacing
            } );

            fragment.transitions.forEach( transition => {
                const arrow = calculateArrowPosition( transition, uiPositions );
                if( arrow ) arrowData.push( arrow );
            } );

            // Draw arrows after calculating all positions to handle overlaps
            adjustAndDrawArrows( arrowData, svg );
        } );

        function drawUI( ref, x, y, initialWidth, initialHeight, svgElement, parentId = null ) {
            let uiId;
            if( parentId ) {
                const firstCloseParenIndex = parentId.indexOf( ")" );
                if( firstCloseParenIndex === -1 ) {
                    uiId = `${parentId}(${ref.id})`;
                } else {
                    const partBefore = parentId.substring( 0, firstCloseParenIndex );
                    const partAfter = parentId.substring( firstCloseParenIndex );
                    uiId = `${partBefore}(${ref.id})${partAfter}`;
                }
            } else {
                uiId = ref.id.toString();
            }

            const uiData = data.uis.find( ui => ui.id.toString() === ref.id );
            if( !uiData ) {
                return { width: 0, height: 0 };
            }

            // Initial setup for the UI rectangle
            const rect = document.createElementNS( "http://www.w3.org/2000/svg", "rect" );
            const text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );
            text.setAttribute( "x", x + 10 );
            text.setAttribute( "y", y + 15 );
            text.textContent = `${ref.id}: ${uiData.name}`;
            text.setAttribute( "fill", "black" );

            // Append text first to measure
            svgElement.appendChild( text );

            var maxWidth = initialWidth;
            var totalHeight = initialHeight;
            var nestedY = y + 30; // Start position for nested UIs

            // Process nested UIs if any
            if( ref.nested && ref.nested.length > 0 ) {
                ref.nested.forEach( nestedRef => {
                    const nestedInitialWidth = initialWidth;
                    const nestedDimensions = drawUI( nestedRef, x + 10, nestedY, nestedInitialWidth, initialHeight, svgElement, uiId );
                    nestedY += nestedDimensions.height + 10; // Increment Y position for the next nested UI
                    maxWidth = Math.max( maxWidth, nestedDimensions.width + 20 ); // Adjust width if nested UI is wider
                    totalHeight += nestedDimensions.height + 10; // Increment total height to fit all nested UIs
                } );
            }

            // Set dimensions for the current UI rect
            rect.setAttribute( "x", x );
            rect.setAttribute( "y", y );
            rect.setAttribute( "width", maxWidth );
            rect.setAttribute( "height", totalHeight );
            rect.setAttribute( "fill", "none" );
            rect.setAttribute( "stroke", "black" );

            if( ref.full ) {
                rect.setAttribute( "stroke-width", "4" );
                //rect.setAttribute( "stroke-dasharray", "5,5" );
            }

            // Append the rect after adjusting dimensions
            svgElement.insertBefore( rect, text ); // Ensure text is on top of the rectangle

            uiPositions[ uiId ] = { x, y, width: maxWidth, height: totalHeight };

            return { width: maxWidth, height: totalHeight };
        }

        function calculateArrowPosition( transition, positions ) {
            const fromPos = positions[ transition.from ];
            const toPos = positions[ transition.to ];
            return fromPos && toPos ? { from: { x: fromPos.x + fromPos.width / 2, y: fromPos.y + fromPos.height }, to: { x: toPos.x + toPos.width / 2, y: toPos.y }, transition } : null;
        }

        function adjustAndDrawArrows( arrows, svgElement ) {
            arrows.forEach( arrow => {
                adjustArrow( arrow, svgElement );
            } );
        }

        function adjustArrow( arrow, svgElement ) {
            const line = document.createElementNS( "http://www.w3.org/2000/svg", "line" );
            line.setAttribute( "x1", arrow.from.x );
            line.setAttribute( "y1", arrow.from.y );
            line.setAttribute( "x2", arrow.to.x );
            line.setAttribute( "y2", arrow.to.y );
            line.setAttribute( "stroke", "blue" );
            line.setAttribute( "marker-end", "url(#arrowhead)" );
            svgElement.appendChild( line );
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

    return <svg ref={ svgRef } width="100%" height="10000" style={ { border: '1px solid black', backgroundColor: 'white' } }></svg>;
};

export default Renderer;
