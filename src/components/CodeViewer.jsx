import React, { useCallback, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { setupD2 } from './Editor/utils/monacoSetup';

const CodeViewer = ( { code, onChange } ) => {

    const handleBeforeMount = useCallback( async monaco => {
        setupD2( monaco );
    }, [] );

    return (
        <div style={ { position: 'relative' } }>
            <MonacoEditor
                beforeMount={ handleBeforeMount }
                width="100%"
                height="90vh"
                language="d2"
                value={ code }
                theme="uitdlTheme"
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
