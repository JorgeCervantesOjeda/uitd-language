// src/RenderModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { D2 } from '@terrastruct/d2';
import { VisualRenderer } from './VisualRenderer';
import useUniversalPanZoom from './../utils/useUniversalPanZoom';
import C2S from 'canvas2svg';
import { drawDiagram } from '../utils/drawDiagram';

export default function RenderModal( { data, d2Source, isOpen, onClose } ) {
    const [ svg, setSvg ] = useState( '' );
    const [ status, setStatus ] = useState( '' );
    const [ full, setFull ] = useState( false );

    const [ viewMode, setViewMode ] = useState(
        () => localStorage.getItem( 'viewMode' ) || 'dagre'
    );
    const isForces = viewMode === 'forces';

    const [ animCounter, setAnimCounter ] = useState( 0 );
    const [ continueTrigger, setContinueTrigger ] = useState( 0 );

    // Persist layout engine choice
    useEffect( () => {
        localStorage.setItem( 'viewMode', viewMode );
    }, [ viewMode ] );

    // Initialize D2
    const d2 = useRef( null );
    useEffect( () => { d2.current = new D2(); }, [] );

    // LRU cache for rendered SVGs
    const cache = useRef( new Map() );
    const MAX_ENTRIES = 2;
    const currentKey = useRef( '' );

    // Reset status when closing
    useEffect( () => { if( !isOpen ) setStatus( '' ); }, [ isOpen ] );

    // Compile and render D2 when open and not in custom view
    useEffect( () => {
        if( !isOpen || isForces ) return;

        const layoutEngine = viewMode;
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

                // Adjust viewBox for padding
                svgText = svgText.replace(
                    /viewBox="([^"]+)"/, ( m, vb ) => {
                        const [ x, y, w, h ] = vb.split( /[,\s]+/ ).map( Number );
                        const PADDING = -100, BORDER = 1;
                        return `viewBox="${x - PADDING - BORDER} ${y - PADDING - BORDER} ${w + PADDING * 2 + BORDER * 2} ${h + PADDING * 2 + BORDER * 2}"`;
                    }
                );

                if( currentKey.current !== key ) return;
                cache.current.set( key, svgText );
                if( cache.current.size > MAX_ENTRIES ) {
                    const first = cache.current.keys().next().value;
                    cache.current.delete( first );
                }
                setSvg( svgText );
            } catch( e ) {
                console.error( 'Error rendering with D2:', e );
                setStatus( 'Error rendering with D2:' );
            } finally {
                if( currentKey.current === key ) setStatus( '' );
            }
        } )();
    }, [ isOpen, d2Source, viewMode ] );

    const svgContainerRef = useRef( null );
    const forcesCanvasRef = useRef( null );
    const fragmentCanvasRef = useRef( null );

    const activeRef = isForces
        ? forcesCanvasRef
        : svgContainerRef;

    // dentro de RenderModal, tras obtener `svg` y `isForces`
    const trigger = isForces ? animCounter : svg;
    const transform = useUniversalPanZoom( activeRef, trigger );

    // NUEVO: captura inicial/reinicio del SVG en modo "forces"
    useEffect( () => {
        if( !isOpen || !isForces ) return;
        // Espera a que el canvas y params existan (después del primer render)
        const id = requestAnimationFrame( () => {
            captureForcesSVG();
        } );
        return () => cancelAnimationFrame( id );
        // Disparamos en open, cambio a forces, y restart animation
    }, [ isOpen, isForces, animCounter ] );

    // Download handlers
    const downloadBlob = ( blob, filename ) => {
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL( url );
    };

    // Bounding box dinámico de la escena (nodos + labels) en coords de escena
    // Bounding box completo de la escena (nodos + labels)
    const computeSceneBounds = ( params ) => {
        if( !params ) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for( const n of Object.values( params.nodesMap || {} ) ) {
            if( !n || !n._size ) continue;
            const x1 = n._x, y1 = n._y;
            const x2 = n._x + n._size.width, y2 = n._y + n._size.height;
            if( x1 < minX ) minX = x1; if( y1 < minY ) minY = y1;
            if( x2 > maxX ) maxX = x2; if( y2 > maxY ) maxY = y2;
        }
        for( const l of Object.values( params.labelMap || {} ) ) {
            if( !l ) continue;
            const x1 = l.x, y1 = l.y;
            const x2 = l.x + l.width, y2 = l.y + l.height;
            if( x1 < minX ) minX = x1; if( y1 < minY ) minY = y1;
            if( x2 > maxX ) maxX = x2; if( y2 > maxY ) maxY = y2;
        }
        if( !isFinite( minX ) || !isFinite( minY ) || !isFinite( maxX ) || !isFinite( maxY ) ) return null;
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    };


    // NUEVO: función para capturar el SVG de "forces" que refleje lo que se ve
    const captureForcesSVG = () => {
        if( !isForces ) return;
        const container = forcesCanvasRef.current;
        const imp = fragmentCanvasRef.current;
        if( !container || !imp ) return;

        const { params } = imp;
        const bounds = computeSceneBounds( params );
        if( !bounds ) return;
        const { minX, minY, width: sceneW, height: sceneH } = bounds;
        if( sceneW <= 0 || sceneH <= 0 ) return;
        // Canvas2SVG con el tamaño de TODA la escena; neutralizamos pan/zoom
        const c2s = new C2S( sceneW, sceneH );
        const exportTransform = { x: -minX, y: -minY, scale: 1 };
        drawDiagram( c2s, { ...params, transform: exportTransform } );
        const svgContent = c2s.getSerializedSvg( true ); // fix typo c2S -> c2s

        setSvg( svgContent );
        return svgContent;
    };

    const onDownloadSVG = () => {
        // Unificado: descargamos siempre desde el estado `svg`
        if( isForces && !svg ) {
            // Si aún no fue capturado, lo generamos on-demand
            const s = captureForcesSVG();
            if( s ) return downloadBlob( new Blob( [ s ], { type: 'image/svg+xml' } ), 'diagram.svg' );
        }
        if( svg ) {
            return downloadBlob( new Blob( [ svg ], { type: 'image/svg+xml' } ), 'diagram.svg' );
        }
    };

    const onDownloadJPG = () => {
        if( isForces ) {
            // Forces: renderizar TODA la escena; tamaño escala con zoom actual
            const imp = fragmentCanvasRef.current;
            if( !imp ) return;
            const bounds = computeSceneBounds( imp.params );
            if( !bounds ) return;
            const scale = Math.max( 0.01, transform?.scale || 1 );
            const targetW = Math.max( 1, Math.round( bounds.width * scale ) );
            const targetH = Math.max( 1, Math.round( bounds.height * scale ) );
            const s = svg || captureForcesSVG();
            if( !s ) return;
            const img = new Image();
            img.onload = () => {
                const cnv = document.createElement( 'canvas' );
                cnv.width = targetW;
                cnv.height = targetH;
                const ctx = cnv.getContext( '2d' );
                ctx.fillStyle = '#fff';
                ctx.fillRect( 0, 0, cnv.width, cnv.height );
                ctx.drawImage( img, 0, 0, cnv.width, cnv.height );
                cnv.toBlob( blob => downloadBlob( blob, 'diagram.jpg' ), 'image/jpeg', 0.92 );
                URL.revokeObjectURL( img.src );
            };
            img.src = URL.createObjectURL( new Blob( [ s ], { type: 'image/svg+xml' } ) );
            return;
        }

        // ELK/Dagre: rasterizar TODO el SVG y escalar tamaño según el zoom actual del viewer (svg-pan-zoom)
        if( !svg ) return;
        const m = svg.match( /viewBox="([^"]+)"/ );
        let viewW = 0, viewH = 0;
        if( m && m[ 1 ] ) {
            const parts = m[ 1 ].split( /[,\s]+/ ).map( Number );
            // viewBox = x y w h
            viewW = Math.max( 0, parts[ 2 ] || 0 );
            viewH = Math.max( 0, parts[ 3 ] || 0 );
        }
        const scale = Math.max( 0.01, transform?.scale || 1 ); // ahora transform.scale refleja svg-pan-zoom
        const targetW = Math.max( 1, Math.round( ( viewW || 1000 ) * scale ) );
        const targetH = Math.max( 1, Math.round( ( viewH || 1000 ) * scale ) );

        const img = new Image();
        img.onload = () => {
            const cnv = document.createElement( 'canvas' );
            cnv.width = targetW;
            cnv.height = targetH;
            const ctx = cnv.getContext( '2d' );
            ctx.fillStyle = '#fff';
            ctx.fillRect( 0, 0, cnv.width, cnv.height );
            // Escalamos el SVG completo al tamaño destino (zoom actual)
            ctx.drawImage( img, 0, 0, cnv.width, cnv.height );
            cnv.toBlob( blob => downloadBlob( blob, 'diagram.jpg' ), 'image/jpeg', 0.92 );
            URL.revokeObjectURL( img.src );
        };
        img.src = URL.createObjectURL( new Blob( [ svg ], { type: 'image/svg+xml' } ) );
    };
    if( !isOpen ) return null;

    return (
        <div className="modal-backdrop" onClick={ onClose }>
            <div
                className={ full ? 'modal fullscreen' : 'modal' }
                style={ { display: 'flex', flexDirection: 'column', height: '100%' } }
                onClick={ e => e.stopPropagation() }
            >
                <header style={ { flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
                    <div style={ { display: 'flex', alignItems: 'center', gap: '0.5rem' } }>
                        <label htmlFor="viewmode-select">View Mode:</label>
                        <select
                            id="viewmode-select"
                            value={ viewMode }
                            onChange={ e => setViewMode( e.target.value ) }
                            disabled={ status !== '' }
                        >
                            <option value="dagre">Dagre</option>
                            <option value="elk">ELK</option>
                            <option value="forces">Forces</option>
                        </select>
                        <button onClick={ () => setFull( f => !f ) } disabled={ status !== '' }>
                            { full ? 'Restore' : 'Maximize' }
                        </button>
                        <button onClick={ onDownloadSVG }
                            disabled={ status !== '' || !isOpen }>
                            SVG
                        </button>
                        <button onClick={ onDownloadJPG }
                            disabled={ status !== '' || !isOpen }>
                            JPG
                        </button>
                        <button
                            onClick={ () => setContinueTrigger( c => c + 1 ) }
                            disabled={ !isForces || status !== '' }>
                            Continue Animation
                        </button>
                        <button onClick={ () => setAnimCounter( c => c + 1 ) }
                            disabled={ !isForces || status !== '' }>
                            Restart Animation
                        </button>
                    </div>
                    <button className="close-btn" onClick={ onClose }>Close</button>
                </header>
                <div className="content" style={ { flex: 1, overflow: 'hidden', position: 'relative' } }>
                    { status ? (
                        <p>{ status }</p>
                    ) : isForces
                        ? (
                            <div ref={ forcesCanvasRef } style={ { width: '100%', height: '100%' } }>
                                <VisualRenderer
                                    ref={ fragmentCanvasRef }
                                    animTrigger={ animCounter }
                                    continueTrigger={ continueTrigger }
                                    dataStructure={ data }
                                    transform={ transform }
                                    onForcesSimFinish={ () => { if( isForces ) captureForcesSVG(); } }
                                    onForcesDragEnd={ () => { if( isForces ) captureForcesSVG(); } }
                                />
                            </div>
                        )
                        : (
                            <div style={ { width: '100%', height: '100%', position: 'relative' } }>
                                <div
                                    key={ currentKey.current }
                                    ref={ svgContainerRef }
                                    style={ { width: '100%', height: '100%' } }
                                    dangerouslySetInnerHTML={ { __html: svg } }
                                />
                            </div>
                        ) }
                </div>
            </div>
        </div>
    );
}
