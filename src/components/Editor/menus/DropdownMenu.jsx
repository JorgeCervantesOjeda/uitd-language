// src/components/Editor/DropdownMenu.jsx
import React, { useState, useRef, useEffect } from 'react';

const DropdownMenu = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setOpen(v => !v);
  const handleItemClick = async (action, name) => {
    try { await action(); } finally { setOpen(false); }
  };

  useEffect(() => {
    const onClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={menuRef} className={`dropdown ${open ? 'open' : ''}`}>
      <button type="button" className="dropdown-button" onClick={toggleMenu}>
        {label}
      </button>
      {open && (
        <div className="dropdown-menu">
          {items.map((item, i) => (
            <button
              key={i}
              className="dropdown-item"
              onClick={() => handleItemClick(item.onClick, item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
