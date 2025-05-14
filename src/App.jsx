// src/App.js
import React, { useState, useEffect } from 'react';
import Editor from './components/Editor/Editor';
import RendererD2 from './components/RendererD2';
import { parseUITDL } from './utils/TokenParser';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( 'UITD "X" {}' );
  const [ parsedData, setParsedData ] = useState( parseUITDL( uitdlText ) );

  useEffect( () => {
    setParsedData( parseUITDL( uitdlText ) );
  }, [ uitdlText ] );

  return (
    <div className="app-container">
      {/* added panel-container */ }
      <div className="space-screen editor-container panel-container">
        <Editor
          uitdlText={ uitdlText }
          onChange={ setUitdlText }
          markers={ parsedData.errors }
        />
      </div>
      {/* added panel-container */ }
      <div className="space-screen renderer-container panel-container">
        <RendererD2 data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
