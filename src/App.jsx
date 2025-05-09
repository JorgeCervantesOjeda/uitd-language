// En App.js
import React, { useState, useEffect } from 'react';
import Editor from './components/Editor/Editor';
import RendererD2 from './components/RendererD2';
import { parseUITDL } from './utils/TokenParser';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( 'UITD "X" {}' );
  const [ parsedData, setParsedData ] = useState( parseUITDL( uitdlText ) );

  // Ya no necesitamos debounce aquí
  useEffect( () => {
    setParsedData( parseUITDL( uitdlText ) );
  }, [ uitdlText ] );

  return (
    <div className='app-container'>
      <div className='space-screen editor-container'>
        <Editor
          uitdlText={ uitdlText }
          onChange={ setUitdlText }
          markers={ parsedData.errors }
        />
      </div>
      <div className='space-screen renderer-container'>
        <RendererD2 data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
