import React from 'react';
import DropdownMenu from './DropdownMenu';

const EditMenu = ( { onCopyAll, onPaste, onFormat } ) => {
    const items = [
        { label: 'Copy All', onClick: onCopyAll },
        { label: 'Paste', onClick: onPaste },
        { label: 'Format', onClick: onFormat }
    ];

    return <DropdownMenu label="Edit" items={ items } />;
};

export default EditMenu;
