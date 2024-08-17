import React, { useRef } from 'react';
import { saveAs } from 'file-saver';
import DropdownMenu from './DropdownMenu.jsx';

const FileMenu = ( { setLastSaved, setIsModified, setMessage, uitdlText, onChange } ) => {
    const fileInputRef = useRef( null );

    const displayTemporaryMessage = ( message, duration = 2000 ) => {
        setMessage( message );
        setTimeout( () => {
            setMessage( '' );
        }, duration );
    };

    const handleOpenFile = ( event ) => {
        const file = event.target.files[ 0 ];
        if( file && file.name.endsWith( '.uitd' ) ) {
            const reader = new FileReader();
            reader.onload = ( e ) => {
                onChange( e.target.result );
            };
            reader.readAsText( file );
            setIsModified( true );
            displayTemporaryMessage( `File "${file.name}" was loaded.` );
        } else {
            displayTemporaryMessage( 'Please select a valid .uitd file.' );
        }
    };

    const handleSaveToFile = () => {
        const blob = new Blob( [ uitdlText ], { type: 'text/plain;charset=utf-8' } );
        saveAs( blob, '_.uitd' );
        setLastSaved( Date.now() );
        setIsModified( false );
        displayTemporaryMessage( 'I will assume you really saved your file.', 10000 )
    };

    const fileMenuItems = [
        { label: 'Open...', onClick: () => fileInputRef.current.click() },
        { label: 'Save as...', onClick: handleSaveToFile },
    ];

    return (
        <>
            <DropdownMenu label="File" items={ fileMenuItems } />
            <input
                type="file"
                ref={ fileInputRef }
                style={ { display: 'none' } }
                onChange={ handleOpenFile }
                accept=".uitd"
            />
        </>
    );
};

export default FileMenu;
