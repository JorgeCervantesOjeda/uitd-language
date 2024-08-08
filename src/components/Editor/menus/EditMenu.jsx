import React from 'react';
import DropdownMenu from './DropdownMenu';
import { ExampleUITD } from '../utils/ExampleUITD';

const EditMenu = ( { handleFormatCode, setMessage, uitdlText, onChange } ) => {
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText( uitdlText ).then( () => {
            setMessage( 'Copied to clipboard!' );
            setTimeout( () => {
                setMessage( '' );
            }, 2000 );
        } ).catch( ( err ) => {
            console.error( 'Could not copy text: ', err );
        } );
    };

    const handlePasteFromClipboard = () => {
        navigator.clipboard.readText().then( ( text ) => {
            onChange( text );
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
