// src/components/RendererD2.jsx
// React panel that shows generated D2 code and opens diagram renderers.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../App.css';
import {
    clearUIColorMap,
    translateToD2,
    translateToD2Structure
} from '../utils/d2Translation.js';

const CodeViewer = React.lazy( () => import( './CodeViewer' ) );
const RenderModal = React.lazy( () => import( './RenderModal' ) );

const RendererD2 = ( { data, theme } ) => {
    const [ renderCode, setRenderCode ] = useState( () => translateToD2( data ) );
    const [ sceneData, setSceneData ] = useState( () => translateToD2Structure( data ) );
    const [ modalOpen, setModalOpen ] = useState( false );
    const [ modalLoaded, setModalLoaded ] = useState( false );
    const [ message, setMessage ] = useState( '' );
    const timer = useRef( null );

    useEffect(
 () => () => {
        if( timer.current ) clearTimeout( timer.current );
    },
[] 
);

    const displayMsg = useCallback(
 ( msg, duration = 3000 ) => {
        setMessage( msg );
        if( timer.current ) clearTimeout( timer.current );
        timer.current = setTimeout(
            () => setMessage( '' ),
            duration
        );
    },
[] 
);

    useEffect(
 () => {
        setRenderCode( translateToD2( data ) );
    },
[ data ] 
);

    useEffect(
 () => {
        setSceneData( translateToD2Structure( data ) );
    },
[ data ] 
);

    const handleRecolor = () => {
        clearUIColorMap();
        setRenderCode( translateToD2( data ) );
        setSceneData( translateToD2Structure( data ) );
        displayMsg( 'Colores regenerados.' );
        window.dispatchEvent( new CustomEvent( 'uiColorsUpdated' ) );
    };

    const handleCopy = () => {
        navigator.clipboard.writeText( renderCode )
            .then( () => displayMsg( 'Copied to clipboard!' ) )
            .catch( console.error );
    };

    const handleOpenModal = () => {
        setModalLoaded( true );
        setModalOpen( true );
    };

    const openInPlayground = () => window.open(
        'https://play.d2lang.com',
        '_blank'
    );

    const alertText = message || '\u00A0';
    const alertStyle = message
        ? {
            '--message-bg': 'var(--message-active-bg)',
            '--message-fg': 'var(--message-active-text)'
        }
        : {};
    const codeViewerElement = React.createElement(
        CodeViewer,
        {
            code: renderCode,
            onChange: value => setRenderCode( value ),
            theme,
        }
    );
    const renderModalElement = React.createElement(
        RenderModal,
        {
            d2Source: renderCode,
            data: sceneData,
            isOpen: modalOpen,
            onClose: () => setModalOpen( false ),
            onRecolor: handleRecolor,
        }
    );

    return (
        <div className="renderer-container panel-container">
            <div className="sticky-area">
                <div className="renderer-header">
                    <div className="renderer-title-label">
                        D2 Translation
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={ handleOpenModal } className="renderer-button">
                            View Diagram
                        </button>
                        <button onClick={ handleCopy } className="renderer-button">
                            Copy
                        </button>
                    </div>
                    <a
                        href="#"
                        onClick={ e => { e.preventDefault(); openInPlayground(); } }
                        className="mt-2 renderer-button block text-center">
                        D2 info
                    </a>
                </div>

                <div
                    className="alert-message"
                    style={ alertStyle }
                >
                    { alertText }
                </div>
            </div>

            <div className="scroll-area">
                <React.Suspense fallback={ <div style={ { padding: '1rem' } }>Loading code viewer...</div> }>
                    { codeViewerElement }
                </React.Suspense>
            </div>

            { modalLoaded && (
                <React.Suspense fallback={ <div style={ { padding: '1rem' } }>Loading diagram...</div> }>
                    { renderModalElement }
                </React.Suspense>
            ) }
        </div>
    );
};

export default RendererD2;
