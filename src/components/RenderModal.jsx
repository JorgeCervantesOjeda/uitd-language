import React, { useState, useRef, useEffect } from 'react';
import { D2 } from '@terrastruct/d2';

export default function RenderModal( { d2Source, isOpen, onClose } ) {

    const [ svg, setSvg ] = useState( '' );
    const [ loading, setLoading ] = useState( false );
    const [ full, setFull ] = useState( false );
    const d2 = useRef( new D2() );

    // Cache LRU simple para SVG compilados, máximo 2 entradas
    const cache = useRef( new Map() );

    const MAX_CACHE_ENTRIES = 2;

    useEffect( () => {
        if( !isOpen ) return;

        const key = d2Source;
        // Indicador para ignorar resultados antiguos
        let cancelled = false;

        // Primero comprueba caché
        if( cache.current.has( key ) ) {
            setSvg( cache.current.get( key ) );
            setLoading( false );
            return;
        }

        // Si no estaba en caché, compila
        setSvg( '' );
        setLoading( true );

        ( async () => {
            try {
                const { diagram, renderOptions } = await d2.current.compile( key, { layout: 'elk' } );
                const svgText = await d2.current.render( diagram, renderOptions );
                if( !cancelled ) {
                    // Solo actualiza si no hubo cleanup
                    setSvg( svgText );
                    // Guarda en caché
                    cache.current.set( key, svgText );
                    // Aplica LRU
                    if( cache.current.size > MAX_CACHE_ENTRIES ) {
                        const firstKey = cache.current.keys().next().value;
                        cache.current.delete( firstKey );
                    }
                }
            } catch( e ) {
                console.error( 'Error al renderizar con D2:', e );
            } finally {
                if( !cancelled ) {
                    setLoading( false );
                }
            }
        } )();

        // Cleanup para ignorar respuestas tardías
        return () => {
            cancelled = true;
        };
    }, [ isOpen, d2Source ] );

    const onDownloadSVG = () => {
        const blob = new Blob( [ svg ], { type: 'image/svg+xml' } );
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = 'diagram.svg';
        a.click();
        URL.revokeObjectURL( url );
    };

    const onDownloadJPG = () => {
        if( !svg ) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString( svg, 'image/svg+xml' );
        const svgElem = doc.documentElement;
        let width = parseFloat( svgElem.getAttribute( 'width' ) || '0' );
        let height = parseFloat( svgElem.getAttribute( 'height' ) || '0' );

        if( !( width > 0 && height > 0 ) ) {
            const viewBox = svgElem.getAttribute( 'viewBox' );
            if( viewBox ) {
                const parts = viewBox.trim().split( /[\s,]+/ ).map( Number );
                width = parts[ 2 ];
                height = parts[ 3 ];
            } else {
                console.warn( 'SVG sin width/height ni viewBox, usando 800×600 por defecto' );
                width = 800;
                height = 600;
            }
        }

        const svgBlob = new Blob( [ svg ], { type: 'image/svg+xml;charset=utf-8' } );
        const url = URL.createObjectURL( svgBlob );
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement( 'canvas' );
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext( '2d' );
            ctx.fillStyle = '#fff';
            ctx.fillRect( 0, 0, width, height );
            ctx.drawImage( img, 0, 0, width, height );
            URL.revokeObjectURL( url );
            canvas.toBlob(
                ( blobJpg ) => {
                    if( !blobJpg ) {
                        console.error( 'No se pudo generar el blob JPEG' );
                        return;
                    }
                    const link = document.createElement( 'a' );
                    link.href = URL.createObjectURL( blobJpg );
                    link.download = 'diagram.jpg';
                    document.body.appendChild( link );
                    link.click();
                    document.body.removeChild( link );
                    URL.revokeObjectURL( link.href );
                },
                'image/jpeg',
                0.92
            );
        };

        img.onerror = ( e ) => {
            console.error( 'Error al cargar la imagen SVG:', e );
            URL.revokeObjectURL( url );
        };

        img.src = url;
    };


    if( !isOpen ) return null;
    return (
        <div className="modal-backdrop" onClick={ onClose }>
            <div className={ `modal${full ? ' fullscreen' : ''}` } onClick={ e => e.stopPropagation() }>
                <header>
                    {/* maximize/download/close buttons */ }
                    <button onClick={ () => setFull( ( f ) => !f ) } disabled={ loading }>
                        { full ? 'Restore' : 'Maximize' }
                    </button>
                    <button onClick={ onDownloadSVG } disabled={ !svg || loading }>
                        SVG
                    </button>
                    <button onClick={ onDownloadJPG } disabled={ !svg || loading }>
                        JPG
                    </button>
                    <button className="close-btn" onClick={ onClose }>
                        X
                    </button>                </header>
                <div className="content">
                    { loading ? <p>Loading diagram...</p> : <div dangerouslySetInnerHTML={ { __html: svg } } /> }
                </div>
            </div>
        </div>
    );
}
