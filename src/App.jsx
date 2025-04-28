import React, { useState, useEffect } from 'react';
import Editor from './components/Editor/Editor';
import RendererD2 from './components/RendererD2';
import { ExampleUITD } from './components/Editor/utils/ExampleUITD';
import { parseUITDL } from './utils/TokenParser';
import './App.css';

const DEBOUNCE_DELAY = 500; // Milisegundos

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( ExampleUITD );
  const initialParsedData = parseUITDL( uitdlText );
  const [ parsedData, setParsedData ] = useState( initialParsedData );

  useEffect( () => {
    const handler = setTimeout( () => {
      const parsed = parseUITDL( uitdlText );
      setParsedData( parsed );
    }, DEBOUNCE_DELAY );

    return () => {
      clearTimeout( handler );
    };
  }, [ uitdlText ] );

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
  };

  return (
    <div className='app-container'>
      <div className='space-screen editor-container'>
        <Editor
          uitdlText={ uitdlText }
          onChange={ handleEditorChange }
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
