import React from 'react';

const DropdownMenu = ( { label, items } ) => {
    return (
        <div className="dropdown">
            <button className="dropbtn">{ label }</button>
            <div className="dropdown-content">
                { items.map( ( item, index ) => (
                    <button
                        key={ index }
                        className='renderer-button'
                        onClick={ item.onClick }
                    >

                        { item.label }
                    </button>
                ) ) }
            </div>
        </div>
    );
};

export default DropdownMenu;
