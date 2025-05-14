// src/components/Editor/menus/FileMenu.jsx
import React from 'react';
import DropdownMenu from './DropdownMenu';

const FileMenu = ( { onOpen, onSave, onLoadExample } ) => {
    const items = [
        { label: 'Open…', onClick: onOpen },
        { label: 'Load Example', onClick: onLoadExample },
        { label: 'Save as…', onClick: onSave }
    ];
    return <DropdownMenu label="File" items={ items } />;
};

export default FileMenu;
