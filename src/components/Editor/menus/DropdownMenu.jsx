import React, { useState, useRef, useEffect } from 'react';

const DropdownMenu = ( { label, items } ) => {
    const [ open, setOpen ] = useState( false );
    const menuRef = useRef( null );

    // Alterna el menú al hacer click en el botón
    const toggleMenu = () => setOpen( v => !v );

    // Ejecuta la acción y cierra el menú después
    const handleItemClick = async ( action, label ) => {
        console.log( `▶️ Dropdown: clic en "${label}"` );
        try {
            await action();
        } finally {
            setOpen( false );
        }
    };

    // Cierra el menú al hacer click fuera
    useEffect( () => {
        const onClickOutside = ( e ) => {
            if( menuRef.current && !menuRef.current.contains( e.target ) ) {
                setOpen( false );
            }
        };
        document.addEventListener( 'mousedown', onClickOutside );
        return () => document.removeEventListener( 'mousedown', onClickOutside );
    }, [] );

    return (
        <div
            ref={ menuRef }
            className={ `dropdown ${open ? 'open' : ''}` }
        >
            <button
                type="button"
                className="dropdown-button"
                onClick={ toggleMenu }
            >
                { label }
            </button>

            { open && (
                <div className="dropdown-menu">
                    { items.map( ( item, i ) => (
                        <button
                            key={ i }
                            type="button"
                            className="dropdown-item"
                            onClick={ () => handleItemClick( item.onClick, item.label ) }
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
