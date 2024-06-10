// App.jsx
import React, { useState } from 'react';
import Editor from './components/Editor';
import RendererD2 from './components/RendererD2';
import Renderer from './components/Renderer';
import Collapsible from './components/Collapsible';
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
      <Editor value={ uitdlText } onChange={ handleEditorChange } style={ { flex: 1 } } />
      <div style={ { flex: 2, display: 'flex', flexDirection: 'column' } }>
        <Collapsible title="RendererD2">
          <RendererD2 data={ parsedData } style={ { flex: 1 } } />
        </Collapsible>
        <Renderer data={ parsedData } style={ { flex: 1 } } />
      </div>
    </div>
  );
};

export default App;
