// src/RenderModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { D2 } from '@terrastruct/d2';
import { VisualRenderer } from './VisualRenderer';
import useUniversalPanZoom from './../utils/useUniversalPanZoom';
import C2S from 'canvas2svg';
import { drawDiagram } from '../utils/drawDiagram';

export default function RenderModal( { data, d2Source, isOpen, onClose, onRecolor } ) {
    const [ svg, setSvg ] = useState( '' );
    const [ status, setStatus ] = useState( '' );
    const [ full, setFull ] = useState( false );

    const [ viewMode, setViewMode ] = useState(
        () => localStorage.getItem( 'viewMode' ) || 'dagre'
    );
    const isForces = viewMode === 'forces';

    const [ restartTrigger, setRestartTrigger ] = useState( 0 );
    const [ continueTrigger, setContinueTrigger ] = useState( 0 );
    // Persistencia simple de posiciones (una sola clave fija)
    const LOCAL_KEY = 'forcesLayout';
    // Forzar rehidratación normal al cambiar la versión
    const [ layoutVersion, setLayoutVersion ] = useState( 0 );
    const [ initialTransform, setInitialTransform ] = useState( null ); // pan/zoom inicial (fit)


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
        console.log( '[RM FIT] about to fit; isForces=', isForces );

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

    const activeRef = isForces ? forcesCanvasRef : svgContainerRef;

    // dentro de RenderModal, tras obtener `svg` y `isForces`
    const trigger = isForces ? isOpen : svg;
    const transform = useUniversalPanZoom( activeRef, trigger, { initialTransform } );

    // NUEVO: captura inicial del SVG en modo "forces"
    useEffect( () => {
        if( !isOpen || !isForces ) return;
        // Espera a que el canvas y params existan (después del primer render)
        const id = requestAnimationFrame( () => {
            captureForcesSVG();
        } );
        return () => cancelAnimationFrame( id );
        // Disparamos en open, cambio a forces, y restart animation
    }, [ isOpen, isForces ] );

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

    // NUEVO: snapshot de posiciones actuales (nodos + etiquetas)
    const snapshotForcesPositions = () => {
        try {
            const imp = fragmentCanvasRef.current;
            const params = imp?.params;
            if( !params ) return null;
            const nodes = {};
            const labels = {};
            for( const [ id, n ] of Object.entries( params.nodesMap || {} ) ) {
                if( !n ) continue;
                nodes[ id ] = { x: n._x, y: n._y };
            }
            for( const [ id, l ] of Object.entries( params.labelMap || {} ) ) {
                if( !l ) continue;
                labels[ id ] = { x: l.x, y: l.y };
            }
            return { nodes, labels, ts: Date.now() };
        } catch {
            return null;
        }
    };

    // NUEVO: guardar snapshot en localStorage (eventos discretos)
    const saveForcesSnapshot = () => {
        const snap = snapshotForcesPositions();
        if( !snap ) return;
        try {
            localStorage.setItem( LOCAL_KEY, JSON.stringify( snap ) );
        } catch { }
    };

    // NUEVO: fit al entrar a Forces (pan/zoom inicial con padding)
    useEffect( () => {
        if( !isOpen || !isForces ) return;
        const id = requestAnimationFrame( () => {
            const imp = fragmentCanvasRef.current;
            const container = forcesCanvasRef.current;
            if( !imp || !container ) return;
            const bounds = computeSceneBounds( imp.params );
            if( !bounds ) return;
            const rect = container.getBoundingClientRect();

            console.log( '[RM FIT] raf tick' );
            console.log( '[RM FIT] fragmentCanvasRef.current?=', !!fragmentCanvasRef.current, 'bounds=', bounds );

            const PADDING = 40;
            const availW = Math.max( 1, rect.width );
            const availH = Math.max( 1, rect.height );
            const bw = Math.max( 1, bounds.width );
            const bh = Math.max( 1, bounds.height );
            const scaleX = ( availW - 2 * PADDING ) / bw;
            const scaleY = ( availH - 2 * PADDING ) / bh;
            const scale = Math.max( 0.05, Math.min( 10, Math.min( scaleX, scaleY ) ) );
            const x = PADDING - bounds.minX * scale;
            const y = PADDING - bounds.minY * scale;
            console.log( '[RM FIT] initialTransform=', { x, y, scale } );
            setInitialTransform( { x, y, scale } );
        } );
        return () => cancelAnimationFrame( id );
    }, [ isOpen, isForces ] );


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


    // === SAVE: exporta lo que esté en localStorage[LOCAL_KEY] ===
    const onExportLayout = () => {
        try {
            const raw = localStorage.getItem( LOCAL_KEY );
            if( !raw ) { alert( 'No hay layout guardado.' ); return; }
            const blob = new Blob( [ raw ], { type: 'application/json' } );
            const a = document.createElement( 'a' );
            a.href = URL.createObjectURL( blob );
            a.download = 'forcesLayout.json';
            a.click();
            URL.revokeObjectURL( a.href );
        } catch( e ) {
            console.error( e ); alert( 'No se pudo exportar el layout.' );
        }
    };

    // === LOAD: lee archivo -> guarda en localStorage -> incrementa layoutVersion ===
    const fileInputRef = useRef( null );
    const onImportLayoutClick = () => fileInputRef.current?.click();
    const onFileChosen = async ( ev ) => {
        const file = ev.target.files?.[ 0 ];
        ev.target.value = '';
        if( !file ) return;
        const text = await file.text();
        localStorage.setItem( LOCAL_KEY, text );
        setLayoutVersion( v => v + 1 );
    };

    // NUEVO: guardar al cerrar (si estamos en Forces)
    const handleClose = () => {
        if( isForces ) {
            const snap = snapshotForcesPositions();
            console.log( '[RM CLOSE] isForces=', true, 'snapNodes=', Object.keys( snap?.nodes || {} ).length, 'snapLabels=', Object.keys( snap?.labels || {} ).length );
            try { saveForcesSnapshot(); } catch { }
            try {
                const raw = localStorage.getItem( LOCAL_KEY );
                console.log( '[RM CLOSE] savedToLocal=', !!raw, 'length=', raw ? raw.length : 0 );
            } catch { }
        } else {
            console.log( '[RM CLOSE] isForces=', false );
        }
        onClose();
    };

    // Guardar snapshot si se cambia de modo de vista saliendo de "forces"
    useEffect( () => {
        // cuando el modo anterior era forces y ahora no, persistimos
        let prev = isForces;
        return () => {
            console.log( '[RM CLEANUP] prevWasForces=', prev );
            if( prev ) {
                console.log( '[RM CLEANUP] fragmentCanvasRef.current?=', !!fragmentCanvasRef.current );
                const snap = snapshotForcesPositions();
                console.log( '[RM CLEANUP] snapNodes=', Object.keys( snap?.nodes || {} ).length, 'snapLabels=', Object.keys( snap?.labels || {} ).length );
                try { saveForcesSnapshot(); } catch { }
                try {
                    const raw = localStorage.getItem( LOCAL_KEY );
                    console.log( '[RM CLEANUP] savedToLocal=', !!raw, 'length=', raw ? raw.length : 0 );
                } catch { }
            }
        };
    }, [ isForces ] );


    if( !isOpen ) return null;

    return (
        <div className="modal-backdrop">
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
                        <button
                            onClick={ onExportLayout }
                            disabled={ !isForces || status !== '' }>
                            Save Layout
                        </button>
                        <button
                            onClick={ onImportLayoutClick }
                            disabled={ !isForces || status !== '' }>
                            Load Layout
                        </button>
                        <input ref={ fileInputRef } type="file" accept="application/json"
                            style={ { display: 'none' } } onChange={ onFileChosen } />

                    </div>

                    <button
                        className='restart-btn'
                        onClick={ () => { onRecolor && onRecolor(); } }
                        disabled={ status !== '' }>
                        Change Colors
                    </button>
                    <button
                        onClick={ () => {
                            try { localStorage.removeItem( 'forcesLayout' ); } catch { }
                            setRestartTrigger( c => c + 1 );
                        } }
                        className='restart-btn'
                        disabled={ !isForces || status !== '' }>
                        Restart Simulation
                    </button>
                    <button className="close-btn" onClick={ handleClose }>Close</button>
                </header>
                <div className="content" style={ { flex: 1, overflow: 'hidden', position: 'relative' } }>
                    { status ? (
                        <p>{ status }</p>
                    ) : isForces
                        ? (
                            <div ref={ forcesCanvasRef } style={ { width: '100%', height: '100%' } }>
                                <VisualRenderer
                                    key={ layoutVersion }  // forzar remount si cambia la versión
                                    ref={ fragmentCanvasRef }
                                    animTrigger={ restartTrigger }
                                    continueTrigger={ continueTrigger }
                                    dataStructure={ data }
                                    transform={ transform }
                                    onForcesSimFinish={ () => { if( isForces ) { saveForcesSnapshot(); captureForcesSVG(); } } }
                                    onForcesDragEnd={ () => { if( isForces ) { saveForcesSnapshot(); captureForcesSVG(); } } }
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
