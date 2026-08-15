# JEMMO LIVE · RELEASE 66 · CASA PREMIUM NIVEL DIOS

## Motivo
La RELEASE 65 publicó una capa visual insuficiente y las reglas Firestore no se desplegaron al subir los archivos a GitHub. Por eso la Casa podía mostrar el aviso de permisos y el resultado no correspondía al diseño premium aprobado.

## Casa premium
- Escenario inmersivo futurista oscuro con morado, neón, dorado y burdeos.
- Anfitrión/líder central con avatar real cuando está disponible.
- Miembros destacados en órbita, con plazas escalables 4/8/12/15 según datos/nivel.
- Pecera Social protagonista con Chicharro JEMMO.
- Consola de energía y métricas de puntos, regalos, combo, racha, fans, ranking y actividad.
- Accesos: Sala, Regalos, Apoyar Casa, Batalla, Invitar y Miembros.
- Latido de la Casa con mensajes y avisos reales recientes.

## Sala y regalos
- La Sala oficial conserva las 20 sillas en 4 columnas × 5 filas, solo audio, tal como se había acordado.
- Desde la Casa, “Enviar regalo” abre la Sala y despliega el catálogo de regalos automáticamente.

## Firebase
- `firestore.rules` actualizado para que la Pecera pueda sincronizarse por miembros o responsables reales de la Casa.
- Las acciones de mascota verifican `houseId` y `userId/updatedBy` contra la sesión autenticada.
- Es obligatorio desplegar las reglas en Firebase después del Commit de GitHub.
