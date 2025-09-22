// src/components/VisualRenderer.jsx
import React, { useMemo, forwardRef } from 'react';
import FragmentCanvas from './FragmentCanvas';

export const VisualRenderer = forwardRef(
    ( ( props, ref ) => {
        const {
            dataStructure,
            animTrigger,
            continueTrigger,
            transform,
            onForcesSimFinish,
            onForcesDragEnd
        } = props;

        // Combina todos los fragments para pasarlos al canvas
        const merged = useMemo( () => ( {
            hierarchy: dataStructure.fragments.flatMap( f => f.hierarchy ),
            transitions: dataStructure.fragments.flatMap( f => f.transitions ),
            labels: dataStructure.fragments.flatMap( f => f.labels ),
            width: dataStructure.fragments.reduce(
                ( max, f ) => Math.max( max, f.width || 15 ),
                5
            )
        } ), [ dataStructure.fragments, animTrigger ] );

        return (
            <FragmentCanvas
                ref={ ref }
                fragment={ merged }
                vars={ dataStructure.vars }
                classes={ dataStructure.classes }
                labelClasses={ dataStructure.labelClasses }
                charLimit={ merged.width }
                animTrigger={ animTrigger }
                continueTrigger={ continueTrigger }
                transform={ transform }
                onSimFinish={ onForcesSimFinish }
                onDragEnd={ onForcesDragEnd }
            />
        );
    } ) );

export default VisualRenderer;
