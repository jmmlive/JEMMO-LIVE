# JEMMO LIVE V1 · PRUEBA 50
## Encuadre natural de cámara sin zoom excesivo
Fecha: 29/07/2026

### Incidencia
Al activar la cámara, algunos Android mostraban el rostro demasiado ampliado. El problema podía afectar tanto al emisor como al espectador.

### Causa técnica
- Captura forzada a 9:16.
- `resizeMode: crop-and-scale`.
- Segundo recorte visual mediante `object-fit: cover`.

### Corrección
1. Se elimina `aspectRatio: 9/16`.
2. Se usa `resizeMode: none`.
3. Se conserva el encuadre completo cuando la proporción de la cámara no coincide con la pantalla.
4. Solo se llena la pantalla cuando no implica un recorte apreciable.
5. El vídeo remoto del espectador utiliza encuadre completo.
6. La transformación espejo no incluye ningún escalado de aumento.
7. Se renueva la caché PWA a PRUEBA 50.

### Resultado esperado
La cara deja de aparecer artificialmente acercada. Puede aparecer una franja negra discreta cuando el sensor entregue 4:3 o 3:4; esa franja es deliberada para no cortar el rostro ni el entorno.
