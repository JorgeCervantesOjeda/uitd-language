import React from 'react';
import { Stage, Layer, Rect, Text, Arrow, Group } from 'react-konva';

const Renderer = ( { data } ) => {

    console.log( 'Rendering data', data );
    const { name, uis, fragments } = data;

    const MIN_HEIGHT = 50;
    const MIN_WIDTH = 100;
    const GAP = 10;
    const TITLE_GAP = 20;

    const getTextWidth = ( text ) => {
        const canvas = document.createElement( 'canvas' );
        const context = canvas.getContext( '2d' );
        context.font = '15px Arial';
        return context.measureText( text ).width;
    };

    const calculateUIHeight = ( uiRef ) => {
        const nestedUIs = uiRef.nested || [];
        return MIN_HEIGHT + nestedUIs.length * ( MIN_HEIGHT + GAP ) + ( nestedUIs.length > 0 ? GAP : 0 );
    };

    const calculateUIWidth = ( uiRef ) => {
        const ui = uis.find( u => u.id.toString() === uiRef.id );
        if( !ui ) return MIN_WIDTH;
        const text = `${uiRef.id} ${ui.name}`;
        const textWidth = getTextWidth( text ) + 20;
        const nestedUIs = uiRef.nested || [];
        const nestedWidths = nestedUIs.map( nestedUI => calculateUIWidth( nestedUI ) + GAP * 2 );
        const nestedMaxWidth = Math.max( ...nestedWidths, MIN_WIDTH );
        return Math.max( textWidth, nestedMaxWidth );
    };

    const renderUI = ( uiRef, x, y ) => {
        const ui = uis.find( u => u.id.toString() === uiRef.id );
        if( !ui ) return null;
        const nestedUIs = uiRef.nested || [];
        const height = calculateUIHeight( uiRef );
        const width = calculateUIWidth( uiRef );

        return (
            <Group key={ uiRef.id } x={ x } y={ y }>
                <Rect width={ width } height={ height } fill="lightblue" stroke="black" />
                <Text text={ `${uiRef.id} ${ui.name}` } fontSize={ 15 } padding={ 5 } />
                { nestedUIs.map( ( nestedUI, index ) => (
                    <Group key={ nestedUI.id } x={ GAP } y={ MIN_HEIGHT + GAP + ( index * ( MIN_HEIGHT + GAP ) ) }>
                        { renderUI( nestedUI, 0, 0 ) }
                    </Group>
                ) ) }
            </Group>
        );
    };

    const renderTransition = ( transition, uiPositions ) => {
        const fromPos = uiPositions[ transition.from ];
        const toPos = uiPositions[ transition.to ];

        if( !fromPos || !toPos ) return null;

        const text = `${transition.action} ${transition.target}` + ( transition.condition ? ` AND ${transition.condition}` : '' );

        return (
            <Group key={ `${transition.from}-${transition.to}` } x={ 0 } y={ 0 }>
                <Arrow
                    points={ [ fromPos.x + 50, fromPos.y + 25, toPos.x + 50, toPos.y + 25 ] }
                    stroke="black"
                    fill="black"
                />
                <Group x={ ( fromPos.x + toPos.x ) / 2 } y={ ( fromPos.y + toPos.y ) / 2 }>
                    <Rect width={ getTextWidth( text ) + 10 } height={ 20 } fill="lightgrey" />
                    <Text
                        text={ text }
                        fontSize={ 12 }
                        padding={ 5 }
                    />
                </Group>
            </Group>
        );
    };

    const uiPositions = {};
    let yOffset = TITLE_GAP + 30; // Adjusted initial yOffset

    const renderFragment = ( fragment ) => {
        const fragmentUIs = fragment.draws.map( ( draw, drawIndex ) => {
            let xOffset = 20;
            let rowHeight = 0;

            const renderedUIs = draw.uiRefs.map( ( uiRef, uiIndex ) => {
                const x = xOffset;
                const y = yOffset; // Use current yOffset for all UIs in this row

                uiPositions[ uiRef.id ] = { x, y };

                const uiWidth = calculateUIWidth( uiRef );
                const uiHeight = calculateUIHeight( uiRef );
                rowHeight = Math.max( rowHeight, uiHeight );
                xOffset += uiWidth + GAP * 2;

                return renderUI( uiRef, x, y );
            } );

            yOffset += rowHeight + GAP * 2; // Adjust yOffset for the next row based on the max height of the current row

            return (
                <Group key={ `${fragment.name}-draw-${drawIndex}` } x={ 0 } y={ 0 }>
                    { renderedUIs }
                </Group>
            );
        } );

        const transitions = fragment.transitions.map( transition => renderTransition( transition, uiPositions ) );

        return (
            <Group key={ fragment.name } x={ 20 } y={ yOffset }>
                <Text text={ `FRAGMENT "${fragment.name}"` } fontSize={ 18 } padding={ 5 } y={ -20 } />
                { fragmentUIs }
                { transitions }
            </Group>
        );
    };

    return (
        <Stage width={ 1000 } height={ 800 } style={ { backgroundColor: '#f0f0f0' } }>
            <Layer>
                <Text text={ `UITD "${name}"` } fontSize={ 24 } padding={ 10 } y={ TITLE_GAP } />
                { fragments && fragments.map( ( fragment, index ) => renderFragment( fragment ) ) }
            </Layer>
        </Stage>
    );
};

export default Renderer;
