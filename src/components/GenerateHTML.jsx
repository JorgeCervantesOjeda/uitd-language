import React, { useState, useEffect, useRef, useMemo } from 'react';
// Normaliza texto eliminando acentos, espacios extras y caracteres especiales
const Normalize = (s = '') =>
    String(s)
        .normalize('NFKD')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
// Construye el camino de IDs desde un nodo hacia sus elementos anidados
const buildIdPath = (node) => {
    const path = [];
    let current = node;
    while(current){
        path.push(current.id);
        current = current.nested?.[0] || null;
    }
    return path;
};
// Componente principal para generar y navegar el HTML interactivo
const GenerateHTML = ({ onClose, svg, panZoomRef }) => {
    // Cargar datos guardados del localStorage
    const parsedData = useMemo(
        () => JSON.parse(localStorage.getItem('parsedData') || '{}'),[]
    );
    // Estados principales del componente
    const [uiMap, setUIMap] = useState({}); // Mapeo de IDs a objetos UI
    const [transitions, setTransitions] = useState([]); // Lista de transiciones entre UIs
    const [currentIds, setCurrentIds] = useState([]); // Ruta actual de IDs de navegación
    const [modalConditions, setModalConditions] = useState(null); // Modal para selección de condiciones
    const [uiColors, setUiColors] = useState({}); // Colores personalizados para cada UI
    // Referencias para manipular el DOM
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    // Estados para el manejo de la ventana
    const [minDimensions, setMinDimensions] = useState({ width: 300, height: 225 });
    const [hasUserResized, setHasUserResized] = useState(false);
    // Estados para navegación múltiple entre ubicaciones
    const [svgCenters, setSvgCenters] = useState({}); // Coordenadas de elementos en el SVG
    const [currentLocationIndex, setCurrentLocationIndex] = useState(0); // Índice de ubicación actual
    const [globalNesting, setGlobalNesting] = useState({});
    // Extrae las coordenadas de todos los elementos del SVG
    useEffect(() => {
        if(!svg) return;
        try{
            const parser = new DOMParser();
            const doc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElem = doc.querySelector('svg');
            if(!svgElem) return;
            const centersMap = {};
            // Procesar grupos <g> que contienen texto y formas geométricas
            Array.from(svgElem.querySelectorAll('g')).forEach((g) => {
                const textEl = g.querySelector('text');
                const rect = g.querySelector('rect');
                const circle = g.querySelector('circle');
                const ellipse = g.querySelector('ellipse');
                const polygon = g.querySelector('polygon');
                if(!textEl) return; // Solo procesar grupos con texto
                const text = textEl.textContent?.trim();
                if(!text) return;
                // Filtrar etiquetas técnicas no deseadas
                if(/^clicks|selects|deletes|lbl_|^\d+$|^[A-Z]+_\d+$/i.test(text)) return;
                let cx = null, cy = null;
                // Calcular centro basado en la forma geométrica disponible
                if(rect){
                    const x = parseFloat(rect.getAttribute('x') || 0);
                    const y = parseFloat(rect.getAttribute('y') || 0);
                    const w = parseFloat(rect.getAttribute('width') || 0);
                    const h = parseFloat(rect.getAttribute('height') || 0);
                    cx = x + w / 2;
                    cy = y + h / 2;
                } else if(ellipse){
                    cx = parseFloat(ellipse.getAttribute('cx') || 0);
                    cy = parseFloat(ellipse.getAttribute('cy') || 0);
                } else if(circle){
                    cx = parseFloat(circle.getAttribute('cx') || 0);
                    cy = parseFloat(circle.getAttribute('cy') || 0);
                } else if(polygon){
                    // Calcular centroide del polígono
                    const pts = polygon.getAttribute('points')
                    .trim()
                    .split(/\s+/)
                    .map(p => p.split(',').map(Number));
                    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
                    cx = xs.reduce((a, b) => a + b, 0) / xs.length;
                    cy = ys.reduce((a, b) => a + b, 0) / ys.length;
                }
                // Usar posición del texto como fallback
                if((cx === null || isNaN(cx)) && textEl){
                    cx = parseFloat(textEl.getAttribute('x') || 0);
                    cy = parseFloat(textEl.getAttribute('y') || 0);
                }
                if(isNaN(cx) || isNaN(cy)) return;
                const normName = Normalize(text);
                if(!centersMap[normName]) centersMap[normName] = [];
                // Evitar duplicados verificando proximidad
                const isDuplicate = centersMap[normName].some(center =>
                    Math.abs(center.x - cx) < 5 && Math.abs(center.y - cy) < 5
                );
                if(!isDuplicate){
                    centersMap[normName].push({ x: cx, y: cy, name: text });
                }
            });
            // Procesar textos que no están dentro de grupos <g>
            Array.from(svgElem.querySelectorAll('text')).forEach((tEl) => {
                const text = tEl.textContent?.trim();
                if(!text) return;
                if(/^clicks|selects|deletes|lbl_|^\d+$|^[A-Z]+_\d+$/i.test(text)) return;
                const parent = tEl.parentElement;
                if(parent.tagName === 'g') return; // Ya fue procesado en el bucle anterior
                const x = parseFloat(tEl.getAttribute('x') || 0);
                const y = parseFloat(tEl.getAttribute('y') || 0);
                if(isNaN(x) || isNaN(y)) return;
                const normName = Normalize(text);
                if(!centersMap[normName]) centersMap[normName] = [];
                const isDuplicate = centersMap[normName].some(center =>
                    Math.abs(center.x - x) < 5 && Math.abs(center.y - y) < 5
                );
                if(!isDuplicate){
                    centersMap[normName].push({ x, y, name: text });
                }
            });
            // Limpiar entradas con nombres muy cortos (probablemente ruido)
            Object.keys(centersMap).forEach(key => {
                if(key.length < 2){
                    delete centersMap[key];
                }
            });
            // Eliminar la primera coordenada válida (fantasma en modo forces)
            const allKeys = Object.keys(centersMap);
            if(allKeys.length > 0){
                const firstKey = allKeys[0];
                if(Array.isArray(centersMap[firstKey]) && centersMap[firstKey].length > 0){
                    centersMap[firstKey].shift(); // quita el primer punto
                    // si ya no quedan coordenadas para ese nombre, eliminar la clave
                    if(centersMap[firstKey].length === 0){
                        delete centersMap[firstKey];
                    }
                }
            }
            setSvgCenters(centersMap);
        } catch(e){
            console.error('Error parsing SVG:', e);
        }
    }, [svg]);
    // Inicializar mapas de UI, colores y transiciones
    useEffect(() => {
        // Mapa global de anidamientos
        const nestingMap = {};
        // Procesar todos los paths de todas las referencias UI en todos los draws
        const allUIPaths = [];
        parsedData.fragments?.forEach(fragment => {
            fragment.draws?.forEach(draw => {
                draw.uiRefs?.forEach(ref => {
                    const path = buildIdPath(ref);
                    allUIPaths.push(path);
                });
            });
        });
        // Elegimos el path más largo para cada UI raíz
        allUIPaths.forEach(path => {
            const root = path[0];
            if(!nestingMap[root] || path.length > nestingMap[root].length){
                nestingMap[root] = path;
            }
        });
        setGlobalNesting(nestingMap);
        // Crear mapeo de ID a UI para acceso rápido
        const uis = {};
        parsedData.uis?.forEach(ui => { uis[ui.id] = ui; });
        setUIMap(uis);
        // Cargar colores personalizados guardados
        const colorData = JSON.parse(localStorage.getItem('uiColors') || '{}');
        setUiColors(colorData);
        // Construir lista plana de todas las transiciones
        const tList = [];
        parsedData.fragments?.forEach(fragment => {
            fragment.transitions?.forEach(t => {
                tList.push({
                from: buildIdPath(t.from),
                to: buildIdPath(t.to),
                action: t.action,
                target: t.target,
                condition: t.condition
                });
            });
        });
        setTransitions(tList);
        // Establecer UI inicial (la primera disponible)
        if(parsedData.fragments?.length){
            const allRefs = parsedData.fragments.flatMap(f => f.draws.flatMap(d => d.uiRefs));
            const allPaths = allRefs.map(ref => buildIdPath(ref));
            allPaths.sort((a, b) => {
                const aFirst = parseInt(a[0]);
                const bFirst = parseInt(b[0]);
                if(aFirst !== bFirst) return aFirst - bFirst;
                return b.length - a.length;
            });
            if(allPaths.length > 0) setCurrentIds(allPaths[0]);
        }
    }, []);
    // Escuchar cambios de colores desde RenderModal/RendererD2
    useEffect(() => {
        const handleColorUpdate = () => {
            const updatedColors = JSON.parse(localStorage.getItem('uiColors') || '{}');
            setUiColors(updatedColors);
            console.log('🎨 Colores sincronizados con RenderModal:', updatedColors);
        };
        window.addEventListener('uiColorsUpdated', handleColorUpdate);
        return () => {
            window.removeEventListener('uiColorsUpdated', handleColorUpdate);
        };
    }, []);
    // Resetear índice de ubicación cuando cambia la UI actual
    useEffect(() => {
        setCurrentLocationIndex(0);
    }, [currentIds]);
    // Busca coordenadas en el SVG para un ID de UI específico
    const findCentersForUIId = (uiId) => {
        const ui = uiMap[uiId];
        if(!ui) return [];
        const normalized = Normalize(ui.name);
        const keys = Object.keys(svgCenters);
        // 1. PRIORIDAD ALTA: Búsqueda combinando ID + nombre (ej: "3perfil")
        const idPlusName = uiId + normalized;
        if(svgCenters[idPlusName]){
            return svgCenters[idPlusName];
        }
        // 2. PRIORIDAD ALTA: Búsqueda por clave que contenga el ID al inicio
        for(const key of keys){
            if(typeof key !== 'string') continue;
            // Verificar si la clave empieza con el ID seguido de texto
            if(key.startsWith(uiId.toString()) && key !== uiId.toString()){
                return svgCenters[key];
            }
        }
        // 3. PRIORIDAD MEDIA: Búsqueda por clave que contenga el ID en cualquier posición
        for(const key of keys){
            if(typeof key !== 'string') continue;
            if(key.includes(uiId.toString())){
                return svgCenters[key];
            }
        }
        // 4. PRIORIDAD BAJA: Búsqueda exacta por nombre normalizado (solo si no hay match con ID)
        if(svgCenters[normalized]){
            return svgCenters[normalized];
        }
        // 5. PRIORIDAD BAJA: Búsqueda por inclusión de nombres
        for(const key of keys){
            if(typeof key !== 'string') continue;
            if(key.includes(normalized) || normalized.includes(key)){
                return svgCenters[key];
            }
        }
        // 6. ÚLTIMO RECURSO: Búsqueda por primera palabra del nombre
        const firstWord = normalized.split(' ')[0];
        if(firstWord){
            for(const key of keys){
                if(typeof key !== 'string') continue;
                if(key.includes(firstWord)){
                    return svgCenters[key];
                }
            }
        }
        return [];
    };
    // Centra la vista del SVG en las coordenadas especificadas
    const panToSVGPoint = (cx, cy) => {
        if(!isFinite(cx) || !isFinite(cy)) return;
        try{
            // 1) Si hay instancia de svg-pan-zoom -> usarla
            const inst = panZoomRef?.current;
            if(inst && (typeof inst.pan === 'function' || typeof inst.centerOn === 'function')){
                // intentar usar getSizes si existe
                const sizes = typeof inst.getSizes === 'function' ? inst.getSizes() : null;
                const realZoom = sizes?.realZoom ?? (typeof inst.getZoom === 'function' ? inst.getZoom() : 1);
                const viewportW = sizes?.width ?? window.innerWidth;
                const viewportH = sizes?.height ?? window.innerHeight;
                if(isFinite(realZoom)){
                    const panX = -(cx * realZoom) + viewportW / 2;
                    const panY = -(cy * realZoom) + viewportH / 2;
                    requestAnimationFrame(() => {
                        try{
                            if(typeof inst.pan === 'function'){
                                inst.pan({ x: panX, y: panY });
                            } else if(typeof inst.centerOn === 'function'){
                                inst.centerOn(cx, cy);
                            }
                        } catch(e){
                            // fallback: si falló, intentar centerOn si existe
                            if(typeof inst.centerOn === 'function') inst.centerOn(cx, cy);
                        }
                    });
                    return;
                }
            }
            // 2) Si no hay instancia (modo forces / canvas2svg)
            // -> enviar evento para que RenderModal lo calcule y aplique initialTransform
            const ev = new CustomEvent('panToPoint', { detail: { cx, cy } });
            window.dispatchEvent(ev);
        } catch(e){
            console.error('Error panning:', e);
        }
    };
    // Encuentra la estructura anidada completa para un ID específico
    const findNestedStructure = (targetId) => {
        // Si la UI es raíz de una cadena de anidamiento
        if(globalNesting[targetId]){
            return globalNesting[targetId];
        }
        // Si NO es raíz, buscar a qué cadena pertenece
        for(const root in globalNesting){
            const path = globalNesting[root];
            const index = path.indexOf(targetId);
            if(index !== -1){
                return path.slice(index);
            }
        }
        // Si no hay nada, devolver solo el id
        return [targetId];
    };
    // Obtiene la estructura de interfaz actual para renderizar
    const getCurrentInterfaceStructure = () => {
        if(!currentIds || currentIds.length === 0) return [];
        const currentInterfaceId = currentIds[currentIds.length - 1];
        return findNestedStructure(currentInterfaceId);
    };
    // Obtiene información sobre las ubicaciones múltiples de la UI actual
    const getCurrentLocationInfo = () => {
        if(!currentIds || currentIds.length === 0) 
            return { centers: [], current: 0, total: 0 };
        // Usar la interfaz actual (último elemento del path de navegación)
        const currentInterfaceId = currentIds[currentIds.length - 1];
        const centers = findCentersForUIId(currentInterfaceId);
        return {
            centers,
            current: currentLocationIndex,
            total: centers.length
        };
    };
    // Navega entre las diferentes ubicaciones de la misma UI
    const navigateLocation = (direction) => {
        const { centers, total } = getCurrentLocationInfo();
        if(total <= 1) return; // No hay múltiples ubicaciones
        let newIndex;
        if(direction === 'prev'){
            // Ir a ubicación anterior o la última si está en la primera
            newIndex = currentLocationIndex > 0 ? currentLocationIndex - 1 : total - 1;
        } else{
            // Ir a siguiente ubicación o la primera si está en la última
            newIndex = currentLocationIndex < total - 1 ? currentLocationIndex + 1 : 0;
        }
        setCurrentLocationIndex(newIndex);
        // Centrar vista en la nueva ubicación
        if(centers[newIndex]){
            panToSVGPoint(centers[newIndex].x, centers[newIndex].y);
        }
    };
    // Maneja clics en acciones de UI y ejecuta transiciones
    const handleClick = (verb, target, fromInterfaceId) => {
        // Determinar desde qué UI buscar la transición
        const searchPath = fromInterfaceId ? [fromInterfaceId] : currentIds;
        // Buscar transiciones que coincidan con la acción
        const matches = transitions.filter(t => {
            if(t.action !== verb || t.target !== target) return false;
            if(!Array.isArray(t.from) || !Array.isArray(searchPath)) return false;
            if(t.from.length !== searchPath.length) return false;
            return t.from.every((id, i) => id === searchPath[i]);
        });
        if(matches.length === 0){
            alert(`No hay transición válida para ${verb} "${target}".`);
            return;
        }
        // Si hay solo una transición sin condiciones, ejecutar directamente
        const noCond = matches.find(m => !m.condition);
        if(matches.length === 1 && noCond){
            setCurrentIds(noCond.to);
            // Centrar en la primera ubicación de la nueva UI
            const targetId = noCond.to[noCond.to.length - 1];
            const centers = findCentersForUIId(targetId);
            if(centers.length > 0){
                panToSVGPoint(centers[0].x, centers[0].y);
            }
            return;
        }
        // Mostrar modal para seleccionar condición si hay múltiples opciones
        const conditions = [...new Set(matches.map(m => m.condition).filter(Boolean))];
        setModalConditions({ verb, target, options: conditions, matches });
    };
    // Ejecuta transición basada en la condición seleccionada
    const selectCondition = (cond) => {
        const selected = modalConditions.matches.find(m => (m.condition || '') === cond);
        if(selected){
            setCurrentIds(selected.to);
            // Centrar en la primera ubicación de la nueva UI
            const targetId = selected.to[selected.to.length - 1];
            const centers = findCentersForUIId(targetId);
            if(centers.length > 0){
                panToSVGPoint(centers[0].x, centers[0].y);
            }
        }
        setModalConditions(null);
    };
    // Renderiza la estructura anidada de UIs con controles de navegación
    const renderNestedUI = (ids, level = 0) => {
        if(!ids || ids.length === 0) return null;
        const [currentId, ...rest] = ids;
        const ui = uiMap[currentId];
        if(!ui) return null;
        // Obtener colores personalizados o usar valores por defecto
        const colors = uiColors[currentId] || { fill: '#fff', stroke: '#000' };
        // Solo mostrar controles de navegación en el nivel raíz
        const locationInfo = level === 0 ? getCurrentLocationInfo() : { total: 0 };
        return (
            <div
                key={`${currentId}-${level}`}
                style={{
                    border: `2px solid ${colors.stroke}`,
                    backgroundColor: colors.fill,
                    padding: '10px',
                    marginTop: level > 0 ? '20px' : '0',
                    marginLeft: `${level * 20}px`, // Indentación por nivel
                    borderRadius: '10px',
                }}
            >
                {/* Encabezado con título y controles de navegación */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ color: 'black', margin: '0' }}>UI {currentId} ({ui.name})</h3>
                    {/* Mostrar controles solo si hay múltiples ubicaciones */}
                    {level === 0 && locationInfo.total > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button
                                onClick={() => navigateLocation('prev')}
                                className="neutral-btn"
                                style={{
                                    padding: '2px 6px',
                                    fontSize: '12px'
                                }}
                                title="Ubicación anterior"
                            >←</button>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {locationInfo.current + 1}/{locationInfo.total}
                            </span>
                            <button
                                onClick={() => navigateLocation('next')}
                                className="neutral-btn"
                                style={{
                                    padding: '2px 6px',
                                    fontSize: '12px'
                                }}
                                title="Ubicación siguiente"
                            >→</button>
                        </div>
                    )}
                </div>
                {/* Renderizar botones de acciones disponibles */}
                {ui.actions?.length > 0 ? (
                    ui.actions.map((a, i) => (
                        <span key={i}>
                            <button
                                key={i}
                                onClick={() => handleClick(a.verb, a.target, currentId)}
                                className="neutral-btn"
                            >
                            {a.verb} "{a.target}"
                            </button>
                        </span>
                    ))
                ) : (
                    <p>No hay acciones disponibles.</p>
                )}
                {/* Renderizar niveles anidados recursivamente */}
                {rest.length > 0 && renderNestedUI(rest, level + 1)}
            </div>
        );
    };
    // Configurar arrastrado de ventana desde el encabezado
    useEffect(() => {
        const container = containerRef.current;
        if(!container) return;
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        const handleMouseDown = (e) => {
            // Solo permitir arrastrar desde elementos con clase draggable-header
            if(e.target.classList.contains('draggable-header')){
                isDragging = true;
                const rect = container.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                e.preventDefault();
            }
        };
        const handleMouseMove = (e) => {
            if(!isDragging) return;
            // Calcular nueva posición manteniendo la ventana dentro de los límites
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            // Limitar posición para que no se salga de la pantalla
            newLeft = Math.max(0, Math.min(windowWidth - container.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(windowHeight - container.offsetHeight, newTop));
            container.style.left = `${newLeft}px`;
            container.style.top = `${newTop}px`;
        };
        const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        container.addEventListener('mousedown', handleMouseDown);
        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);
    // Configurar redimensionado de ventana desde la esquina inferior derecha
    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if(!container || !content) return;
        // Crear handle visual para redimensionar
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 15px;
            height: 15px;
            background: #ccc;
            cursor: se-resize;
            z-index: 10;
        `;
        container.appendChild(resizeHandle);
        const handleMouseDown = (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = container.offsetWidth;
            const startHeight = container.offsetHeight;
            const onMouseMove = (e) => {
                // Calcular nuevo tamaño basado en el movimiento del mouse
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const newWidth = Math.max(minDimensions.width, startWidth + dx);
                const newHeight = Math.max(minDimensions.height, startHeight + dy);
                container.style.width = `${newWidth}px`;
                container.style.height = `${newHeight}px`;
                setHasUserResized(true);
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        resizeHandle.addEventListener('mousedown', handleMouseDown);
        // Observador para ajustar tamaño mínimo automáticamente
        const contentObserver = new ResizeObserver(() => {
            const newMin = {
                width: Math.max(content.scrollWidth + 20, 300),
                height: Math.max(content.scrollHeight + 40, 225),
            };
            const wDiff = Math.abs(newMin.width - minDimensions.width);
            const hDiff = Math.abs(newMin.height - minDimensions.height);
            // Solo actualizar si hay cambio significativo
            if(wDiff > 3 || hDiff > 3){
                setMinDimensions(newMin);
                // Ajustar tamaño solo si el usuario no ha redimensionado manualmente
                if(!hasUserResized){
                    container.style.minWidth = `${newMin.width}px`;
                    container.style.minHeight = `${newMin.height}px`;
                }
            }
        });
        contentObserver.observe(content);
        return () => {
            if(resizeHandle.parentNode){
                resizeHandle.parentNode.removeChild(resizeHandle);
            }
            contentObserver.disconnect();
        };
    }, []);
    // Renderizado principal del componente
    const structureToRender = getCurrentInterfaceStructure();
    
    return (
        <>
            {/* Estilos CSS para botones neutrales */}
            <style>{`
                .neutral-btn {
                    background-color: #c0c0c0 !important;
                    color: #000 !important;
                    border: none !important;
                    border-radius: 5px !important;
                    padding: 6px 12px !important;
                    margin: 5px !important;
                    cursor: pointer !important;
                    transition: background-color 0.2s ease !important;
                }
                .neutral-btn:hover { 
                    background-color: #b0b0b0 !important; 
                    box-shadow: none !important;
                }
            `}</style>
            {/* Ventana principal del navegador de UI */}
            <div
                ref={containerRef}
                style={{
                    position: 'fixed',
                    top: '10%',
                    left: '70%',
                    backgroundColor: 'white',
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    overflow: 'auto',
                    zIndex: 1000,
                    padding: '10px',
                    width: hasUserResized ? undefined : minDimensions.width,
                    height: hasUserResized ? undefined : minDimensions.height,
                    minWidth: minDimensions.width,
                    minHeight: minDimensions.height,
                    boxSizing: 'border-box',
                    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                    resize: 'none',
                }}
            >
                {/* Barra de título arrastrable */}
                <div
                    className="draggable-header"
                    style={{
                        cursor: 'move',
                        borderBottom: '1px solid #ccc',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '4px 10px',
                    }}
                >
                    <button onClick={onClose}>Close HTML</button>
                </div>
                {/* Contenido principal de la navegación */}
                <div ref={contentRef} style={{ padding: '10px' }}>
                    {renderNestedUI(structureToRender)}
                </div>
                {/* Modal para seleccionar condiciones de transición */}
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
                                >{cond}</button>
                            ))}
                            <button
                                onClick={() => setModalConditions(null)}
                                style={{ marginTop: '10px', backgroundColor: '#ccc' }}
                            >Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default GenerateHTML;