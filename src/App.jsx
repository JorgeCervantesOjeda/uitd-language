import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Renderer from './components/Renderer';
import { parseUITDL } from './utils/Parser';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( '' );
  const [ parsedData, setParsedData ] = useState( {} );

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
    const parsed = parseUITDL( text );
    setParsedData( parsed );
  };

  return (
    <div style={ { display: 'flex', height: '100vh' } }>
      <Editor value={ uitdlText } onChange={ handleEditorChange } />
      <div style={ { flexGrow: 1, overflow: 'auto' } }>
        <Renderer data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
