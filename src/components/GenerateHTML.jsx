import React, { useState, useEffect } from 'react';

const GenerateHTML = ({ onClose }) => {
    const text = localStorage.getItem('uitdlContent') || '';

    // Estado para almacenar las UIs, transiciones, referencia actual y condiciones
    const [uiMap, setUIMap] = useState({});
    const [transitions, setTransitions] = useState([]);
    const [currentIds, setCurrentIds] = useState([]);
    const [modalConditions, setModalConditions] = useState(null);
    const [uiColors, setUiColors] = useState({});

    // Extrae todos los IDs de una referencia anidada como "13(3)" => ["13", "3"]
    const extractAllIds = (ref) => {
        if(!ref) return [];
        return [...ref.matchAll(/\d+/g)].map(m => m[0]);
    };

    // Compara si el `from` de la transición coincide con la ruta actual de IDs
    const isMatchingRef = (from, current) => {
        const fromIds = extractAllIds(from);
        const currentPrefix = current.slice(0, fromIds.length);
        return fromIds.join('.') === currentPrefix.join('.');
    };

    /*
        Al montar el componente, parsea el texto UITD:
        - Extrae las interfaces UI y sus acciones
        - Extrae las transiciones y sus condiciones
    */
    useEffect(() => {
        const uiRegex = /UI\s+(\d+)\s+"([^"]+)"\s+actions\s*{([^}]*)}/g;
        const transitionRegex = /TRANSITION\s+from\s+(\d+(?:\([^)]*\))?)\s+to\s+(\d+(?:\([^)]*\))?)\s*if\s+user\s+(\w+)\s+"([^"]+)"(?:\s+AND\s+"([^"]+)")?/g;

        const uis = {};
        let match;

        // Parsear UIs y sus acciones
        while((match = uiRegex.exec(text)) !== null){
            const [, id, name, actionsText] = match;
            const actions = [...actionsText.matchAll(/(\w+)\s+"([^"]+)"\s*;/g)].map(a => ({
                verb: a[1],
                target: a[2],
            }));
            uis[id] = { id, name, actions };
        }

        const allIds = Object.keys(uis).map(Number);
        const lowestId = allIds.length > 0 ? Math.min(...allIds).toString() : null;

        setUIMap(uis);
        setCurrentIds([lowestId]); // ID inicial como lista para permitir anidación

        // Parsear transiciones
        const tList = [];
        while ((match = transitionRegex.exec(text)) !== null) {
            const [, from, to, action, target, condition] = match;
            tList.push({ from, to, action, target, condition });
        }
        
        const colorData = JSON.parse(localStorage.getItem("uiColors") || "{}");
        setUiColors(colorData);
        setTransitions(tList);
    }, [text]);

    /*
        Al hacer clic en una acción, intenta encontrar una transición válida:
        - Si solo hay una sin condición, transiciona directamente
        - Si hay varias con condiciones, muestra modal para que el usuario elija
    */
    const handleClick = (verb, target) => {
        const matches = transitions.filter(t =>
            isMatchingRef(t.from, currentIds) &&
            t.action === verb &&
            t.target === target
        );

        if(matches.length === 0){
            alert(`No hay transición válida para ${verb} "${target}".`);
            return;
        }

        const noCond = matches.find(m => !m.condition);
        if(matches.length === 1 && noCond){
            const newIds = extractAllIds(noCond.to);
            setCurrentIds(newIds);
            return;
        }

        const conditions = [...new Set(matches.map(m => m.condition).filter(Boolean))];
        setModalConditions({ verb, target, options: conditions, matches });
    };

    // Cuando el usuario selecciona una condición, navega a la interfaz correspondiente
    const selectCondition = (cond) => {
        const selected = modalConditions.matches.find(
            m => (m.condition || '') === cond
        );
        if(selected){
            const newIds = extractAllIds(selected.to);
            setCurrentIds(newIds);
        }
        setModalConditions(null);
    };

    // Renderiza las interfaces de forma recursiva si son anidadas
    const renderNestedUI = (ids, level = 0) => {
        if(ids.length === 0) return null;
        const [currentId, ...rest] = ids;
        const ui = uiMap[currentId];
        if(!ui) return null;

        const colors = uiColors[currentId] || { fill: '#fff', stroke: '#000' };
        const borderColor = colors.stroke || (level === 0 ? '#000' : '#666');
        const backgroundColor = colors.fill || (level > 0 ? '#f9f9f9' : 'transparent');

        return (
        <div
            key={`${currentId}-${level}`}
            style={{
                //border: level === 0 ? '2px solid #000' : '1px dashed #666',
                //border: `3px solid ${colors.stroke}`,
                border: `2px solid ${borderColor}`,
                //backgroundColor: level > 0 ? '#f9f9f9' : 'transparent',
                //backgroundColor: colors.fill,
                backgroundColor,
                padding: '10px',
                marginTop: '20px',
                marginLeft: `${level * 20}px`,
                borderRadius: '10px',
            }}
        >
            <h3 style={{ marginBottom: '10px' }}>
            UI {currentId} ({ui.name})
            </h3>
            {ui.actions.length > 0 ? (
            ui.actions.map((a, i) => (
                <div key={i}>
                <button onClick={() => handleClick(a.verb, a.target)}>
                    {a.verb} "{a.target}"
                </button>
                </div>
            ))
            ) : (
            <p>No hay acciones disponibles.</p>
            )}
            {renderNestedUI(rest, level + 1)}
        </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: '6.2%',
            right: '0%',
            width: '25%',
            height: '50%',
            backgroundColor: 'white',
            border: '2px solid #ccc',
            borderRadius: '0px', // Esquinas del primer container
            overflowY: 'auto',
            zIndex: 1000,
            padding: '20px'
        }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose}>Close HTML</button>
        </div>


        {renderNestedUI(currentIds)}

        {modalConditions && (
            <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    minWidth: '300px',
                    textAlign: 'center'
                }}>
                    <h3>Selecciona la condición para:</h3>
                    <p><strong>{modalConditions.verb} "{modalConditions.target}"</strong></p>
                    {modalConditions.options.map((cond, i) => (
                        <button
                            key={i}
                            onClick={() => selectCondition(cond)}
                            style={{ display: 'block', margin: '10px auto', padding: '8px 16px' }}
                        >
                            {cond}
                        </button>
                    ))}
                    <button
                        onClick={() => setModalConditions(null)}
                        style={{ marginTop: '10px', backgroundColor: '#ccc' }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        )}
        </div>
    );
};

export default GenerateHTML;