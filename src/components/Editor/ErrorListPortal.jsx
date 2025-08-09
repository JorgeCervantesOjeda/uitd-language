// src/components/Editor/ErrorListPortal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import ErrorList from './ErrorList';

export default function ErrorListPortal( props ) {
    return createPortal(
        <div className="error-list-container">
            <ErrorList { ...props } />
        </div>,
        document.body // teleport to root
    );
}
