import React from 'react';
import DropdownMenu from './DropdownMenu';

const EditMenu = ( { onCopyAll, onPaste, onFormat, onLoadExample } ) => {
    const items = [
        { label: 'Copy All', onClick: onCopyAll },
        { label: 'Paste', onClick: onPaste },
        { label: 'Format', onClick: onFormat },
        { label: 'Load Example', onClick: onLoadExample },
    ];

    return <DropdownMenu label="Edit" items={ items } />;
};

export default EditMenu;
