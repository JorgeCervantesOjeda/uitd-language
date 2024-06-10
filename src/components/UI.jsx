import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { calculateUIHeight, calculateUIWidth } from '../utils/utils';

const renderUI = ( uiRef, x, y, uis, GAP, MIN_HEIGHT, MIN_WIDTH, getTextWidth ) => {
    const ui = uis.find( u => u.id.toString() === uiRef.id );
    if( !ui ) return null;
    const nestedUIs = uiRef.nested || [];
    const height = calculateUIHeight( uiRef, uis, GAP, MIN_HEIGHT );
    const width = calculateUIWidth( uiRef, uis, GAP, MIN_WIDTH, getTextWidth );

    let nestedYOffset = GAP * 2;
    return (
        <Group key={ uiRef.id } x={ x } y={ y }>
            <Rect width={ width } height={ height } fill="lightblue" stroke="black" />
            <Text text={ `${uiRef.id} ${ui.name}` } fontSize={ 15 } padding={ 5 } />
            { nestedUIs.map( ( nestedUI, index ) => {
                const nestedHeight = calculateUIHeight( nestedUI, uis, GAP, MIN_HEIGHT );
                const nestedY = nestedYOffset;
                nestedYOffset += nestedHeight + GAP;
                return (
                    <Group key={ nestedUI.id } x={ GAP } y={ nestedY }>
                        { renderUI( nestedUI, 0, 0, uis, GAP, MIN_HEIGHT, MIN_WIDTH, getTextWidth ) }
                    </Group>
                );
            } ) }
        </Group>
    );
};

const UI = ( { uiRef, x, y, uis, GAP, MIN_HEIGHT, MIN_WIDTH, getTextWidth } ) => {
    return renderUI( uiRef, x, y, uis, GAP, MIN_HEIGHT, MIN_WIDTH, getTextWidth );
};

export default UI;
