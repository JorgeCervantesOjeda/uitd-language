import React from 'react';
import MonacoEditor from '@monaco-editor/react';

const CodeViewer = ( { code, language } ) => {

    return (
        <MonacoEditor
            width="100%"
            height="100%"
            language={ language }
            value={ code }
            theme="vs-dark"
            options={ {
                readOnly: true,
            } }
        />
    );
};

export default CodeViewer;
