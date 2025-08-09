const setErrors = ( editor, markers, setErrorState ) => {
    const model = editor.getModel();
    if( model ) {
        // Clear existing markers
        monaco.editor.setModelMarkers( model, 'uitdl', [] );

        // Set new markers
        monaco.editor.setModelMarkers( model, 'uitdl', markers );
    }

    const newErrors = markers.map( marker => ( {
        startLineNumber: marker.startLineNumber,
        columnNumber: marker.startColumn,        // <— Añadido

        messages: [ 'Line ' + marker.startLineNumber + ': ' + marker.message ],
        severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
    } ) );

    // Sort errors by start line number
    newErrors.sort( ( a, b ) => a.startLineNumber - b.startLineNumber );

    setErrorState( newErrors );
};

export default setErrors;
