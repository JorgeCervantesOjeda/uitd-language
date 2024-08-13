import React from 'react';
import './../../App.css'; // We'll create this CSS file next

const ErrorPopup = ( { errors, onClose } ) => {
    return (
        <div className="error-popup-overlay">
            <div className="error-popup">
                <button className="close-button" onClick={ onClose }>
                    &times;
                </button>
                <div className="error-popup-content">
                    { errors.length > 0 ? (
                        errors.map( ( error, index ) => (
                            <div key={ index } className="error-item">
                                <strong>Error { index + 1 }:</strong> { error.message }
                            </div>
                        ) )
                    ) : (
                        <p>No errors to display.</p>
                    ) }
                </div>
            </div>
        </div>
    );
};

export default ErrorPopup;
