const setErrors = ( editor, markers, setErrors ) => {
    const model = editor.getModel();
    if( model ) {
        // Clear existing markers
        monaco.editor.setModelMarkers( model, 'uitdl', [] );

        // Set new markers
        monaco.editor.setModelMarkers( model, 'uitdl', markers );
    }

    const newErrors = markers.map( marker => ( {
        startLineNumber: marker.startLineNumber,
        messages: [ 'Line:' + marker.startLineNumber + ' ' + marker.message ],
        severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
    } ) );

    // Sort errors by start line number
    newErrors.sort( ( a, b ) => a.startLineNumber - b.startLineNumber );

    setErrors( newErrors );
};

export default setErrors;
