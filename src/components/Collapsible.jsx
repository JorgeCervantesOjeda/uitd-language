// components/Collapsible.jsx
import React, { useState } from 'react';
import { Collapse } from 'react-collapse';

const Collapsible = ( { title, children } ) => {
    const [ isOpen, setIsOpen ] = useState( false );

    const toggle = () => {
        setIsOpen( !isOpen );
    };

    return (
        <div>
            <div onClick={ toggle } style={ { cursor: 'pointer', padding: '10px', background: '#333', color: '#fff' } }>
                { title }
            </div>
            <Collapse isOpened={ isOpen }>
                <div style={ { padding: '10px', background: '#1e1e1e' } }>
                    { children }
                </div>
            </Collapse>
        </div>
    );
};

export default Collapsible;
