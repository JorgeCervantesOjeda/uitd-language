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
  const [ theme, setTheme ] = useState( 'uitdlTheme-dark' ); // Puedes cambiar el tema según tus preferencias

  // 1) Creamos una función debounced para el parseo
  const debouncedParse = useMemo(
    () =>
      debounce( ( text ) => {
        //! SS
        const parsedLocalStorage = parseUITDL( text ) ;
        setParsedData( parsedLocalStorage);
        localStorage.setItem('parsedData', JSON.stringify(parsedLocalStorage));
      }, 300 ),
    []
  );

  // 2) Cada vez que cambie 'uitdlText', llamamos al debounce
  useEffect( () => {
    debouncedParse( uitdlText );
    // Cancelamos cualquier llamada pendiente al desmontar o antes del próximo cambio
    return () => debouncedParse.cancel();
  }, [ uitdlText, debouncedParse ] );

  // Botón para alternar el tema
  const toggleTheme = () => {
    setTheme( ( prev ) =>
      prev === 'uitdlTheme-dark' ? 'uitdlTheme-light' : 'uitdlTheme-dark'
    );
  };

  return (
    <div className="app-container">
      <button onClick={ toggleTheme } style={ { position: 'absolute', top: 10, left: 10, zIndex: 10 } }>
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
