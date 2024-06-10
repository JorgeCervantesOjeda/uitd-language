import React from 'react';
import { Group, Line, Arrow, Text } from 'react-konva';
import { resolveNestedPosition } from '../utils/utils';

const getRectangleEdgeIntersection = ( rect, direction, offset ) => {
    const { x, y, width, height } = rect;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    switch( direction ) {
        case 'right':
            return { x: x + width, y: centerY + offset };
        case 'left':
            return { x: x, y: centerY + offset };
        case 'top':
            return { x: centerX + offset, y: y };
        case 'bottom':
            return { x: centerX + offset, y: y + height };
        default:
            return { x: centerX, y: centerY };
    }
};

const findBestTrajectory = ( start, end, existingTrajectories, GAP ) => {
    // This function should return a set of points for the trajectory
    // that does not interfere with existing trajectories and maintains
    // a minimum gap from them. This is a placeholder for the algorithm.
    return [
        start.x, start.y,
        ( start.x + end.x ) / 2, start.y,
        ( start.x + end.x ) / 2, end.y,
        end.x, end.y
    ];
};

const Transition = ( { transition, uiPositions, existingTrajectories, arrowPositions, GAP } ) => {
    const fromPos = resolveNestedPosition( transition.from, uiPositions );
    const toPos = resolveNestedPosition( transition.to, uiPositions );

    if( !fromPos || !toPos ) {
        return null;
    }

    const text = `${transition.action} "${transition.target}"` + ( transition.condition ? ` AND\n(${transition.condition})` : '' );

    // Determine offset for arrow contact points
    const fromOffset = arrowPositions[ fromPos.id ] || 0;
    const toOffset = arrowPositions[ toPos.id ] || 0;

    // Update arrowPositions with new offsets
    arrowPositions[ fromPos.id ] = fromOffset + GAP;
    arrowPositions[ toPos.id ] = toOffset + GAP;

    const start = getRectangleEdgeIntersection( fromPos, 'right', fromOffset );
    const end = getRectangleEdgeIntersection( toPos, 'top', toOffset );

    const points = findBestTrajectory( start, end, existingTrajectories, GAP );

    // Add this trajectory to existing trajectories
    existingTrajectories.push( { key: `${transition.from}-${transition.to}`, points } );

    return (
        <Group key={ `${transition.from}-${transition.to}` } x={ 0 } y={ 0 }>
            <Line
                points={ points }
                stroke="black"
                strokeWidth={ 2 }
                lineCap="round"
                lineJoin="round"
            />
            <Arrow
                points={ [ points[ points.length - 4 ], points[ points.length - 3 ], points[ points.length - 2 ], points[ points.length - 1 ] ] }
                stroke="black"
                fill="black"
                pointerLength={ 10 }
                pointerWidth={ 10 }
            />
            <Text
                text={ text }
                fontSize={ 12 }
                padding={ 5 }
                x={ points[ 2 ] }
                y={ points[ 3 ] }
                fill="black"
            />
        </Group>
    );
};

export default Transition;
