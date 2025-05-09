import React from 'react';
import DropdownMenu from './DropdownMenu';

const FileMenu = ( { onOpen, onSave } ) => {
    const items = [
        { label: 'Open…', onClick: onOpen },
        { label: 'Save as…', onClick: onSave }
    ];
    return <DropdownMenu label="File" items={ items } />;
};

export default FileMenu;
