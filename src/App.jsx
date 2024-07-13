import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import RendererD2 from './components/RendererD2';
import { handleEditorTextChange, debounce } from './utils/utils';
import { initialText } from './utils/initialText';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState( initialText );
  const initialParsedData = handleEditorTextChange( initialText );
  const [ parsedData, setParsedData ] = useState( initialParsedData );
  const editorRef = useRef( null );

  const debouncedHandleChange = debounce( ( text ) => {
    const parsed = handleEditorTextChange( text );
    setParsedData( parsed );
    if( editorRef.current ) {
      setMarkers( editorRef.current, parsed.errors );
    }
  }, 300 );

  useEffect( () => {
    debouncedHandleChange( uitdlText );
  }, [ uitdlText ] );

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
  };

  const handleEditorDidMount = ( editor, monaco ) => {
    editorRef.current = editor;
    setMarkers( editor, parsedData.errors );
  };

  const setMarkers = ( editor, markers ) => {
    const model = editor.getModel();
    if( model ) {
      monaco.editor.setModelMarkers( model, 'uitdl', markers );
    }
  };

  return (
    <div style={ { display: 'flex', width: '100vw', height: '100vh' } }>
      <div className='space-screen'>
        <Editor
          uitdlText={ uitdlText }
          onChange={ handleEditorChange }
          markers={ parsedData.errors }
          onMount={ handleEditorDidMount }
        />
      </div>
      <div className='space-screen'>
        <RendererD2 data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
