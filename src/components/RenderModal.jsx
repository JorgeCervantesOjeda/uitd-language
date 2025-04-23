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
        setSvg( '' );
        setLoading( true );

        // Compilamos y renderizamos en línea
        ( async () => {
            try {
                const { diagram, renderOptions } =
                    await d2.current.compile( d2Source, { layout: 'elk' } );
                const svgText = await d2.current.render( diagram, renderOptions );
                setSvg( svgText );
            } catch( e ) {
                console.error( 'Error al renderizar con D2:', e );
            } finally {
                setLoading( false );
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
        // … tu lógica de conversión SVG→JPG tal cual la tienes …
    };

    if( !isOpen ) return null;
    return (
        <div className="modal-backdrop" onClick={ onClose }>
            <div
                className={ `modal${full ? ' fullscreen' : ''}` }
                onClick={ e => e.stopPropagation() }
            >
                <header>
                    {/* Maximizar / Restaurar */ }
                    <button onClick={ () => setFull( f => !f ) } disabled={ loading }>
                        { full ? 'Restore' : 'Maximize' }
                    </button>
                    {/* Descargar SVG */ }
                    <button onClick={ onDownloadSVG } disabled={ !svg }>
                        SVG
                    </button>
                    {/* Descargar JPG */ }
                    <button onClick={ onDownloadJPG } disabled={ !svg }>
                        JPG
                    </button>
                    {/* Cerrar en esquina */ }
                    <button className="close-btn" onClick={ onClose }>
                        X
                    </button>
                </header>

                <div className="content">
                    { loading
                        ? <p>Loading diagram...</p>
                        : <div dangerouslySetInnerHTML={ { __html: svg } } />
                    }
                </div>
            </div>
        </div>
    );
}
