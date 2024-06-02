import React from 'react';
import { Stage, Layer, Rect, Text, Arrow } from 'react-konva';

const Renderer = ( { data } ) => {
    if( !data || !data.uis ) return null;

    const renderUIs = () => {
        return Object.keys( data.uis ).map( ( key, index ) => {
            const ui = data.uis[ key ];
            return (
                <React.Fragment key={ key }>
                    <Rect
                        x={ 20 }
                        y={ 50 * index }
                        width={ 200 }
                        height={ 50 }
                        fill="lightblue"
                        stroke="black"
                    />
                    <Text
                        x={ 30 }
                        y={ 50 * index + 15 }
                        text={ ui.name }
                        fontSize={ 15 }
                        fill="black"
                    />
                </React.Fragment>
            );
        } );
    };

    const renderTransitions = () => {
        return data.fragments.flatMap( ( fragment, fragmentIndex ) =>
            fragment.transitions.map( ( transition, index ) => {
                const fromIndex = Object.keys( data.uis ).indexOf( transition.from );
                const toIndex = Object.keys( data.uis ).indexOf( transition.to );

                if( fromIndex === -1 || toIndex === -1 ) return null;

                return (
                    <Arrow
                        key={ `${fragmentIndex}-${index}` }
                        points={ [ 120, 50 * fromIndex + 25, 120, 50 * toIndex + 25 ] }
                        stroke="black"
                        fill="black"
                    />
                );
            } )
        );
    };

    return (
        <Stage width={ 80 } height={ 600 }>
            <Layer>
                { renderUIs() }
                { renderTransitions() }
            </Layer>
        </Stage>
    );
};

export default Renderer;
