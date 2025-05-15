import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { D2 } from '@terrastruct/d2';
import svgPanZoom from 'svg-pan-zoom';

export default function RenderModal( { d2Source, isOpen, onClose } ) {
    const [ svg, setSvg ] = useState( '' );
    const [ loading, setLoading ] = useState( false );
    const [ full, setFull ] = useState( false );

    // 1) Layout engine persistido en localStorage
    const [ layoutEngine, setLayoutEngine ] = useState( () => {
        return localStorage.getItem( 'layoutEngine' ) || 'dagre';
    } );
    useEffect( () => {
        localStorage.setItem( 'layoutEngine', layoutEngine );
    }, [ layoutEngine ] );

    // 2) Instancia única de D2
    const d2 = useRef( null );
    useEffect( () => {
        d2.current = new D2();
    }, [] );

    // 3) Caché LRU para SVG (máx. 2 entradas)
    const cache = useRef( new Map() );
    const MAX_CACHE_ENTRIES = 2;
    const currentKeyRef = useRef( '' );

    // 4) Renderizado cuando cambian isOpen, d2Source o layoutEngine
    useEffect( () => {
        if( !isOpen ) return;

        const sourceKey = d2Source;
        const cacheKey = `${layoutEngine}::${sourceKey}`;
        currentKeyRef.current = cacheKey;

        if( cache.current.has( cacheKey ) ) {
            setSvg( cache.current.get( cacheKey ) );
            setLoading( false );
            return;
        }

        setSvg( '' );
        setLoading( true );

        ( async () => {
            try {
                const { diagram, renderOptions } = await d2.current.compile( sourceKey, { layout: layoutEngine } );
                const svgText = await d2.current.render( diagram, renderOptions );
                if( currentKeyRef.current !== cacheKey ) return;
                setSvg( svgText );
                cache.current.set( cacheKey, svgText );
                if( cache.current.size > MAX_CACHE_ENTRIES ) {
                    const firstKey = cache.current.keys().next().value;
                    cache.current.delete( firstKey );
                }
            } catch( e ) {
                console.error( 'Error al renderizar con D2:', e );
            } finally {
                if( currentKeyRef.current === cacheKey ) setLoading( false );
            }
        } )();
    }, [ isOpen, d2Source, layoutEngine ] );

    // refs para zoom
    const containerRef = useRef( null );
    const panZoomRef = useRef( null );

    // 5) Zoom y pan con ajuste al contenedor
    useLayoutEffect( () => {
        if( !svg || !containerRef.current ) return;
        const svgElem = containerRef.current.querySelector( 'svg' );
        if( !svgElem ) return;

        // Ajustar para ocupar todo el contenedor
        svgElem.setAttribute( 'width', '100%' );
        svgElem.setAttribute( 'height', '100%' );
        svgElem.style.width = '100%';
        svgElem.style.height = '100%';

        // Destruir instancia previa
        panZoomRef.current?.destroy();
        // Inicializar con fit/center manual
        panZoomRef.current = svgPanZoom( svgElem, {
            zoomEnabled: true,
            controlIconsEnabled: false,
            mouseWheelZoomEnabled: true,
            minZoom: 0.5,
            maxZoom: 10,
            fit: false,
            center: false,
        } );
        // Ajustar al tamaño del contenedor y centrar
        panZoomRef.current.resize();
        panZoomRef.current.fit();
        panZoomRef.current.center();

        return () => panZoomRef.current?.destroy();
    }, [ svg ] );

    // 6) Descargar SVG
    const onDownloadSVG = () => {
        const blob = new Blob( [ svg ], { type: 'image/svg+xml' } );
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = 'diagram.svg';
        a.click();
        URL.revokeObjectURL( url );
    };

    // 7) Convertir SVG a JPG y descargar
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
            <div
                className={ full ? 'modal fullscreen' : 'modal' }
                onClick={ e => e.stopPropagation() }
            >
                <header style={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }>
                    <div style={ { display: 'flex', alignItems: 'center' } }>
                        <div style={ { display: 'flex', alignItems: 'center', marginRight: '2rem', gap: '0.5rem' } }>
                            <label htmlFor="engine-select">Layout:</label>
                            <select
                                id="engine-select"
                                value={ layoutEngine }
                                onChange={ e => setLayoutEngine( e.target.value ) }
                                disabled={ loading }
                            >
                                <option value="dagre">Dagre</option>
                                <option value="elk">ELK</option>
                            </select>
                        </div>
                        <button onClick={ () => setFull( f => !f ) } disabled={ loading }>
                            { full ? 'Restore' : 'Maximize' }
                        </button>
                        <button onClick={ onDownloadSVG } disabled={ !svg || loading }>
                            SVG
                        </button>
                        <button onClick={ onDownloadJPG } disabled={ !svg || loading }>
                            JPG
                        </button>
                    </div>
                    <button className="close-btn" onClick={ onClose }>X</button>
                </header>
                <div className="content" style={ { width: '100%', height: '100%' } }>
                    { loading
                        ? <p>Loading diagram...</p>
                        : (
                            <div
                                ref={ containerRef }
                                style={ { width: '100%', height: '100%', overflow: 'hidden' } }
                                dangerouslySetInnerHTML={ { __html: svg } }
                            />
                        )
                    }
                </div>
            </div>
        </div>
    );
}
