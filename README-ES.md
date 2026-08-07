# Biblioteca de Prompts

Aplicación web de código abierto para gestionar, organizar y buscar instrucciones (prompts) para inteligencia artificial. Desarrollada con Next.js, Prisma y PostgreSQL.

> 🪧 **Página web del proyecto**: [bprompts.paginaviva.net](https://bprompts.paginaviva.net)

---

## Índice

1. [Descripción](#descripción)
2. [Características](#características)
3. [Capturas de pantalla](#capturas-de-pantalla)
4. [Tecnologías](#tecnologías)
5. [Requisitos](#requisitos)
6. [Instalación](#instalación)
7. [Configuración del entorno](#configuración-del-entorno)
8. [Base de datos](#base-de-datos)
9. [Desarrollo](#desarrollo)
10. [Pruebas](#pruebas)
11. [Compilación para producción](#compilación-para-producción)
12. [Despliegue](#despliegue)
13. [Documentación](#documentación)
14. [Créditos y origen](#créditos-y-origen)
15. [Licencia](#licencia)

---

## Descripción

Biblioteca de instrucciones (prompts) para inteligencia artificial: gestión, organización y búsqueda de órdenes para diferentes modelos de IA, basada en Prompt Database. Este repositorio es un tenedor (fork) de [YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database), con crédito a su creador.

La aplicación permite crear, editar y eliminar instrucciones, organizarlas con categorías jerárquicas y etiquetas, filtrarlas y buscarlas por texto completo, copiarlas al portapapeles con un clic, y exportarlas o importarlas en formato JSON.

## Características

- Crear, editar y eliminar instrucciones (prompts)
- Organizar con categorías jerárquicas (hasta dos niveles) y etiquetas
- Filtrar por categoría, etiqueta, plataforma, estado, idioma, clientes, proyectos, casos de uso, sugerencias de modelo y favoritos
- Búsqueda de texto completo en título, descripción y cuerpo
- Seguimiento de uso (contador de usos y fecha del último uso)
- Copiado al portapapeles con un clic
- Duplicar instrucciones
- Marcar como favoritas
- Exportar e importar en formato JSON
- Autenticación de usuarios con NextAuth
- Aislamiento de instrucciones por usuario
- Perfil de usuario con pestañas (cuenta, escritorio, usuarios)
- Gestión de usuarios para el rol administrador
- Instrucciones compartidas entre usuarios (vista de solo lectura)
- Interfaz multilingüe con selector de idioma (español e inglés)
- Interfaz moderna con TailwindCSS y shadcn/ui

## Capturas de pantalla

Las capturas de pantalla de la aplicación se publicarán próximamente. La lista de capturas previstas y su ubicación está documentada en [screenshots/lista-de-capturas.md](screenshots/lista-de-capturas.md).

| Captura | Descripción |
|---|---|
| `screenshots/pantalla-principal.png` | Listado de mensajes con búsqueda y filtros |
| `screenshots/pantalla-formulario.png` | Formulario de creación y edición |
| `screenshots/pantalla-detalle.png` | Detalle con botón de copiado |
| `screenshots/pantalla-categorias.png` | Gestión de categorías jerárquicas |
| `screenshots/pantalla-etiquetas.png` | Gestión de etiquetas |
| `screenshots/pantalla-perfil.png` | Perfil de usuario con pestañas |
| `screenshots/pantalla-administracion.png` | Gestión de usuarios (administrador) |
| `screenshots/pantalla-idiomas.png` | Selector de idioma |

## Tecnologías

- **Marco de trabajo**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS
- **Componentes de interfaz**: shadcn/ui
- **Base de datos**: PostgreSQL
- **Mapeo objeto-relacional**: Prisma
- **Autenticación**: NextAuth
- **Validación**: Zod
- **Pruebas**: Jest
- **Traducciones**: next-intl

## Requisitos

- Node.js versión 20 o superior
- npm, yarn o pnpm como gestor de paquetes
- Base de datos PostgreSQL (por ejemplo, Neon)
- Cuenta de Vercel para el despliegue

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/paginaviva/biblioteca-de-prompts.git
cd biblioteca-de-prompts
```

2. Instalar las dependencias:

```bash
npm install
# o
yarn install
# o
pnpm install
```

3. Configurar las variables de entorno (ver [Configuración del entorno](#configuración-del-entorno)).

## Configuración del entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env
```

Las variables principales son:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a la base de datos PostgreSQL |
| `DATABASE_URL_UNPOOLED` | Cadena de conexión sin agrupación de conexiones (para migraciones) |
| `AUTH_SECRET` | Secreto de sesión de NextAuth |
| `AUTH_URL` | Dirección pública de la aplicación |
| `SEED_ADMIN_PASSWORD` | Contraseña del usuario administrador de la semilla |
| `SEED_USER_PASSWORD` | Contraseña del usuario de ejemplo de la semilla |
| `NEXT_PUBLIC_BASE_PATH` | Ruta base para despliegues en subcarpeta (vacía por defecto) |

> ⚠️ **Importante**: el archivo `.env` contiene credenciales reales y no debe publicarse nunca. Solo se versiona el archivo `.env.example`.

## Base de datos

```bash
# Generar el cliente de Prisma
npm run db:generate

# Aplicar las migraciones
npm run db:migrate

# (Opcional) Sembrar la base de datos con datos de ejemplo
npm run db:seed
```

## Desarrollo

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Pruebas

```bash
npm test
```

Pruebas en modo de vigilancia:

```bash
npm run test:watch
```

## Compilación para producción

```bash
npm run build
npm start
```

## Despliegue

La aplicación se despliega en producción en Vercel con una base de datos PostgreSQL gestionada en Neon.

1. Configurar las variables de entorno en el panel de Vercel (Proyecto → Configuración → Variables de entorno)
2. Conectar el repositorio `paginaviva/biblioteca-de-prompts`
3. Desplegar desde la rama principal

El detalle completo del procedimiento está en el [manual del desarrollador e instalador](manuales/manual-del-desarrollador.md).

## Documentación

| Documento | Descripción | Idiomas |
|---|---|---|
| [Manual de usuario](manuales/manual-de-usuario.md) | Guía de uso completa de la aplicación | Español |
| [Manual de usuario (inglés)](manuales/manual-de-usuario-en.md) | Guía de uso completa de la aplicación | Inglés |
| [Manual del desarrollador e instalador](manuales/manual-del-desarrollador.md) | Guía técnica de instalación, configuración y despliegue | Español |
| [Manual del desarrollador e instalador (inglés)](manuales/manual-del-desarrollador-en.md) | Guía técnica de instalación, configuración y despliegue | Inglés |

## Créditos y origen

Este proyecto es un tenedor (fork) de [YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database), creado por **Berry @ Yellowgrape**. El desarrollo posterior ha sido realizado por la organización [PáginaVIVA](https://github.com/paginaviva).

- Repositorio original: [github.com/YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database)
- Tenedor: [github.com/paginaviva/biblioteca-de-prompts](https://github.com/paginaviva/biblioteca-de-prompts)
- Página web: [bprompts.paginaviva.net](https://bprompts.paginaviva.net)

## Licencia

Este proyecto se publica bajo la licencia MIT. El código original de `YellowBerry007/prompt-database` conserva los derechos de su autor.
