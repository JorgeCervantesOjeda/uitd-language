import React, { useState, useEffect } from 'react';
import { ResizableBox } from 'react-resizable';
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
      <ResizableBox>
        <Editor value={ uitdlText } onChange={ handleEditorChange } />
        <div style={ { flexGrow: 1, overflow: 'auto' } }>
          <Renderer data={ parsedData } />
        </div>
      </ResizableBox>
    </div>
  );
};

export default App;
