import React from 'react';
import DropdownMenu from './DropdownMenu';
import { ExampleUITD } from '../utils/ExampleUITD';

const EditMenu = ( { handleFormatCode, setMessage, uitdlText, onChange } ) => {

    const displayTemporaryMessage = ( message, duration = 2000 ) => {
        setMessage( message );
        setTimeout( () => {
            setMessage( '' );
        }, duration );
    }


    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText( uitdlText ).then( () => {
            displayTemporaryMessage( 'Copied to clipboard!' );
        } ).catch( ( err ) => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    const handlePasteFromClipboard = () => {
        navigator.clipboard.readText().then( ( text ) => {
            onChange( text );
            displayTemporaryMessage( 'Clipboard pasted.' );
        } ).catch( ( err ) => {
            console.error( 'Failed to read clipboard contents: ', err );
        } );
    };

    const handleResetToExample = () => {
        onChange( ExampleUITD );
    };

    const editMenuItems = [
        { label: 'Copy All', onClick: handleCopyToClipboard },
        { label: 'Paste', onClick: handlePasteFromClipboard },
        { label: 'Format', onClick: handleFormatCode },
        { label: 'Load Example', onClick: handleResetToExample },
    ];

    return <DropdownMenu label="Edit" items={ editMenuItems } />;
};

export default EditMenu;
