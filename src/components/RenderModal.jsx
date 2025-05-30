import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { D2 } from '@terrastruct/d2';
import svgPanZoom from 'svg-pan-zoom';

export default function RenderModal( { d2Source, isOpen, onClose } ) {
    const [ svg, setSvg ] = useState( '' );
    const [ status, setStatus ] = useState( '' );
    const [ full, setFull ] = useState( false );

    // Configurable padding in pixels
    const PADDING = ( -100 ); // reducido para espacio mínimo
    // Border style
    const BORDER_DASH = '4';
    const BORDER_COLOR = 'black';
    const BORDER_WIDTH = 1;

    // Persist layout engine choice
    const [ layoutEngine, setLayoutEngine ] = useState(
        () => localStorage.getItem( 'layoutEngine' ) || 'dagre'
    );
    useEffect( () => {
        localStorage.setItem( 'layoutEngine', layoutEngine );
    }, [ layoutEngine ] );

    // Single D2 instance
    const d2 = useRef( null );
    useEffect( () => {
        d2.current = new D2();
    }, [] );

    // LRU cache
    const cache = useRef( new Map() );
    const MAX_ENTRIES = 2;
    const currentKey = useRef( '' );

    const panZoomRef = useRef( null );
    const handleEngineChange = ( engine ) => {
        panZoomRef.current?.destroy();
        panZoomRef.current = null;
        setLayoutEngine( engine );
    };

    useEffect( () => {
        if( !isOpen ) setStatus( '' );
    }, [ isOpen ] );

    useEffect( () => {
        if( !isOpen ) return;
        const key = `${layoutEngine}::${d2Source}`;
        currentKey.current = key;

        if( cache.current.has( key ) ) {
            setSvg( cache.current.get( key ) );
            setStatus( '' );
            return;
        }

        setSvg( '' );
        setStatus( 'Compiling ...' );
        ( async () => {
            try {
                const { diagram, renderOptions } = await d2.current.compile(
                    d2Source,
                    { layout: layoutEngine }
                );
                setStatus( 'Loading ...' );
                let svgText = await d2.current.render( diagram, renderOptions );

                // Ajustar viewBox para modificar el PADDING
                svgText = svgText.replace(
                    /viewBox="([^\"]+)"/, ( match, vb ) => {
                        const parts = vb.split( /[\s,]+/ ).map( Number );
                        const [ x, y, w, h ] = parts;
                        const nx = x - PADDING - BORDER_WIDTH;
                        const ny = y - PADDING - BORDER_WIDTH;
                        const nw = w + PADDING * 2 + BORDER_WIDTH * 2;
                        const nh = h + PADDING * 2 + BORDER_WIDTH * 2;
                        return `viewBox=\"${nx} ${ny} ${nw} ${nh}\"`;
                    }
                );

                // Insert dashed border rect inside SVG
                const vbMatch = svgText.match( /viewBox="([^\"]+)"/ );
                if( vbMatch ) {
                    const [ ex, ey, ew, eh ] = vbMatch[ 1 ].split( /[\s,]+/ ).map( Number );
                    console.log( 'Crop rect dimensions → x:', ex, 'y:', ey, 'width:', ew, 'height:', eh );

                    const rect = `<rect x=\"09\" y=\"09\" width=\"${ew + 3}\" height=\"${eh + 3}\" fill=\"none\" stroke=\"${BORDER_COLOR}\" stroke-width=\"${BORDER_WIDTH}\" stroke-dasharray=\"${BORDER_DASH}\" />`;
                    // Inserta el rectángulo justo antes de </svg>, para que pinte encima
                    svgText = svgText.replace(
                        /<\/svg>/,
                        `  ${rect}\n</svg>`
                    );
                }

                if( currentKey.current !== key ) return;
                cache.current.set( key, svgText );
                if( cache.current.size > MAX_ENTRIES ) {
                    const firstKey = cache.current.keys().next().value;
                    cache.current.delete( firstKey );
                }
                setSvg( svgText );
            } catch( e ) {
                console.error( 'Error rendering with D2:', e );
                setStatus( 'Error rendering with D2:' );
            } finally {
                if( currentKey.current === key ) setStatus( '' );
            }
        } )();
    }, [ isOpen, d2Source, layoutEngine ] );

    const containerRef = useRef( null );

    useLayoutEffect( () => {
        if( !svg || !isOpen || !containerRef.current ) return;
        const svgElem = containerRef.current.querySelector( 'svg' );
        if( !svgElem ) return;
        svgElem.removeAttribute( 'width' );
        svgElem.removeAttribute( 'height' );
        svgElem.style.width = '100%';
        svgElem.style.height = '100%';

        try {
            panZoomRef.current = svgPanZoom( svgElem, {
                zoomEnabled: true,
                controlIconsEnabled: false,
                mouseWheelZoomEnabled: true,
                minZoom: 0.5,
                maxZoom: 10,
                fit: true,
                center: true,
            } );
        } catch { }

        requestAnimationFrame( () => {
            panZoomRef.current.resize();
            panZoomRef.current.fit();
            panZoomRef.current.center();
        } );

        return () => {
            panZoomRef.current?.destroy();
            panZoomRef.current = null;
        };
    }, [ svg, isOpen ] );

    const onDownloadSVG = () => {
        const blob = new Blob( [ svg ], { type: 'image/svg+xml' } );
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = 'diagram.svg';
        a.click();
        URL.revokeObjectURL( url );
    };

    // Genera JPG usando el viewBox completo (incluyendo padding y borde)
    const onDownloadJPG = () => {
        if( !svg ) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString( svg, 'image/svg+xml' );
        const svgElem = doc.documentElement;
        const [ , , w, h ] = svgElem.getAttribute( 'viewBox' ).split( /[\s,]+/ ).map( Number );
        const canvas = document.createElement( 'canvas' );
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext( '2d' );
        ctx.fillStyle = '#fff';
        ctx.fillRect( 0, 0, w, h );
        const img = new Image();
        const svgBlob = new Blob( [ svg ], { type: 'image/svg+xml;charset=utf-8' } );
        const url = URL.createObjectURL( svgBlob );
        img.onload = () => {
            ctx.drawImage( img, 0, 0, w, h );
            URL.revokeObjectURL( url );
            canvas.toBlob( ( blob ) => {
                if( !blob ) return;
                const link = document.createElement( 'a' );
                link.href = URL.createObjectURL( blob );
                link.download = 'diagram.jpg';
                link.click();
                URL.revokeObjectURL( link.href );
            }, 'image/jpeg', 0.92 );
        };
        img.onerror = () => URL.revokeObjectURL( url );
        img.src = url;
    };

    if( !isOpen ) return null;

    return (
        <div className="modal-backdrop" onClick={ onClose }>
            <div
                className={ full ? 'modal fullscreen' : 'modal' }
                style={ { display: 'flex', flexDirection: 'column', height: '100%' } }
                onClick={ ( e ) => e.stopPropagation() }
            >
                <header
                    style={ {
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    } }
                >
                    <div style={ { display: 'flex', alignItems: 'center', gap: '0.5rem' } }>
                        <label htmlFor="engine-select">Layout:</label>
                        <select
                            id="engine-select"
                            value={ layoutEngine }
                            onChange={ ( e ) => handleEngineChange( e.target.value ) }
                            disabled={ status !== '' }
                        >
                            <option value="dagre">Dagre</option>
                            <option value="elk">ELK</option>
                        </select>
                        <button onClick={ () => setFull( ( f ) => !f ) } disabled={ status !== '' }>
                            { full ? 'Restore' : 'Maximize' }
                        </button>
                        <button onClick={ onDownloadSVG } disabled={ !svg || status !== '' }>
                            SVG
                        </button>
                        <button onClick={ onDownloadJPG } disabled={ !svg || status !== '' }>
                            JPG
                        </button>
                    </div>
                    <button className="close-btn" onClick={ onClose }>
                        Close
                    </button>
                </header>
                <div
                    className="content"
                    style={ { flex: 1, overflow: 'hidden', position: 'relative' } }
                >
                    { status ? (
                        <p>{ status }</p>
                    ) : (
                        <div
                            key={ currentKey.current }
                            ref={ containerRef }
                            style={ { width: '100%', height: '100%' } }
                            dangerouslySetInnerHTML={ { __html: svg } }
                        />
                    ) }
                </div>
            </div>
        </div>
    );
}
