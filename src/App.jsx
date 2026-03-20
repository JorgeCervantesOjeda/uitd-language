// src/App.js
import React, {
    startTransition,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { debounce } from 'lodash';
import { parseUITDL } from './index.js';
import './App.css';

const Editor = React.lazy( () => import( './components/Editor/Editor' ) );
const RendererD2 = React.lazy( () => import( './components/RendererD2' ) );

const PanelFallback = ( { label } ) => (
    <div
        className="panel-container"
        style={ {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            color: '#666',
            background: '#f5f5f5',
        } }
    >
        Loading { label }...
    </div>
);

const App = () => {
    const [ uitdlText, setUitdlText ] = useState( 'UITD "Empty" {}' );
    const [ parsedData, setParsedData ] = useState( () => parseUITDL( uitdlText ) );
    const [ theme, setTheme ] = useState( 'uitdlTheme-dark' );
    const [ showRenderer, setShowRenderer ] = useState( false );

    // ÚNICO debounce: parsea UITDL y actualiza parsedData
    const debouncedParse = useMemo(
        () =>
            debounce(
 ( text ) => {
                const parsed = parseUITDL( text );
                setParsedData( parsed );
                localStorage.setItem(
 'parsedData',
JSON.stringify( parsed ) 
);
                window.dispatchEvent( new CustomEvent( 'parsedDataUpdated' ) );
            },
1000 
), // 1 segundo
        []
    );

    useEffect(
 () => {
        debouncedParse( uitdlText );
        return () => debouncedParse.cancel();
    },
[ uitdlText, debouncedParse ] 
);

    useEffect(
 () => {
        const scheduleRenderer = () => {
            startTransition( () => setShowRenderer( true ) );
        };

        if( typeof window.requestIdleCallback === 'function' ) {
            const idleId = window.requestIdleCallback(
 scheduleRenderer,
{ timeout: 1200 } 
);
            return () => window.cancelIdleCallback( idleId );
        }

        const timeoutId = window.setTimeout(
 scheduleRenderer,
300 
);
        return () => window.clearTimeout( timeoutId );
    },
[] 
);

    const toggleTheme = () => {
        setTheme( ( prev ) =>
            prev === 'uitdlTheme-dark' ? 'uitdlTheme-light' : 'uitdlTheme-dark' );
    };

    const editorElement = React.createElement(
 Editor,
{
        uitdlText,
        onChange: setUitdlText,
        markers: parsedData.errors,
        theme,
    } 
);
    const rendererElement = React.createElement(
 RendererD2,
{
        data: parsedData,
        theme,
    } 
);

    return (
        <div className={ `app-container ${theme}` }>
            <button
                className="theme-toggle-button"
                onClick={ toggleTheme }
            >
                Toggle theme
            </button>

            <div className="space-screen editor-container panel-container">
                <React.Suspense fallback={ PanelFallback( { label: 'editor' } ) }>
                    { editorElement }
                </React.Suspense>
            </div>

            <div className="space-screen renderer-container panel-container">
                { showRenderer ? (
                    <React.Suspense fallback={ PanelFallback( { label: 'renderer' } ) }>
                        { rendererElement }
                    </React.Suspense>
                ) : (
                    <PanelFallback label="renderer" />
                ) }
            </div>
        </div>
    );
};

export default App;
