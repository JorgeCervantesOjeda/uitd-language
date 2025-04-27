import React from 'react';
import MonacoEditor from '@monaco-editor/react';

const CodeViewer = ( { code, language, onChange } ) => {
    return (
        <div style={ { position: 'relative', zIndex: 0 } }>
            <MonacoEditor
                width="100%"
                height="90vh"
                language={ language }
                value={ code }
                theme="vs-dark"
                onChange={ onChange }
                options={ {
                    readOnly: false,
                    minimap: { enabled: true },
                } }
            />
        </div>
    );
};

export default CodeViewer;
