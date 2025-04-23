import React, { useState, useRef, useEffect } from 'react';
import { D2 } from '@terrastruct/d2';

export default function RenderModal( { d2Source, isOpen, onClose } ) {
    const [ svg, setSvg ] = useState( '' );
    const [ loading, setLoading ] = useState( false );
    const [ full, setFull ] = useState( false );
    const d2 = useRef( new D2() );

    useEffect( () => {
        if( !isOpen ) return;

        // Limpiamos el SVG previo y arrancamos el spinner
        console.log( 'Modal abierto: iniciando render' );
        setSvg( '' );
        setLoading( true );

        // Compilamos y renderizamos en línea
        ( async () => {
            try {
                console.log( 'Compilando D2…' );
                const { diagram, renderOptions } =
                    await d2.current.compile( d2Source, { layout: 'elk' } );
                console.log( 'Diagram listo, renderizando SVG…' );
                const svgText = await d2.current.render( diagram, renderOptions );
                console.log( 'SVG generado, actualizando estado…' );
                setSvg( svgText );
            } catch( e ) {
                console.error( 'Error al renderizar con D2:', e );
            } finally {
                setLoading( false );
                console.log( 'Render finalizado' );
            }
        } )();
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

        // 1) Parsear el SVG y obtener su tamaño
        const parser = new DOMParser();
        const doc = parser.parseFromString( svg, 'image/svg+xml' );
        const svgElem = doc.documentElement;

        let width = parseFloat( svgElem.getAttribute( 'width' ) );
        let height = parseFloat( svgElem.getAttribute( 'height' ) );

        if( !( width > 0 && height > 0 ) ) {
            const viewBox = svgElem.getAttribute( 'viewBox' );
            if( viewBox ) {
                // viewBox = "minX minY width height"
                const parts = viewBox.trim().split( /[\s,]+/ ).map( Number );
                width = parts[ 2 ];
                height = parts[ 3 ];
            } else {
                console.warn( 'SVG sin width/height ni viewBox, usando 800×600 por defecto' );
                width = 800;
                height = 600;
            }
        }

        // 2) Crear la imagen desde el blob del SVG
        const svgBlob = new Blob( [ svg ], { type: 'image/svg+xml;charset=utf-8' } );
        const url = URL.createObjectURL( svgBlob );
        const img = new Image();

        img.onload = () => {
            // 3) Crear canvas con el tamaño correcto
            const canvas = document.createElement( 'canvas' );
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext( '2d' );

            // Pintar fondo blanco para JPG
            ctx.fillStyle = '#fff';
            ctx.fillRect( 0, 0, width, height );

            // Dibujar el SVG
            ctx.drawImage( img, 0, 0, width, height );
            URL.revokeObjectURL( url );

            // 4) Generar el blob JPEG y forzar la descarga
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
            <div
                className={ `modal${full ? ' fullscreen' : ''}` }
                onClick={ ( e ) => e.stopPropagation() }
            >
                <header>
                    {/* Maximizar / Restaurar */ }
                    <button onClick={ () => setFull( ( f ) => !f ) } disabled={ loading }>
                        { full ? 'Restore' : 'Maximize' }
                    </button>
                    {/* Descargar SVG */ }
                    <button onClick={ onDownloadSVG } disabled={ !svg || loading }>
                        SVG
                    </button>
                    {/* Descargar JPG */ }
                    <button onClick={ onDownloadJPG } disabled={ !svg || loading }>
                        JPG
                    </button>
                    {/* Cerrar (esquina superior derecha con .close-btn) */ }
                    <button className="close-btn" onClick={ onClose }>
                        ×
                    </button>
                </header>

                <div className="content">
                    { loading ? <p>Loading diagram...</p> : <div dangerouslySetInnerHTML={ { __html: svg } } /> }
                </div>
            </div>
        </div>
    );
}
