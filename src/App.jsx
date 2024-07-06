import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Editor from './components/Editor';
//import Renderer from './components/Renderer';
import RendererD2 from './components/RendererD2';
//import RendererParsed from './components/RendererParsed';
import { parseUITDL, validateData } from './utils/Parser';
//import { generateWebAppFromUITDL } from './utils/webAppGenerator';
import './App.css';

const App = () => {
  const [ uitdlText, setUitdlText ] = useState(
    `UITD "System Title" {
    UI 1 "Login" actions {
      clicks "Login" 
    }
    UI 2 "Admin Home" actions {
      deletes "user" 
    }
    UI 3 "Home" actions {
      clicks "play" 
    }
    UI 4 "Standings" actions {
      selects "level" 
    }
    UI 5 "Events" actions {
      selects "level" 
    }
    UI 0 "Menu" actions {
      clicks "Home" 
      clicks "Standings" 
      clicks "Events" 
      clicks "Logout" 
    }
    FRAGMENT "Menu Navigation and Login" {
      DRAW 1, 0
      DRAW 2(3(0)), 4(0), 5(0)
      TRANSITION from 0 to 2 if user clicks "Home" AND "is Admin"
      TRANSITION from 0 to 2(3) if user clicks "Home" AND "is Normal"
      TRANSITION from 0 to 4 if user clicks "Standings"
      TRANSITION from 0 to 5 if user clicks "Events"
      TRANSITION from 0 to 1 if user clicks "Logout"  
      TRANSITION from 1 to 2 if user clicks "Login" AND "is Admin"
      TRANSITION from 1 to 2(3) if user clicks "Login" AND "is Normal"
      TRANSITION from 1 to 1 if user clicks "Login" AND "not OK"
    }
    FRAGMENT "Standings" {
      DRAW 4
      TRANSITION from 4 to 4 if user selects "level" 
    }
}`
  );
  const [ parsedData, setParsedData ] = useState( parseUITDL( uitdlText ) );
  const [ generatedFiles, setGeneratedFiles ] = useState( [] );
  const [ lastSaved, setLastSaved ] = useState( Date.now() );
  const [ reminder, setReminder ] = useState( false );
  const [ isModified, setIsModified ] = useState( false );
  const [ selectedTab, setSelectedTab ] = useState( 'RendererD2' );
  const fileInputRef = useRef( null );

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
    const parsed = parseUITDL( text );
    const validationErrors = validateData( parsed );
    parsed.errors = validationErrors;
    setParsedData( parsed );
    setIsModified( true );
  };

  //  const handleGenerate = () => {
  //    const files = generateWebAppFromUITDL( parsedData );
  //    setGeneratedFiles( files );
  //    downloadZip( files );
  //  };

  //  const downloadZip = ( files ) => {
  //    const zip = new JSZip();
  //    files.forEach( ( file ) => {
  //      zip.file( file.name, file.content );
  //    } );
  //    zip.generateAsync( { type: 'blob' } ).then( ( content ) => {
  //      saveAs( content, 'webapp.zip' );
  //    } );
  //  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText( uitdlText ).then( () => {
      const copyMessage = document.getElementById( 'copyMessageEditor' );
      copyMessage.style.visibility = 'visible';
      setTimeout( () => {
        copyMessage.style.visibility = 'hidden';
      }, 2000 );
    } ).catch( ( err ) => {
      console.error( 'Could not copy text: ', err );
    } );
  };

  const handlePasteFromClipboard = () => {
    navigator.clipboard.readText().then( ( text ) => {
      setUitdlText( text );
      handleEditorChange( text );
    } ).catch( ( err ) => {
      console.error( 'Failed to read clipboard contents: ', err );
    } );
  };

  const handleSaveToFile = () => {
    const blob = new Blob( [ uitdlText ], { type: 'text/plain;charset=utf-8' } );
    saveAs( blob, 'uitdl_description.uitd' );
    setLastSaved( Date.now() );
    setReminder( false );
    setIsModified( false );
  };

  const handleOpenFile = ( event ) => {
    const file = event.target.files[ 0 ];
    if( file && file.name.endsWith( '.uitd' ) ) {
      const reader = new FileReader();
      reader.onload = ( e ) => {
        setUitdlText( e.target.result );
        handleEditorChange( e.target.result );
      };
      reader.readAsText( file );
    } else {
      alert( 'Please select a .uitd file' );
    }
  };

  useEffect( () => {
    if( isModified ) {
      const timer = setInterval( () => {
        if( Date.now() - lastSaved > 5 * 60 * 1000 ) {
          setReminder( true );
        }
      }, 60 * 1000 );

      return () => clearInterval( timer );
    }
  }, [ lastSaved, isModified ] );

  const renderContent = () => {
    switch( selectedTab ) {
      //      case 'Renderer':
      //        return <Renderer data={ parsedData } />
      case 'RendererD2':
        return <RendererD2 data={ parsedData } />;
      //case 'RendererParsed':
      //  return <RendererParsed data={ parsedData } />;
      default:
        return null;
    }
  };

  return (
    <div style={ { display: 'flex', height: '100%', backgroundColor: 'grey' } }>
      <div style={ { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', width: '45vw' } }>
        <div>
          <button onClick={ handleCopyToClipboard }>Copy to Clipboard</button>
          <button onClick={ handlePasteFromClipboard }>Paste from Clipboard</button>
          <button onClick={ handleSaveToFile }>Save to File</button>
          <input
            type="file"
            ref={ fileInputRef }
            style={ { display: 'none' } }
            onChange={ handleOpenFile }
            accept=".uitd"
          />
          <button onClick={ () => fileInputRef.current.click() }>Open File</button>
        </div>
        { reminder && (
          <div style={ { color: 'yellow', backgroundColor: 'darkred' } }>
            Remember to save your file!
          </div>
        ) }
        <span id="copyMessageEditor" style={ { marginLeft: '10px', visibility: 'hidden' } }>Copied to clipboard!</span>
        <Editor style="editor" value={ uitdlText } onChange={ handleEditorChange } />
      </div>
      <div style={ { flex: 1, display: 'flex', flexDirection: 'column', width: '45vw', height: '100vh' } }>
        <RendererD2 style="editor" data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
