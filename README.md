# JEMMO LIVE V1 · PRUEBA 51

## Cámara vertical a pantalla completa sin doble zoom

PRUEBA 51 sustituye la corrección de cámara de PRUEBA 50.

PRUEBA 50 eliminó el acercamiento excesivo, pero al retirar también la preferencia vertical permitió que algunos Android entregaran vídeo cuadrado. El uso posterior de `contain` produjo franjas negras grandes arriba y abajo durante el LIVE.

### Corrección definitiva
- Se recupera `aspectRatio: 9/16` únicamente como preferencia de captura.
- Se mantiene `resizeMode: none`; no se vuelve a activar `crop-and-scale`.
- El vídeo ocupa toda la pantalla mediante `cover`.
- Se solicita zoom neutro `1x` cuando la cámara informa de control de zoom.
- La corrección afecta al emisor, la preparación, la cámara secundaria y el espectador.

### Instalación
Extrae los archivos del ZIP y súbelos a la raíz del repositorio, sustituyendo los archivos con el mismo nombre. No subas el ZIP directamente.
