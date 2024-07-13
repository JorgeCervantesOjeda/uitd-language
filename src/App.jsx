import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import RendererD2 from './components/RendererD2';
import { initialText } from './utils/initialText';
import { parseUITDL } from './utils/TokenParser';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( initialText );
  const initialParsedData = parseUITDL( initialText );
  const [ parsedData, setParsedData ] = useState( initialParsedData );
  const editorRef = useRef( null );

  useEffect( () => {
    // Handle text changes in the editor by parsing the text
    const parsed = parseUITDL( uitdlText );
    setParsedData( parsed );
  }, [ uitdlText ] );

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
  };

  return (
    <div style={ { display: 'flex', width: '100vw', height: '100vh' } }>
      <div className='space-screen'>
        <Editor
          uitdlText={ uitdlText }
          onChange={ handleEditorChange }
          markers={ parsedData.errors }
        />
      </div>
      <div className='space-screen'>
        <RendererD2 data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
