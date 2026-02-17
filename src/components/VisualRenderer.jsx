// src/components/VisualRenderer.jsx
import React, { useMemo, forwardRef } from 'react';
import FragmentCanvas from './FragmentCanvas';

const cloneNode = ( node ) => ( {
    ...node,
    children: ( node.children || [] ).map( cloneNode )
} );

const mergeNodeIntoMap = ( targetMap, node ) => {
    const key = String( node.id );
    const existing = targetMap.get( key );

    if( !existing ) {
        targetMap.set( key, cloneNode( node ) );
        return;
    }

    // Si hay diferencias entre fragmentos, tomamos la variante con más hijos
    // para evitar que aparezcan UIs "sueltas" por ramas incompletas.
    if( ( node.children?.length || 0 ) > ( existing.children?.length || 0 ) ) {
        existing.label = node.label;
        existing.className = node.className;
        existing.style = node.style;
    }

    const childMap = new Map(
        ( existing.children || [] ).map( child => [ String( child.id ), child ] )
    );
    ( node.children || [] ).forEach( child => {
        mergeNodeIntoMap( childMap, child );
    } );
    existing.children = Array.from( childMap.values() );
};

const mergeHierarchies = ( roots ) => {
    const rootMap = new Map();
    roots.forEach( root => mergeNodeIntoMap( rootMap, root ) );
    return Array.from( rootMap.values() );
};

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
            hierarchy: mergeHierarchies( dataStructure.fragments.flatMap( f => f.hierarchy ) ),
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
