// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import Editor from './components/Editor/Editor';
import RendererD2 from './components/RendererD2';
import { parseUITDL } from './utils/TokenParser';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( 'UITD "X" {}' );
  const [ parsedData, setParsedData ] = useState( () => parseUITDL( uitdlText ) );

  // 1) Creamos una función debounced para el parseo
  const debouncedParse = useMemo(
    () =>
      debounce( ( text ) => {
        setParsedData( parseUITDL( text ) );
      }, 300 ),
    []
  );

  // 2) Cada vez que cambie 'uitdlText', llamamos al debounce
  useEffect( () => {
    debouncedParse( uitdlText );
    // Cancelamos cualquier llamada pendiente al desmontar o antes del próximo cambio
    return () => debouncedParse.cancel();
  }, [ uitdlText, debouncedParse ] );

  return (
    <div className="app-container">
      <div className="space-screen editor-container panel-container">
        <Editor
          uitdlText={ uitdlText }
          onChange={ setUitdlText }
          markers={ parsedData.errors }
        />
      </div>
      <div className="space-screen renderer-container panel-container">
        <RendererD2 data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
