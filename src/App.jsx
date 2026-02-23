// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import Editor from './components/Editor/Editor';
import RendererD2 from './components/RendererD2';
import { parseUITDL } from './utils/TokenParser';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( 'UITD "Empty" {}' );
  const [ parsedData, setParsedData ] = useState( () => parseUITDL( uitdlText ) );
  const [ theme, setTheme ] = useState( 'uitdlTheme-dark' );

  // ÚNICO debounce: parsea UITDL y actualiza parsedData
  const debouncedParse = useMemo(
    () =>
      debounce( ( text ) => {
        const parsed = parseUITDL( text );
        setParsedData( parsed );
        localStorage.setItem( 'parsedData', JSON.stringify( parsed ) );
        window.dispatchEvent( new CustomEvent( 'parsedDataUpdated' ) );
      }, 1000 ), // 1 segundo
    []
  );

  useEffect( () => {
    debouncedParse( uitdlText );
    return () => debouncedParse.cancel();
  }, [ uitdlText, debouncedParse ] );

  const toggleTheme = () => {
    setTheme( ( prev ) =>
      prev === 'uitdlTheme-dark' ? 'uitdlTheme-light' : 'uitdlTheme-dark'
    );
  };

  return (
    <div className="app-container">
      <button
        onClick={ toggleTheme }
        style={ { position: 'absolute', top: 10, left: 10, zIndex: 10 } }
      >
        Toggle theme
      </button>

      <div className="space-screen editor-container panel-container">
        <Editor
          uitdlText={ uitdlText }
          onChange={ setUitdlText }
          markers={ parsedData.errors }
        />
      </div>

      <div className="space-screen renderer-container panel-container">
        <RendererD2 data={ parsedData } theme={ theme } />
      </div>
    </div>
  );
};

export default App;
