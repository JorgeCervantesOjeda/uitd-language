import React from 'react';
import { Stage, Layer, Rect, Text, Arrow, Group } from 'react-konva';

const calculateUIHeight = ( uiRef, uis, GAP, MIN_HEIGHT ) => {
    const nestedUIs = uiRef.nested || [];
    const nestedHeights = nestedUIs.map( nestedUI => calculateUIHeight( nestedUI, uis, GAP, MIN_HEIGHT ) + GAP * 2 );
    const nestedMaxHeight = Math.max( ...nestedHeights, 0 );
    return MIN_HEIGHT + nestedMaxHeight + ( nestedUIs.length ? GAP : 0 );
};

const calculateUIWidth = ( uiRef, uis, GAP, MIN_WIDTH, getTextWidth ) => {
    const ui = uis.find( u => u.id.toString() === uiRef.id );
    if( !ui ) return MIN_WIDTH;
    const text = `${uiRef.id} ${ui.name}`;
    const textWidth = getTextWidth( text ) + 20;
    const nestedUIs = uiRef.nested || [];
    const nestedWidths = nestedUIs.map( nestedUI => calculateUIWidth( nestedUI, uis, GAP, MIN_WIDTH, getTextWidth ) + GAP * 2 );
    const nestedMaxWidth = Math.max( ...nestedWidths, MIN_WIDTH );
    return Math.max( textWidth, nestedMaxWidth );
};

const getTextWidth = ( text ) => {
    const canvas = document.createElement( 'canvas' );
    const context = canvas.getContext( '2d' );
    context.font = '15px Arial';
    return context.measureText( text ).width;
};

const formNestedKey = ( parentKey, childId ) => {
    const insertPosition = parentKey.lastIndexOf( ')' ) === -1 ? parentKey.length : parentKey.lastIndexOf( ')' );
    return `${parentKey.slice( 0, insertPosition )}(${childId})${parentKey.slice( insertPosition )}`;
};

const renderedUIs = ( uiRefs, uis, x, y, GAP, MIN_HEIGHT, MIN_WIDTH, uiPositions, parentKey = '' ) => {
    let xOffset = x;
    const elements = uiRefs.map( ( uiRef, uiIndex ) => {
        const ui = uis.find( u => u.id.toString() === uiRef.id );
        if( !ui ) return null;

        const uiWidth = calculateUIWidth( uiRef, uis, GAP, MIN_WIDTH, getTextWidth );
        const uiHeight = calculateUIHeight( uiRef, uis, GAP, MIN_HEIGHT );

        const newKey = parentKey ? formNestedKey( parentKey, uiRef.id ) : uiRef.id.toString();
        uiPositions[ newKey ] = { x: xOffset, y, width: uiWidth, height: uiHeight, nested: [] };

        const nestedYOffset = GAP * 2;
        const nestedElements = renderedUIs( uiRef.nested || [], uis, xOffset + GAP, y + nestedYOffset, GAP, MIN_HEIGHT, MIN_WIDTH, uiPositions, newKey );

        const uiElement = (
            <Group key={ newKey } x={ xOffset } y={ y }>
                <Rect width={ uiWidth } height={ uiHeight } fill="lightblue" stroke="black" />
                <Text text={ `${uiRef.id} ${ui.name}` } fontSize={ 15 } padding={ 5 } />
                { nestedElements }
            </Group>
        );

        xOffset += uiWidth + GAP * 2; // Update xOffset for the next UI

        return uiElement;
    } );

    return elements;
};

const renderTransition = ( transition, uiPositions, GAP ) => {
    const fromPos = uiPositions[ transition.from ];
    const toPos = uiPositions[ transition.to ];

    if( !fromPos || !toPos ) return null;

    const text = `${transition.action} "${transition.target}"` + ( transition.condition ? ` AND\\n(${transition.condition})` : '' );

    // Calculate start and end points
    const startX = fromPos.x + fromPos.width;
    const startY = fromPos.y + fromPos.height / 2;
    const endX = toPos.x;
    const endY = toPos.y + toPos.height / 2;

    return (
        <Group key={ `${transition.from}-${transition.to}` } x={ 0 } y={ 0 }>
            <Arrow
                points={ [ startX, startY, startX + GAP, startY, startX + GAP, endY, endX, endY ] }
                stroke="black"
                fill="black"
            />
            <Group x={ ( startX + endX ) / 2 } y={ ( startY + endY ) / 2 }>
                <Rect width={ getTextWidth( text ) + 10 } height={ 20 } fill="lightgrey" />
                <Text text={ text } fontSize={ 12 } padding={ 5 } />
            </Group>
        </Group>
    );
};

const renderFragment = ( fragment, uis, GAP, MIN_HEIGHT, MIN_WIDTH ) => {
    const uiPositions = {};
    let yOffset = 30; // Adjusted initial yOffset

    const fragmentUIs = fragment.draws.map( ( draw, drawIndex ) => {
        let xOffset = 20;
        let rowHeight = 0;

        const uiElements = renderedUIs( draw.uiRefs, uis, xOffset, yOffset, GAP, MIN_HEIGHT, MIN_WIDTH, uiPositions );

        rowHeight = Math.max( rowHeight, ...draw.uiRefs.map( uiRef => calculateUIHeight( uiRef, uis, GAP, MIN_HEIGHT ) ) );
        yOffset += rowHeight + GAP * 2;

        return (
            <Group key={ `${fragment.name}-draw-${drawIndex}` } x={ 0 } y={ 0 }>
                { uiElements }
            </Group>
        );
    } );

    const transitions = fragment.transitions.map( ( transition ) => renderTransition( transition, uiPositions, GAP ) );

    return (
        <Group key={ fragment.name } x={ 20 } y={ yOffset }>
            <Text text={ `FRAGMENT "${fragment.name}"` } fontSize={ 18 } padding={ 5 } y={ -20 } />
            { fragmentUIs }
            { transitions }
        </Group>
    );
};

const Renderer = ( { data } ) => {
    const { name, uis, fragments } = data;
    const GAP = 10;
    const MIN_HEIGHT = 50;
    const MIN_WIDTH = 100;

    return (
        <Stage width={ 1000 } height={ 800 } style={ { backgroundColor: '#f0f0f0' } }>
            <Layer>
                <Text text={ `UITD "${name}"` } fontSize={ 24 } padding={ 10 } y={ 20 } />
                { fragments && fragments.map( ( fragment ) => renderFragment( fragment, uis, GAP, MIN_HEIGHT, MIN_WIDTH ) ) }
            </Layer>
        </Stage>
    );
};

export default Renderer;
