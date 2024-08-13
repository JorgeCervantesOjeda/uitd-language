import React, { useState } from 'react';

const DropdownMenu = ( { label, items } ) => {
    const [ open, setOpen ] = useState( false );

    const toggleMenu = () => {
        setOpen( !open );
    };

    const handleItemClick = ( onClick ) => {
        onClick();  // Ensure the click event is fully handled
        setOpen( false );  // Close the menu after the click event
    };

    return (
        <div
            className={ `dropdown ${open ? 'open' : ''}` }
            onMouseLeave={ () => setOpen( false ) }  // Close menu when mouse leaves
        >
            <button
                className="dropdown-button"
                onMouseEnter={ () => setOpen( true ) }  // Open menu on hover
                onClick={ toggleMenu }  // Toggle menu on click
            >
                { label }
            </button>
            { open && (
                <div className="dropdown-menu">
                    { items.map( ( item, index ) => (
                        <button
                            key={ index }
                            className="dropdown-item"
                            onClick={ () => handleItemClick( item.onClick ) }
                        >
                            { item.label }
                        </button>
                    ) ) }
                </div>
            ) }
        </div>
    );
};

export default DropdownMenu;
