import React from 'react';
import DropdownMenu from './DropdownMenu';
import { saveAs } from 'file-saver';

const FileMenu = ( {
    fileInputRef,
    setLastSaved,
    setIsModified,
    setMessage,
    uitdlText,
    onChange
} ) => {
    const handleOpenFile = ( event ) => {
        const file = event.target.files[ 0 ];
        if( file && file.name.endsWith( '.uitd' ) ) {
            const reader = new FileReader();
            reader.onload = ( e ) => {
                onChange( e.target.result );
            };
            reader.readAsText( file );
        } else {
            alert( 'Please select a .uitd file' );
        }
    };

    const handleSaveToFile = () => {
        const blob = new Blob( [ uitdlText ], { type: 'text/plain;charset=utf-8' } );
        saveAs( blob, 'uitdl_description.uitd' );
        setLastSaved( Date.now() );
        setIsModified( false );
        setMessage( '' );
    };

    const fileMenuItems = [
        { label: 'Save as...', onClick: handleSaveToFile },
        { label: 'Open...', onClick: () => fileInputRef.current.click() },
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
