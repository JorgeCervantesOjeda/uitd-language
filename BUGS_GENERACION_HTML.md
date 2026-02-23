# Bugs Detectados en Generacion de HTML

Archivo analizado: `src/components/GenerateHTML.jsx`

## 1) Se pierde anidamiento cuando hay multiples hijos
- Referencia: `src/components/GenerateHTML.jsx:16`
- Problema: `buildIdPath` solo sigue `nested[0]`.
- Impacto: rutas incompletas para casos como `1(3,4)`.

## 2) Matching de transiciones ambiguo por comparar solo el ultimo id
- Referencias: `src/components/GenerateHTML.jsx:372`, `src/components/GenerateHTML.jsx:378`
- Problema: filtra transiciones por `lastInFrom === effectiveFrom`.
- Impacto: confunde contextos distintos que comparten UI interna (ej. `1(3)` vs `2(3)`).

## 3) Mezcla transiciones de todos los fragmentos
- Referencias: `src/components/GenerateHTML.jsx:177`, `src/components/GenerateHTML.jsx:188`
- Problema: `transitions` se construye global sin fragmento activo.
- Impacto: una accion puede resolver contra transicion de otro fragmento.

## 4) La opcion sin condicion desaparece cuando hay varias transiciones
- Referencia: `src/components/GenerateHTML.jsx:399`
- Problema: se arma modal con `filter( Boolean )`, removiendo condicion vacia.
- Impacto: no se puede elegir la ruta default si coexiste con rutas condicionadas.

## 5) Eliminacion arbitraria de una coordenada valida
- Referencias: `src/components/GenerateHTML.jsx:129`, `src/components/GenerateHTML.jsx:134`
- Problema: siempre elimina el primer centro detectado (`shift`).
- Impacto: puede perder ubicacion real y fallar el centrado.

## 6) Falsos positivos en busqueda de centros por `includes`
- Referencia: `src/components/GenerateHTML.jsx:240`
- Problema: usa `key.includes( uiId )`.
- Impacto: UI `1` puede matchear `10`, `21`, etc.

## 7) `parsedData` queda congelado durante la vida del componente
- Referencias: `src/components/GenerateHTML.jsx:23`, `src/components/GenerateHTML.jsx:25`
- Problema: lee `localStorage` una vez con `useMemo(..., [])`.
- Impacto: el HTML puede quedar desactualizado si el modelo cambia sin remount.
