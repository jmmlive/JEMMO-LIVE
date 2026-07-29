# JEMMO LIVE V1 · PRUEBA 50

## Encuadre natural de cámara sin zoom excesivo

PRUEBA 50 mantiene la arquitectura WebRTC robusta de PRUEBA 49 y corrige el recorte acumulado de la cámara en determinados Android.

### Cambio principal
La captura deja de forzar recorte 9:16 y el reproductor adapta `cover` o `contain` según la proporción real del vídeo. El objetivo es conservar el campo de visión y evitar primeros planos artificiales.

### Instalación
Extrae todos los archivos del ZIP y súbelos a la raíz del repositorio, sustituyendo los archivos con el mismo nombre. No subas el ZIP directamente.

### Después del commit
Cierra JEMMO LIVE por completo, vuelve a abrirla y actualiza una vez. Si Chrome conserva una versión anterior, borra la caché del sitio o reinstala la PWA.
