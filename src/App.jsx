import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import RendererD2 from './components/RendererD2';
import { parseUITDL, validateData } from './utils/Parser';
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

  const handleEditorChange = ( text ) => {
    setUitdlText( text );
    const parsed = parseUITDL( text );
    const validationErrors = validateData( parsed );
    parsed.errors = validationErrors;
    setParsedData( parsed );
    setIsModified( true );
  };

  return (
    <div style={ { display: 'flex', width: '100vw', height: '90vh', backgroundColor: 'grey' } }>
      <div style={ { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', width: '40vw', height: '90vh' } }>
        <Editor style="editor" uitdlText={ uitdlText } onChange={ handleEditorChange } />
      </div>
      <div style={ { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', width: '40vw', height: '90vh' } }>
        <RendererD2 style="editor" data={ parsedData } />
      </div>
    </div>
  );
};

export default App;
