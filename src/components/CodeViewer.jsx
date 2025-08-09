import React, { useCallback, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { setupD2 } from './Editor/utils/monacoSetup';

const CodeViewer = ( { code, onChange, theme } ) => {

    const handleBeforeMount = useCallback( async monaco => {
        setupD2( monaco );
    }, [] );

    console.log( theme );

    return (
        <div style={ { position: 'relative' } }>
            <MonacoEditor
                beforeMount={ handleBeforeMount }
                width="100%"
                height="90vh"
                language="d2"
                value={ code }
                theme={theme}
                onChange={ onChange }
                options={ {
                    readOnly: false,
                    minimap: { enabled: true },
                    hover: { enabled: false },
                    folding: true,
                    foldingStrategy: 'auto',
                    showFoldingControls: 'always',
                    automaticLayout: true
                } }
            />
        </div>
    );
};

export default CodeViewer;
