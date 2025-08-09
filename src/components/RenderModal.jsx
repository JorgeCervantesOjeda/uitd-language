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

    // Download handlers
    const downloadBlob = ( blob, filename ) => {
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL( url );
    };

    const onDownloadSVG = () => {
        if( !isForces ) {
            return downloadBlob( new Blob( [ svg ], { type: 'image/svg+xml' } ), 'diagram.svg' );
        }
        // Si es forces, usamos canvas2svg para exportar
        const imp= fragmentCanvasRef.current;
        if( !imp ) return;
        const { canvas: realCanvas, params } = imp;
        if( !realCanvas ) {
            console.warn( 'No canvas found for forces rendering' );
            return;
        }
        const { width: w, height: h } = realCanvas;
        const c2s = new C2S( w, h );
        drawDiagram( c2s, params );

        const svgContent = c2s.getSerializedSvg( true );
        downloadBlob( new Blob( [ svgContent ], { type: 'image/svg+xml' } ), 'diagram.svg' );
    };

    const onDownloadJPG = () => {
        if( isForces ) {
            const container = forcesCanvasRef.current;
            const canvas = container?.querySelector( 'canvas' );
            canvas.toBlob( blob => downloadBlob( blob, 'diagram.jpg' ), 'image/jpeg', 0.92 );
        } else {
            const img = new Image();
            img.onload = () => {
                const cnv = document.createElement( 'canvas' );
                cnv.width = img.width;
                cnv.height = img.height;
                const ctx = cnv.getContext( '2d' );
                ctx.fillStyle = '#fff';
                ctx.fillRect( 0, 0, cnv.width, cnv.height );
                ctx.drawImage( img, 0, 0 );
                cnv.toBlob( blob => downloadBlob( blob, 'diagram.jpg' ), 'image/jpeg', 0.92 );
                URL.revokeObjectURL( img.src );
            };
            img.src = URL.createObjectURL( new Blob( [ svg ], { type: 'image/svg+xml' } ) );
        }
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
                            <div ref={ forcesCanvasRef} style={ { width: '100%', height: '100%' } }>
                                <VisualRenderer
                                    ref={ fragmentCanvasRef }
                                    animTrigger={ animCounter }
                                    continueTrigger={ continueTrigger }
                                    dataStructure={ data }
                                    transform={ transform }
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
