# Talento — MVP

MVP de una aplicación interna para registrar, consultar y filtrar candidatos. Está construido con React y Vite, listo para desplegar como sitio estático en GitHub Pages.

## Ejecutar localmente

```bash
npm install
npm run dev
```

El inicio de sesión es una simulación para la demo: se puede entrar con cualquier email y contraseña no vacíos, o usar el botón **Entrar a la demo**. Los candidatos nuevos se guardan en `localStorage` del navegador. Los perfiles iniciales son datos de muestra.

## Funciones del MVP

- Pantalla de acceso y sesión de demostración.
- Tabla de candidatos y fichas de perfil.
- Búsqueda por nombre, puesto, email, ubicación o habilidad.
- Filtros de candidatos por área y habilidades.
- Vinculación de candidatos a búsquedas desde su ficha, seleccionando el ID de la búsqueda.
- Preferencias de apariencia: modo oscuro y texto ligeramente más grande.
- La lista principal de candidatos omite la columna de estado; sigue disponible como filtro.
- Alta de candidatos con comentarios y selección de archivo PDF.
- Reemplazo de CV en la ficha de candidato.
- Pantalla de búsquedas con filtros, alta y eliminación.
- Configuración para agregar áreas y quitar las que todavía no tengan candidatos asociados.

La sesión, los candidatos, las búsquedas, las áreas y la interfaz de carga no se conectan a un backend todavía. La selección o reemplazo del PDF solo conserva el nombre del archivo en el navegador; no lo sube a ningún servicio.

## Publicar en GitHub Pages

El workflow de GitHub Actions compila la aplicación y publica `dist` cuando se actualiza la rama `main`. También se puede desplegar manualmente con `npm run deploy` si el repositorio tiene Pages habilitado y permisos de escritura.

## Próxima etapa: Firebase

La integración deberá reemplazar la sesión local por Firebase Auth y roles (administrador / usuario), guardar candidatos y comentarios en Firestore, y subir CVs a Firebase Storage. Las reglas de seguridad de Firestore y Storage deben validar el usuario y sus permisos; ocultar botones en React no reemplaza esas reglas.
