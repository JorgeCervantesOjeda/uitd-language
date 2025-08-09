const formatCode = ( code ) => {
    // Add space after comma
    code = code.replace( /,\s*/g, ', ' );

    // Replace multiple consecutive spaces with a single space (excluding newlines)
    code = code.replace( / {2,}/g, ' ' );

    // Remove spaces before and after {
    code = code.replace( /\s*{\s*/g, '{' );
    // Remove spaces before and after }
    code = code.replace( /\s*}\s*/g, '}' );
    // Remove spaces before and after ;
    code = code.replace( /\s*;\s*/g, ';' );

    // Ensure { is followed by a newline and preceded by a space
    code = code.replace( /{([^\n])/g, '{\n$1' );
    code = code.replace( /([^\s{])\{/g, '$1 {' );

    // Ensure } is followed by a newline and preceded by a newline
    code = code.replace( /;([^\n])/g, ';\n$1' );
    code = code.replace( /}(?!;)/g, '}\n' );
    code = code.replace( /([^\n])}/g, '$1\n}' );

    // Remove spaces before and after ( excluding newlines
    code = code.replace( /[^\S\n]*\([^\S\n]*/g, '(' );
    // Remove spaces before and after ) excluding newlines
    code = code.replace( /[^\S\n]*\)[^\S\n]*/g, ')' );

    // Split into lines and apply indentation correction
    const lines = code.split( '\n' );
    let indentLevel = 0;
    const indentSize = 4;
    const formattedLines = lines.map( line => {
        if( line.trim() === '' ) return line; // Keep empty lines as they are

        if( line.trim().startsWith( '}' ) ) indentLevel -= 1;
        const formattedLine = ' '.repeat( indentLevel * indentSize ) + line.trim();
        if( line.trim().endsWith( '{' ) ) indentLevel += 1;

        return formattedLine;
    } );

    return formattedLines.join( '\n' ).trim();
};

// src/components/Editor/utils/formatCode.js

export const handleFormatCode = ( editorRef, updateContent ) => {
    const editor = editorRef.current;
    const model = editor.getModel();
    const position = editor.getPosition();
    const currentValue = model.getValue();

    // 1) Formatear la cadena (igual que antes)…
    const formattedValue = formatCode( currentValue );

    // 2) Aplicar ediciones en el editor
    editor.executeEdits( '', [ {
        range: model.getFullModelRange(),
        text: formattedValue,
        forceMoveMarkers: true,
    } ] );
    editor.setPosition( position );

    // 3) Notificar al componente padre para que actualice estado,
    // marque como modificado y programe el guardado debounced:
    updateContent( formattedValue );
};

export default handleFormatCode;
