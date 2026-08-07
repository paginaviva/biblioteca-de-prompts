# Manual del Desarrollador e Instalador — biblioteca-de-prompts

> **Aplicación**: biblioteca-de-prompts (antes «Prompt Database»)
> **Tenedor desarrollado por**: PáginaVIVA (repositorio original: `YellowBerry007/prompt-database`, autor Berry @ Yellowgrape)
> **Repositorio actual**: <https://github.com/omagallanes/p-database>
> **Despliegue**: producción en Vercel + Neon.tech PostgreSQL
> **Versión del manual**: 1.0 — redactado y verificado contra el código del repositorio el 7 de agosto de 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos previos](#2-requisitos-previos)
3. [Obtención del código](#3-obtención-del-código)
4. [Instalación de dependencias](#4-instalación-de-dependencias)
5. [Configuración de entorno](#5-configuración-de-entorno)
6. [Base de datos](#6-base-de-datos)
7. [Ejecución en desarrollo](#7-ejecución-en-desarrollo)
8. [Pruebas](#8-pruebas)
9. [Despliegue en producción](#9-despliegue-en-producción)
10. [Errores conocidos y soluciones](#10-errores-conocidos-y-soluciones)
11. [Guía de referencia rápida](#11-guía-de-referencia-rápida)

**Apéndices**

- [Apéndice A. Rutas de la aplicación y puntos de conexión de la API](#apéndice-a-rutas-de-la-aplicación-y-puntos-de-conexión-de-la-api)
- [Apéndice B. Modelos de datos de Prisma](#apéndice-b-modelos-de-datos-de-prisma)

---

## 1. Introducción

### 1.1 Qué es la aplicación

**biblioteca-de-prompts** es una aplicación web de pila completa (full-stack) para la gestión y la organización de mensajes dirigidos a inteligencias artificiales, conocidos como *prompts*. La aplicación permite crear, editar, eliminar, duplicar, marcar como favoritos, compartir, exportar e importar mensajes, así como organizarlos mediante categorías jerárquicas, etiquetas, plataformas, casos de uso, clientes o proyectos, modelos sugeridos y lenguajes. También registra el número de usos de cada mensaje y la fecha del último uso.

La aplicación actual es un **tenedor (fork)** del repositorio `YellowBerry007/prompt-database`, cuyo autor original es Berry (@ Yellowgrape). El tenedor lo desarrolla **PáginaVIVA** y se aloja en el repositorio <https://github.com/omagallanes/p-database>. El proyecto en Vercel conserva el nombre histórico `prompt-database`.

### 1.2 Advertencia importante sobre el modelo de desarrollo

Este proyecto **no dispone de entorno local de desarrollo**. Todo el desarrollo se ejecuta directamente en producción. Esta afirmación no es una opinión: está escrita en la cabecera del archivo `.env.example` del repositorio (texto textual: «NO HAY ENTORNO LOCAL DE DESARROLLO. Todo el desarrollo se ejecuta directamente en PRODUCTION (Vercel + Neon.tech PostgreSQL)»). Las variables de entorno de producción se configuran en el panel de Vercel (Vercel Dashboard), en la sección Project → Settings → Environment Variables.

Esto significa que, aunque los capítulos de este manual expliquen también cómo ejecutar la aplicación en un equipo local (porque la base de código lo permite), el flujo de trabajo oficial y verificado del proyecto es el siguiente:

1. Se modifican los archivos en el equipo de trabajo.
2. Se ejecuta el conjunto de pruebas localmente (`npm test`).
3. Se confirman los cambios con `git commit` y se suben con `git push origin main`.
4. Se despliega manualmente con la interfaz de línea de comandos de Vercel (`vercel deploy --prod`).
5. La verificación funcional se realiza contra la URL de producción.

**Consejo práctico**: cualquier cambio que se pruebe únicamente en local se considera no verificado hasta que se despliegue en producción y se compruebe allí.

### 1.3 Arquitectura general

La aplicación sigue el modelo de renderizado del servidor de Next.js con App Router:

- **Interfaz**: componentes de React con TailwindCSS y el conjunto de componentes shadcn/ui.
- **Rutas de servidor**: el directorio `app/` contiene las páginas (Server Components) y los puntos de conexión de la API (Route Handlers) dentro de `app/api/`.
- **Capa de datos**: el ORM Prisma conecta con PostgreSQL. La base de datos de producción se aloja en Neon.tech.
- **Autenticación**: NextAuth.js (versión 5, en beta) con proveedor de credenciales (correo electrónico y contraseña), sesiones con estrategia JWT y adaptador de Prisma. Incluye endurecimiento de seguridad propio: bloqueo por intentos fallidos (cinco fallos producen un bloqueo de quince minutos), bloqueo por dirección IP, revocación de sesiones mediante `tokenVersion` y control de usuarios activos o inactivos.
- **Internacionalización**: next-intl, con dos idiomas activos: inglés británico (`en-GB`) y español de España (`es-ES`).
- **Validación**: Zod para los esquemas de validación de los formularios y de los puntos de conexión de la API.

### 1.4 Pila tecnológica (versiones verificadas en `package.json`)

| Categoría | Tecnología | Versión en el repositorio |
|---|---|---|
| Framework | Next.js (App Router) | `^14.2.35` |
| Lenguaje | TypeScript | `^5.5.4` |
| Interfaz | React / React DOM | `^18.3.1` |
| Estilos | TailwindCSS | `^3.4.7` |
| Componentes de interfaz | shadcn/ui sobre @radix-ui (dialog, dropdown-menu, label, select, slot, tabs) | Radix `^1.1.x` según `package.json` |
| Iconos | lucide-react | `^0.427.0` |
| ORM | Prisma (cliente y CLI) | `^5.19.1` |
| Base de datos | PostgreSQL (producción: Neon.tech) | No aplica versión en el código |
| Autenticación | next-auth | `^5.0.0-beta.31` |
| Adaptador de autenticación | @auth/prisma-adapter | `^2.11.2` |
| Internacionalización | next-intl | `^4.13.5` |
| Validación | zod | `^3.23.8` |
| Contraseñas | bcryptjs | `^3.0.3` |
| Notificaciones | sonner | `^1.7.0` |
| Pruebas | Jest, @testing-library/react, jest-environment-jsdom | `^29.7.0`, `^16.0.0`, `^29.7.0` |
| Linter | ESLint y eslint-config-next | `^8.57.1`, `^14.2.5` |
| Ejecutor de TypeScript para scripts | tsx | `^4.16.2` |
| Utilidades de estilo | class-variance-authority, tailwind-merge, clsx, tailwindcss-animate | `^0.7.0`, `^2.5.2`, `^2.1.1`, `^1.0.7` |

Notas verificadas:

- `package.json` no declara el campo `engines`. El requisito de Node.js proviene del archivo `README.md`, que indica «Node.js 20 or higher» (Node.js 20 o superior).
- El entorno de desarrollo verificado en el que se redactó este manual ejecuta Node.js `v24.14.0` y npm `11.9.0`. La guía de despliegue del repositorio (`docs/guide/deployment.md`) recomienda seleccionar Node.js 24.x (o la versión estable más reciente) en la configuración del proyecto de Vercel.
- `next.config.js` declara `output: "standalone"`, `reactStrictMode: true` y un límite de tamaño de cuerpo para Server Actions de 2 MB (`experimental.serverActions.bodySizeLimit: "2mb"`).

### 1.5 Estructura de directorios (verificada en el repositorio)

```
p-database/
├── app/                    # Rutas de la aplicación (App Router)
│   ├── (app)/              #   Secciones protegidas: prompts, categories, tags,
│   │                       #   taxonomy (siete páginas), shared, auth/profile
│   ├── (auth)/             #   Páginas públicas de autenticación: signin, signup, error
│   └── api/                #   Puntos de conexión de la API (Route Handlers)
├── components/             # Componentes de interfaz
│   ├── auth/               #   Sesión y formularios de autenticación
│   ├── layout/             #   Barra superior y barra lateral
│   ├── profile/            #   Perfil de usuario (pestañas)
│   ├── prompt/             #   Formulario, listado y filtros de mensajes
│   ├── shared/             #   Mensajes compartidos
│   ├── taxonomy/           #   Gestión de catálogos (taxonomía)
│   └── ui/                 #   Componentes shadcn/ui
├── contexts/               # Contextos de React (UIContext: tema, columnas, preferencias)
├── i18n/                   # Configuración de idiomas (locales.ts, request.ts)
├── lib/                    # Prisma, autenticación, utilidades
├── messages/               # Catálogos de traducción (es-ES.json, en-GB.json)
├── prisma/                 # Esquema, semilla y script de migración de datos
├── tests/                  # Pruebas Jest (api, components, i18n, unit)
├── types/                  # Tipos compartidos de TypeScript
├── .env.example            # Referencia de variables de entorno (no contiene valores reales)
├── next.config.js          # Configuración de Next.js (con plugin de next-intl)
├── vercel.json             # Configuración de despliegue de Vercel
├── jest.config.js          # Configuración de Jest (con umbrales de cobertura)
└── jest.setup.js           # Preparación del entorno de pruebas (simulaciones de next-auth)
```

### 1.6 Funcionalidades principales (verificadas)

- Creación, edición, eliminación, duplicación y copiado al portapapeles de mensajes.
- Organización mediante categorías jerárquicas (relación de árbol con padre e hijos) y etiquetas.
- Filtrado por categoría, etiquetas, plataforma, estado, lenguaje, casos de uso, clientes o proyectos y modelos, además de la vista de favoritos.
- Búsqueda de texto completo sobre el título, la descripción y el cuerpo del mensaje.
- Registro de uso (contador de usos y fecha del último uso) al copiar un mensaje.
- Exportación e importación en formato JSON (la exportación produce formato versión 2.0 con relaciones N:M como matrices; la importación acepta tanto la versión 2.0 como la versión 1.0 heredada).
- Aislamiento por usuario: cada usuario ve exclusivamente sus propios mensajes (la lista, la búsqueda, los filtros, el detalle, el uso, la exportación y la importación filtran por propietario). Los mensajes ajenos devuelven un error 404 para no revelar su existencia.
- Compartir mensajes: la página `/shared` muestra los mensajes compartidos por **otros** usuarios; el detalle es de solo lectura y permite copiar (lo que incrementa el contador de uso).
- Gestión de usuarios por parte del administrador: alta, edición, desactivación y eliminación. No se puede desactivar ni eliminar al último administrador activo.
- Personalización de la cuenta: idioma, tema claro u oscuro, color de acento, orden de los filtros y columnas del listado.
- Internacionalización con dos idiomas activos: inglés británico y español de España.

### 1.7 Sobre el archivo README.md del repositorio

El archivo `README.md` conserva contenido del tenedor original y **no debe tomarse como referencia fiable** para este proyecto. Entre los desajustes verificados se encuentran:

- Menciona un archivo `docs/index.md` que no existe en el repositorio (existe `docs/README.md` en su lugar).
- Menciona `DOCKER.md` y `DEPLOYMENT.md`, archivos que no existen.
- Describe una base de datos SQLite local (`file:./dev.db`), un flujo que contradice el aviso de `.env.example` sobre la inexistencia de entorno local.
- Contiene un fragmento de documentación en neerlandés en la sección de Docker.

Este manual, en cambio, se redactó verificando el código real del repositorio.

---

## 2. Requisitos previos

Antes de comenzar, confirme que dispone de todo lo siguiente:

### 2.1 Node.js 20 o superior

La aplicación requiere **Node.js 20 o superior** (requisito declarado en el `README.md` del repositorio; el proyecto se desarrolló y verificó con Node.js 24.x). Puede comprobar la versión instalada con:

```bash
node --version
```

Si no tiene Node.js instalado o su versión es inferior a la 20, instale la versión LTS más reciente desde el sitio oficial <https://nodejs.org>.

> **Advertencia**: `package.json` no define el campo `engines`, de modo que Node.js no rechaza versiones inferiores por sí mismo. Si usa una versión inferior a la 20, la compilación puede fallar o comportarse de forma inesperada. No arriesgue: use la 20 o una versión superior.

### 2.2 Gestor de paquetes

El repositorio contiene el archivo `package-lock.json`, por lo que el gestor recomendado es **npm** (se instala junto con Node.js). Los comandos de este manual usan `npm` exclusivamente. El `README.md` original menciona también `yarn` y `pnpm` como alternativas, pero no existe evidencia de que se hayan usado en este proyecto; si los usa, tenga en cuenta que los scripts de `package.json` están definidos de forma agnóstica y deberían funcionar con cualquier gestor.

### 2.3 Git

Necesita `git` para clonar el repositorio y para confirmar y subir los cambios. Compruebe su instalación con:

```bash
git --version
```

### 2.4 Cuenta de Vercel con acceso al proyecto

- Una cuenta en <https://vercel.com>.
- Acceso al proyecto `prompt-database` (este es el nombre que conserva el proyecto en Vercel), bajo el equipo del usuario `omagallanes`.
- Rol mínimo necesario: **Developer** (desarrollador) o superior dentro del equipo.

### 2.5 Base de datos PostgreSQL (Neon.tech)

- Una cuenta en <https://neon.tech> con una base de datos PostgreSQL creada para el proyecto.
- De ella obtendrá dos cadenas de conexión: una con *pooling* (agrupación de conexiones) para `DATABASE_URL` y otra sin *pooling* para `DATABASE_URL_UNPOOLED` (véase la Parte 5).

### 2.6 Interfaz de línea de comandos de Vercel (CLI de Vercel)

Se usa para desplegar manualmente y para consultar registros y despliegues. Instalación global:

```bash
npm install -g vercel
```

Compruebe la instalación:

```bash
vercel --version
```

> **Nota verificada**: la guía interna del proyecto (`docs/guide/deployment.md`) documenta el uso de la **Vercel CLI 56.x**. Versiones muy distintas pueden cambiar comandos o parámetros. Si el comportamiento difiere del descrito en este manual, consulte la documentación oficial de Vercel.

### 2.7 Utilidad openssl

Se necesita para generar el secreto de autenticación `AUTH_SECRET` (Parte 5). En sistemas con Windows, puede usar WSL (Subsistema de Windows para Linux) o el comando equivalente de Git Bash.

### 2.8 Herramientas recomendadas (no obligatorias)

El repositorio incluye una configuración de contenedor de desarrollo (`.devcontainer/devcontainer.json`) que sugiere las extensiones de Visual Studio Code `dbaeumer.vscode-eslint` (ESLint), `bradlc.vscode-tailwindcss` (Tailwind CSS) y `Prisma.prisma` (Prisma). Su uso facilita el trabajo, pero no es imprescindible.

---

## 3. Obtención del código

### 3.1 Clonación del repositorio

Abra una terminal y ejecute:

```bash
git clone https://github.com/omagallanes/p-database.git
cd p-database
```

> **Advertencia**: no existe una ruta de instalación alternativa. El proyecto no se distribuye como paquete; la única forma de obtener el código es la clonación del repositorio de Git.

### 3.2 Ramas del repositorio

El repositorio contiene, como mínimo, las siguientes ramas:

| Rama | Propósito |
|---|---|
| `main` | Rama de producción. Tras el cambio de versión (cutover) documentado en `docs/planning/main-version-2-cutover.md`, toda la funcionalidad se integra aquí y desde aquí se despliega. |
| `version-2` | Rama histórica de la versión anterior. No se utiliza para el desarrollo actual. |

Puede ver las ramas locales y remotas con:

```bash
git branch -a
```

### 3.3 Verificación de la clonación

Después de clonar, verifique que todo está en orden:

```bash
# Ubicación y estado del repositorio
git status

# Versiones de las herramientas
node --version
npm --version
```

### 3.4 Notas sobre el contenido del repositorio

- El archivo `.env` que pueda existir en un clon de trabajo **no se versiona** (está en `.gitignore`) y contiene tokens reales. No lo comparta ni lo suba a Git.
- El directorio `.vercel/` tampoco se versiona; contiene la vinculación local con el proyecto de Vercel (Parte 9).
- El directorio `prisma/migrations/` **no existe en el repositorio** y está excluido por `.gitignore` (línea 41). Las migraciones se regeneran localmente (Parte 6).
- El directorio `docs/` está excluido del control de versiones según `.gitignore` (línea 45), aunque en la práctica algunos archivos de `docs/` sí están presentes en el repositorio; trate su contenido como documentación interna no oficial.
- Rutas con paréntesis como `app/(app)/prompts/page.tsx` deben pasarse **siempre entre comillas** a los comandos de Git; sin comillas, la terminal interpreta los paréntesis como sintaxis de la propia terminal (véase el error conocido número 13 de la Parte 10).

---

## 4. Instalación de dependencias

### 4.1 Comando de instalación

Desde la raíz del repositorio (`/workspaces/p-database` o el directorio en el que lo haya clonado), ejecute:

```bash
npm install
```

Este comando instala todas las dependencias declaradas en `package.json` (dependencias de ejecución y dependencias de desarrollo).

### 4.2 Instalación reproducible con npm ci

El repositorio contiene el archivo `package-lock.json`, que fija las versiones exactas. En entornos de integración continua o cuando se desea una instalación idéntica a la verificada, puede usar:

```bash
npm ci
```

### 4.3 Qué ocurre durante la instalación

El script `postinstall` de `package.json` está definido como `prisma generate`. Por tanto, **al terminar la instalación, Prisma genera automáticamente el cliente de Prisma** (los tipos y las funciones de acceso a datos) a partir de `prisma/schema.prisma`. Esto significa que, después de `npm install`, el cliente de Prisma ya está disponible y no hace falta ejecutar manualmente `npm run db:generate` (aunque el comando existe y puede usarse en cualquier momento).

### 4.4 Verificación de la instalación

Compruebe que el cliente de Prisma se generó correctamente:

```bash
ls node_modules/.prisma/client  # debe existir el cliente generado
npm run db:generate             # regenera el cliente de forma explícita (opcional)
```

> **Advertencia**: si `npm install` termina con errores relacionados con Prisma (por ejemplo, «Client not found» o fallos de descarga de motores), la causa más frecuente es una red restringida o una versión de Node.js no compatible. Reintente con `npm ci` y, si el problema persiste, abra el registro de errores de la Parte 10.

### 4.5 Errores típicos de la instalación

- **«Prisma Client not found»**: significa que `prisma generate` no se ejecutó (por ejemplo, porque se saltó el script `postinstall` o porque la instalación se interrumpió). Solución: ejecute `npm run db:generate`.
- **Problemas de OpenSSL en el despliegue**: el esquema declara objetivos de binario (`binaryTargets`) para varios entornos; si el despliegue falla por la versión de OpenSSL, consulte el error conocido número 8 de la Parte 10.

---

## 5. Configuración de entorno

### 5.1 Principio rector: no existe entorno local de desarrollo

El archivo `.env.example` es la única fuente autorizada sobre las variables de entorno. Su cabecera es explícita y conviene citarla completa:

> «NO HAY ENTORNO LOCAL DE DESARROLLO. Todo el desarrollo se ejecuta directamente en PRODUCTION (Vercel + Neon.tech PostgreSQL). Las variables de producción se configuran en Vercel Dashboard: Vercel → Project → Settings → Environment Variables. Este archivo .env.example es solo referencia de las variables que Vercel provee automáticamente. NO pongas valores reales aquí — este archivo se versiona.»

Por tanto:

1. **No cree un archivo `.env` local con valores de producción** salvo que sepa exactamente lo que hace (por ejemplo, para ejecutar migraciones de Prisma contra la base de datos de Neon desde su equipo, véase la Parte 6).
2. **Las variables reales de producción viven en el panel de Vercel**, nunca en el repositorio.
3. El archivo `.env` del equipo de trabajo (no versionado) puede contener tokens de despliegue como `VERCEL_TOKEN`; no los comparta.

### 5.2 Explicación de cada variable

A continuación se explica cada variable que aparece en `.env.example`, más las variables que el código del repositorio requiere y que no están documentadas en el ejemplo (señaladas como pendientes de verificación).

#### 5.2.1 Variables de la base de datos

| Variable | Descripción | Origen |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL con *pooling* (agrupación de conexiones). La usa Prisma en tiempo de ejecución. Formato: `postgresql://usuario:contrasena@host-pooler.región.neon.tech/nombre_bd?sslmode=require` | Panel de Neon.tech → Connection Details → pooled connection |
| `DATABASE_URL_UNPOOLED` | Cadena de conexión de PostgreSQL **sin** *pooling*. Se recomienda para ejecutar migraciones de Prisma. Formato: `postgresql://usuario:contrasena@host.región.neon.tech/nombre_bd?sslmode=require` | Panel de Neon.tech → Connection Details → direct connection |

> **Advertencia verificada**: la base de datos del esquema Prisma es `postgresql` (datasource `db` en `prisma/schema.prisma`, con `provider = "postgresql"` y `url = env("DATABASE_URL")`). El proyecto **no** usa SQLite en producción; las menciones a `file:./dev.db` pertenecen al `README.md` heredado del tenedor original y no son aplicables.

#### 5.2.2 Variables de autenticación

| Variable | Descripción | Origen |
|---|---|---|
| `AUTH_SECRET` | Secreto de NextAuth.js que firma las sesiones JWT. **Debe generarse** con el comando `openssl rand -base64 32`; el valor de ejemplo no funciona en producción | Generación propia |
| `AUTH_URL` | Dirección base de la aplicación en producción. En el ejemplo figura `https://prompt-database-liard.vercel.app` | Vercel (alias de producción) |

> **Advertencia verificada**: el valor `https://prompt-database-liard.vercel.app` es el que aparece en `.env.example` y en la guía interna de despliegue. Compruebe siempre el alias de producción actual en el panel de Vercel antes de confiarlo; los alias pueden cambiar.

> **Nota verificada**: la guía interna `docs/guide/deployment.md` menciona también los alias `NEXTAUTH_SECRET` y `NEXTAUTH_URL` como equivalentes de `AUTH_SECRET` y `AUTH_URL`. En el código del repositorio (lib/auth.ts) solo se lee `AUTH_SECRET`; si define ambos, manténgalos con el mismo valor para evitar confusiones.

#### 5.2.3 Variables del proceso de semilla (seed)

| Variable | Descripción | Origen |
|---|---|---|
| `SEED_ADMIN_PASSWORD` | Contraseña en claro que el script de semilla `prisma/seed.ts` codifica con bcrypt para la cuenta de administrador (`server@paginaviva.net`) | Configuración propia (véase la Parte 6) |
| `SEED_USER_PASSWORD` | Contraseña en claro que el script de semilla codifica para la cuenta de usuario (`chamed@paginaviva.net`) | Configuración propia (véase la Parte 6) |

> **Pendiente de verificación**: estas dos variables **no aparecen en `.env.example`**. Su existencia está verificada en el código (`prisma/seed.ts` las lee con `process.env` y el script termina con error si faltan), pero no están documentadas en el ejemplo del repositorio. Si ejecuta la semilla, defina ambas variables en el entorno desde el que la ejecute (o en Vercel si la ejecuta allí). El script **no admite valores por defecto**: si faltan, lanza un error explícito y no crea usuarios.

#### 5.2.4 Variables opcionales de la aplicación

| Variable | Descripción | Origen |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | Ruta base para desplegar la aplicación en una subcarpeta. Si se define, `next.config.js` aplica `basePath` y `assetPrefix` con ese valor. Si queda vacía, la aplicación se sirve desde la raíz | Opcional, solo si se necesita un despliegue en subcarpeta |

#### 5.2.5 Variables que Vercel asigna automáticamente

| Variable | Descripción |
|---|---|
| `VERCEL` | Se define con el valor `1` durante los despliegues de Vercel. Indica que la aplicación se ejecuta en Vercel |
| `VERCEL_ENV` | Entorno del despliegue: `production`, `preview` o `development` |
| `VERCEL_URL` | Dirección del despliegue (por ejemplo, `prompt-database-liard.vercel.app`) |
| `VERCEL_OIDC_TOKEN` | Token OIDC que se genera automáticamente al ejecutar `vercel link` (véase la Parte 9) |

No las defina manualmente en el panel de Vercel; la plataforma las inyecta durante el despliegue.

#### 5.2.6 Variables locales del equipo de trabajo (no van en Vercel)

| Variable | Descripción |
|---|---|
| `VERCEL_TOKEN` | Token de acceso personal de Vercel para desplegar desde la interfaz de línea de comandos. Empieza por `vcp_`. Se genera en Vercel Dashboard → Account → Tokens, **desde la cuenta personal y no desde un equipo** (véase la Parte 9). Se pasa al comando como variable de entorno inline: `VERCEL_TOKEN="vcp_..." vercel deploy --prod` |

### 5.3 Reglas de seguridad de las variables de entorno

1. **Nunca** confirme en Git archivos `.env`, `.env.local` ni variantes (`.gitignore` los excluye en las líneas 31 a 36 y 77).
2. El archivo `.env.example` se versiona, por lo que **no debe contener valores reales**; únicamente comentarios y plantillas.
3. Si un valor real queda expuesto en el historial de Git (ocurrió con las contraseñas de la semilla; véase el error conocido número 15 de la Parte 10), **rote las credenciales afectadas** y considere reescribir el historial si el repositorio es privado.
4. El equipo de trabajo mantiene un archivo `.env` local con tokens reales (por ejemplo, `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`). Trátelo como un secreto y no lo comparta por canales inseguros.

---

## 6. Base de datos

### 6.1 Motor de base de datos

El esquema Prisma declara un solo origen de datos:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

En producción, `DATABASE_URL` apunta a la base de datos de **Neon.tech PostgreSQL**. El esquema declara objetivos de binario multiplataforma:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x", "debian-openssl-3.0.x"]
}
```

Estos objetivos garantizan que el cliente de Prisma generado funcione en el entorno de Vercel (Linux con OpenSSL 3.0.x).

### 6.2 El esquema Prisma

El archivo `prisma/schema.prisma` define **21 modelos**. Se agrupan así:

| Grupo | Modelos | Propósito |
|---|---|---|
| Usuarios y sesiones | `User`, `IpAttempt`, `Account`, `Session`, `VerificationToken` | Cuentas, autenticación, bloqueos por IP y sesiones de NextAuth |
| Mensajes | `Prompt` | El mensaje en sí (título, descripción, cuerpo, tipo, plataforma, estado, lenguaje, favorito, compartido, versión, contador de uso, notas y otros campos) |
| Taxonomía de mensajes | `Category`, `Tag`, `Platform`, `ClientProject`, `UseCase`, `ModelHint` | Entidades de clasificación con nombre, identificador (`slug`) y orden |
| Tablas puente N:M | `PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint` | Relaciones muchos a muchos entre `Prompt` y la taxonomía. **Todas usan `onDelete: Cascade` en ambas claves externas** |
| Catálogos de administración | `Type`, `Status`, `Language` | Valores permitidos de tipo, estado y lenguaje que gestiona el administrador en las páginas de taxonomía. Se siembran con la semilla (Parte 6.6). Los mensajes conservan su tipo, estado y lenguaje como cadenas de texto; los catálogos definen los valores que ofrecen el formulario y los filtros. Eliminar un valor de catálogo **no** toca los mensajes existentes (simple desvinculación) |

Puntos destacados del modelo `User` (relacionados con la seguridad, todos verificados en el esquema):

- `role` con valor por defecto `"user"` (el administrador se asigna mediante la semilla o la gestión de usuarios).
- `isActive` con valor por defecto `true`; los usuarios inactivos no pueden iniciar sesión.
- `failedLoginAttempts` y `lockoutUntil`: cinco intentos fallidos producen un bloqueo de quince minutos.
- `tokenVersion`: al cambiar la contraseña o desactivar un usuario, este número aumenta y **todos los JWT emitidos con anterioridad quedan revocados**.
- `promptListViewPreference` (vista de tarjetas o de tabla) y `uiPreferences` (preferencias de interfaz en JSON).

El modelo `IpAttempt` registra los intentos fallidos por dirección IP, deliberadamente desacoplado de cualquier cuenta para que una IP bloqueada no pueda usarse para bloquear cuentas ajenas.

### 6.3 El historial de migraciones no está en el repositorio

**Dato crítico verificado**: el directorio `prisma/migrations/` **no existe en el repositorio** y está excluido por `.gitignore` (línea 41, comentario «Migraciones de Prisma (regenerables)»). Las consecuencias son:

1. En un clon nuevo **no hay migraciones aplicables**; hay que crearlas.
2. No existe historial de migraciones visible en las solicitudes de extracción (pull requests).
3. En producción, la base de datos ya está creada con las tablas; las nuevas migraciones que genere un desarrollador deben aplicarse con cuidado (véase la Parte 6.5).

### 6.4 Generación del cliente de Prisma

El cliente se genera automáticamente con `postinstall` durante `npm install`. Para regenerarlo manualmente en cualquier momento:

```bash
npm run db:generate
```

(Equivalente a `npm run prisma:generate`, definido como `prisma generate`.)

### 6.5 Creación y aplicación de migraciones

En un clon nuevo, la base de datos de destino ya contiene las tablas, pero el historial de migraciones no existe localmente. Los comandos disponibles, todos verificados en `package.json`, son:

| Script | Comando equivalente | Uso |
|---|---|---|
| `npm run db:migrate` | `prisma migrate dev` | Crea una nueva migración a partir de los cambios del esquema y la aplica. En un clon nuevo sin historial, es el comando que regenera la migración inicial |
| `npm run prisma:migrate` | `prisma migrate dev` | Idéntico al anterior (alias) |
| `npm run db:push` | `prisma db push` | Sincroniza el esquema con la base de datos **sin** crear archivos de migración. Adecuado para desarrollo rápido, no para producción |
| `npx prisma migrate deploy` | — | Aplica las migraciones pendientes sin crear nuevas. Es la opción recomendada para producción cuando existe historial de migraciones |

**Procedimiento recomendado en un clon nuevo** (los pasos concretos contra producción están pendientes de verificación; véase la nota al final de esta sección):

```bash
# 1. Generar el cliente
npm run db:generate

# 2. Crear y aplicar la migración inicial (con un nombre descriptivo)
npx prisma migrate dev --name init

# 3. Verificar la base de datos con el explorador visual
npm run prisma:studio
```

> **Pendiente de verificación**: el procedimiento exacto de migraciones contra la base de datos de producción (por ejemplo, si se usa `prisma migrate deploy` dentro del despliegue de Vercel o si se ejecutan `prisma migrate dev` desde un equipo apuntando a `DATABASE_URL_UNPOOLED`) no está documentado en el repositorio. Antes de modificar el esquema en producción, documente y pruebe el flujo elegido en una base de datos de ensayo (staging).

### 6.6 Semilla de datos (seed)

El script `prisma/seed.ts` se ejecuta con:

```bash
npm run db:seed
```

(Equivalente a `npm run prisma:seed`, definido como `tsx prisma/seed.ts`; el campo `prisma.seed` de `package.json` también lo declara.)

**Requisitos verificados**:

- Debe definir previamente las variables `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD` en el entorno. Si faltan, el script lanza un error y termina con código de salida 1. No hay valores por defecto.

**Qué hace exactamente (verificado en `prisma/seed.ts`)**:

1. Crea o actualiza (mediante `upsert`) la cuenta de administrador con correo electrónico `server@paginaviva.net`, nombre «Administrador» y rol `admin`.
2. Crea o actualiza la cuenta de usuario con correo electrónico `chamed@paginaviva.net`, nombre «Usuario» y rol `user`.
3. Siembra el catálogo `Type` con tres valores: System, User y Tool.
4. Siembra el catálogo `Status` con tres valores: Draft, Tested y Production.
5. Siembra el catálogo `Language` con doce valores: English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese, Chinese y Korean.
6. Imprime un resumen en la consola y desconecta el cliente de Prisma.

El script es **idempotente**: puede ejecutarse varias veces y el resultado no cambia (usa `upsert` por correo electrónico en los usuarios y por identificador en los catálogos).

> **Advertencia de seguridad verificada**: las versiones antiguas de `prisma/seed.ts` contenían contraseñas reales codificadas en el historial de Git. Desde el 6 de agosto de 2026 el script solo lee las contraseñas de las variables de entorno, pero **las contraseñas antiguas siguen visibles en el historial**. Si alguna vez se ejecutó la semilla antigua, rote las contraseñas de las cuentas afectadas en producción.

### 6.7 Script de migración de datos históricos

El repositorio incluye `prisma/migrate-data.ts`, ejecutable con:

```bash
npm run db:migrate-data
```

(Definido como `tsx prisma/migrate-data.ts`.)

Este script transforma los campos de cadena de texto de los mensajes (`platform`, `useCase`, `clientOrProject`, `modelHint`) en relaciones muchos a muchos (`PromptPlatform`, `PromptUseCase`, `PromptClientProject`, `PromptModelHint`). Es idempotente (usa `upsert`) y atómico (usa `$transaction`). Se utilizó en su momento para la migración del esquema antiguo al actual; **no es necesario ejecutarlo en instalaciones nuevas**.

### 6.8 Explorador de la base de datos

Prisma Studio ofrece una interfaz visual para consultar y editar los datos:

```bash
npm run prisma:studio
```

Se abre en el navegador (habitualmente en <http://localhost:5555>). Úsela con prudencia: cualquier cambio es inmediato y definitivo.

### 6.9 Advertencias sobre el borrado en cascada

Todas las tablas puente (`PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint`) usan `onDelete: Cascade` en **ambas** claves externas:

- Borrar un mensaje elimina automáticamente todas sus relaciones de clasificación.
- Borrar una etiqueta (o categoría, plataforma u otra entidad similar) elimina automáticamente la asociación de **todos** los mensajes con esa entidad.

Esta operación **no tiene vuelta atrás sin copia de seguridad**. Antes de borrar entidades de taxonomía, exporte los mensajes en JSON (la aplicación ofrece la exportación) o realice una copia de seguridad de la base de datos en Neon.

---

## 7. Ejecución en desarrollo

### 7.1 Servidor de desarrollo

Desde la raíz del repositorio:

```bash
npm run dev
```

Este comando ejecuta `next dev` y arranca el servidor de desarrollo. La aplicación queda disponible en <http://localhost:3000>.

### 7.2 Registro de usuarios y acceso

- El registro público está disponible en la ruta `/auth/signup`.
- El inicio de sesión se realiza en `/auth/signin`.
- La ruta `/auth/error` está declarada como pública en el middleware y en la configuración de NextAuth, pero **la página no existe** en el repositorio (véase el error conocido número 3 de la Parte 10).
- La cuenta de administrador se obtiene mediante la semilla (Parte 6.6); el registro público siempre crea usuarios con rol `user`.

### 7.3 Protección de rutas

El archivo `middleware.ts` protege toda la aplicación salvo las rutas públicas (`/auth/signin`, `/auth/signup`, `/auth/error`) y los recursos estáticos:

- Un visitante sin sesión que intente acceder a una ruta protegida es redirigido a `/auth/signin`.
- Un usuario con sesión iniciada que visite una ruta pública es redirigido a la raíz `/`.
- El matcher excluye además `/api`, `/_next/static`, `/_next/image` y `favicon.ico`.

### 7.4 Linter

Para comprobar el estilo del código:

```bash
npm run lint
```

Este comando ejecuta `next lint` (ESLint con la configuración `next/core-web-vitals` y `eslint-config-prettier`). El aviso de la regla `react/no-unescaped-entities` está configurado como advertencia (warn) en este proyecto (véase el error conocido número 5 de la Parte 10).

### 7.5 Compilación de tipos

Para comprobar los tipos de TypeScript sin generar nada:

```bash
npx tsc --noEmit
```

> **Advertencia verificada**: este comando puede mostrar errores en archivos de prueba preexistentes (por ejemplo, `tests/api/export.test.ts` o `tests/components/PromptFilters.test.tsx`). La compilación de Vercel no revisa los archivos de prueba, de modo que esos errores no bloquean el despliegue. Solo son preocupantes los errores en los archivos que usted modifica.

### 7.6 Compilación y ejecución en modo producción (local)

La compilación de producción se ejecuta con:

```bash
npm run build
```

Y el servidor de producción resultante con:

```bash
npm start
```

> **Nota**: el flujo oficial del proyecto no mantiene un entorno local de producción; estos comandos sirven para validar la compilación antes de desplegar. El propio despliegue de Vercel ejecuta su propia compilación en la nube.

---

## 8. Pruebas

### 8.1 Ejecución del conjunto de pruebas

El proyecto usa Jest. Para ejecutar todas las pruebas una sola vez:

```bash
npm test
```

Este comando ejecuta `jest` con la configuración de `jest.config.js`. Para ejecutarlas en modo de vigilancia (se reejecutan al guardar cambios):

```bash
npm run test:watch
```

### 8.2 Estado verificado del conjunto de pruebas

Según el informe de cobertura interno (`docs/informe-cobertura.md`, actualizado el 6 de agosto de 2026):

- **388 pruebas en 40 suites** en la segunda medición (314 pruebas en 33 suites en la primera).
- Cobertura de líneas: **79,61 %** (objetivo cumplido: al menos el 70 %).
- El umbral de cobertura está fijado en `jest.config.js`: líneas 75, funciones 60, sentencias 72 y ramas 60. **Si una medición queda por debajo de estos umbrales, el conjunto de pruebas falla**, de modo que la cobertura no puede degradarse sin que se note.

### 8.3 Medición de la cobertura

```bash
npm test -- --coverage
```

El informe detallado se genera en el directorio `coverage/`, que está excluido del control de versiones.

### 8.4 Estructura del directorio de pruebas

| Directorio | Contenido |
|---|---|
| `tests/api/` | Pruebas de los puntos de conexión de la API (autenticación, mensajes, catálogos, exportación, importación, usuarios, preferencias, compartidos) |
| `tests/components/` | Pruebas de componentes de interfaz con Testing Library (formulario de mensajes, filtros, listados, perfil, taxonomía, conmutadores, pestañas) |
| `tests/i18n/` | Pruebas de internacionalización (mensajes, locales, errores de la API, renderizado) |
| `tests/unit/` | Pruebas unitarias de utilidades (seguridad de autenticación, colores, preferencias de interfaz) |

### 8.5 Particularidades técnicas de las pruebas (verificadas)

1. **next-intl es un paquete exclusivo de módulos ES (ESM)**: la configuración de Jest (`jest.config.js`) sobrescribe `transformIgnorePatterns` después de `createJestConfig` para que SWC transforme `next-auth`, `@auth/core`, `@auth/prisma-adapter`, `next-intl`, `use-intl`, `intl-messageformat` y `@formatjs`. Sin esta sobrescritura, Jest no puede importar next-intl y todas las pruebas que lo usan fallan.
2. **`getTranslations` de `next-intl/server` no funciona en Jest**: lanza una excepción (es un código auxiliar que no está implementado para pruebas). Las pruebas de la API deben simular (mock) el módulo `next-intl/server` usando los catálogos reales de `messages/`.
3. **next-auth está simulado globalmente**: `jest.setup.js` simula `next-auth`, `next-auth/providers/credentials` y `@auth/prisma-adapter`. Si una prueba necesita el comportamiento real, debe redefinir la simulación dentro de la propia prueba.
4. **El entorno de pruebas es jsdom**: `jest-environment-jsdom` está configurado en `jest.config.js`, lo que permite probar componentes de React.

---

## 9. Despliegue en producción

### 9.1 Arquitectura del despliegue

```
Equipo de trabajo (rama main)
       ↓
  git push origin main
       ↓
  VERCEL_TOKEN + vercel deploy --prod
       ↓
  Compilación en Vercel (npm install → prisma generate → next build)
       ↓
  Producción: alias de Vercel (actualmente prompt-database-liard.vercel.app)
```

Puntos clave, verificados en `vercel.json` y en la guía interna `docs/guide/deployment.md`:

- **El despliegue automático desde la rama `main` está deshabilitado a propósito**. La propiedad `git.deploymentEnabled.main: false` de `vercel.json` lo impide; los despliegues se hacen manualmente desde `main`.
- La plataforma es Vercel (plan Hobby) y la base de datos, Neon.tech PostgreSQL.
- El proyecto en Vercel conserva el nombre `prompt-database` (verificado en `.vercel/project.json` del equipo de trabajo: `projectName: "prompt-database"`).

### 9.2 El archivo vercel.json

El archivo `vercel.json` de la raíz del repositorio contiene:

```json
{
  "experimentalServices": {
    "web": {
      "routePrefix": "/",
      "framework": "nextjs"
    }
  },
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  }
}
```

| Propiedad | Función | ¿Se puede tocar? |
|---|---|---|
| `experimentalServices.web` | Configuración interna del servicio web de Vercel, generada automáticamente | No. No tocar |
| `git.deploymentEnabled.main: false` | Deshabilita el despliegue automático desde la rama `main` | No eliminar: el proyecto usa despliegue manual por diseño |

El archivo se **versiona** en Git (no está en `.gitignore`). No coloque secretos en él; para eso existen las variables de entorno del panel.

### 9.3 Configuración inicial del proyecto en Vercel

Si el proyecto se vincula por primera vez (o se recrea desde cero), los pasos son:

1. Entrar en <https://vercel.com/new>.
2. Importar el repositorio `omagallanes/p-database`.
3. Configuración recomendada (verificada en la guía interna):
   - Framework: Next.js (se detecta automáticamente).
   - Directorio raíz: `./` (la raíz del proyecto).
   - Comando de compilación: `npm run build` (el valor por defecto).
   - Directorio de salida: `.next` (el valor por defecto).
   - Versión de Node.js: 24.x (o la versión estable más reciente).
4. Configurar las variables de entorno (sección 9.5).
5. Desplegar.

Si el proyecto ya está vinculado, no hace falta repetir estos pasos: basta con `vercel link` en un clon nuevo (sección 9.4).

### 9.4 Vinculación local con Vercel

```bash
vercel link
```

Este comando crea el archivo `.vercel/project.json` con los identificadores `projectId` y `orgId` del proyecto. Pregunta a qué proyecto vincular: seleccione `prompt-database`.

> **Advertencia**: el directorio `.vercel/` está en `.gitignore` y no se sube al repositorio. Cada persona que despliegue debe ejecutar `vercel link` en su propio clon.

### 9.5 Variables de entorno de producción

Se configuran en **Vercel Dashboard → Project → Settings → Environment Variables** (entorno Production). Las variables necesarias son:

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | Cadena con *pooling* de Neon | Obligatoria |
| `DATABASE_URL_UNPOOLED` | Cadena sin *pooling* de Neon | Recomendada para migraciones |
| `AUTH_SECRET` | `openssl rand -base64 32` | Obligatoria. Generar un valor nuevo |
| `AUTH_URL` | `https://prompt-database-liard.vercel.app` (comprobar el alias actual) | Obligatoria |
| `SEED_ADMIN_PASSWORD` | Contraseña del administrador | Solo si se ejecuta la semilla en producción |
| `SEED_USER_PASSWORD` | Contraseña del usuario | Solo si se ejecuta la semilla en producción |

Vercel inyecta automáticamente `VERCEL`, `VERCEL_ENV` y `VERCEL_URL`; no las defina a mano. `VERCEL_OIDC_TOKEN` se genera al ejecutar `vercel link`.

### 9.6 Autenticación de la interfaz de línea de comandos

**Regla crítica verificada**: el token de Vercel debe crearse **desde la cuenta personal** y no desde un equipo. La guía interna documenta que la Vercel CLI 56.x **no acepta el parámetro `--token`** con tokens de ámbito personal; debe usarse la variable de entorno `VERCEL_TOKEN`:

```bash
# Correcto: variable de entorno
VERCEL_TOKEN="vcp_tu_token" vercel whoami

# Incorrecto: produce "token not valid"
vercel whoami --token "vcp_tu_token"
```

Pasos para crear el token:

1. Entrar en Vercel Dashboard → Settings → Tokens (<https://vercel.com/account/tokens>).
2. Asegurarse de estar en el contexto de la **cuenta personal** (no dentro de un equipo).
3. Crear un token con un nombre descriptivo (por ejemplo, `prompt-database-cli`).
4. Copiar el valor generado (empieza por `vcp_`).
5. Guardarlo en el archivo local `.env` del equipo de trabajo (no versionado) o pasarlo inline en cada comando.

Verificación:

```bash
VERCEL_TOKEN="vcp_tu_token" vercel whoami
VERCEL_TOKEN="vcp_tu_token" vercel project ls
```

### 9.7 Flujo completo de despliegue

1. **Preparación local**:

```bash
# Confirmar la rama
git branch            # debe mostrar: * main

# Confirmar el estado
git status

# Ejecutar el conjunto de pruebas
npm test

# Comprobar tipos (los errores en archivos de prueba preexistentes no bloquean)
npx tsc --noEmit
```

2. **Confirmar y subir los cambios**:

```bash
git add "app/(app)/prompts/page.tsx" tests/api/prompts.test.ts   # comillas en rutas con paréntesis
git commit -m "descripción clara del cambio"
git push origin main
```

3. **Desplegar a producción**:

```bash
VERCEL_TOKEN="vcp_tu_token" vercel deploy --prod
```

Qué hace este comando (verificado en la guía interna):

- Lee `.vercel/project.json` para conocer el proyecto y el equipo.
- Sube los archivos del directorio actual a Vercel.
- Ejecuta la compilación en la nube: `npm install` → `prisma generate` (vía el script `postinstall`) → `next build`.
- Si la compilación es correcta, publica el despliegue en producción.
- Asigna el alias de producción (por ejemplo, `prompt-database-liard.vercel.app`).

Salida esperada (ejemplo real de la guía interna):

```
Production      https://prompt-database-47rqojbv6-omagallanes.vercel.app
Aliased         https://prompt-database-liard.vercel.app
✓ Ready in 1m
```

La dirección con el identificador único (`-47rqojbv6-`) corresponde al despliegue concreto; la dirección con alias (`-liard.`) es la que siempre apunta a producción.

4. **Despliegue en un solo comando** (después de confirmar los cambios):

```bash
npm test && git push origin main && VERCEL_TOKEN="vcp_tu_token" vercel deploy --prod
```

### 9.8 Verificación posterior al despliegue

Desde el navegador:

1. Abrir la dirección de producción.
2. Comprobar que la página carga y que el inicio de sesión funciona.
3. Probar la funcionalidad desplegada.

Desde la interfaz de línea de comandos:

```bash
# Despliegues de producción
VERCEL_TOKEN="vcp_tu_token" vercel list --environment production

# Detalles de un despliegue concreto
VERCEL_TOKEN="vcp_tu_token" vercel inspect <direccion-o-identificador>

# Registros en tiempo real
VERCEL_TOKEN="vcp_tu_token" vercel logs <direccion>
```

### 9.9 Volver a una versión anterior (rollback)

Desde la interfaz de línea de comandos:

```bash
# Listar despliegues anteriores
VERCEL_TOKEN="vcp_tu_token" vercel list --environment production

# Promover un despliegue anterior a producción
VERCEL_TOKEN="vcp_tu_token" vercel promote <identificador-del-despliegue>
```

Desde el panel de Vercel: Project → Deployments → botón de opciones del despliegue deseado → Promote to Production.

Si además hay que revertir el código:

```bash
git revert HEAD
git push origin main
VERCEL_TOKEN="vcp_tu_token" vercel deploy --prod
```

### 9.10 Migraciones y semilla en producción

**Pendiente de verificación**: el repositorio no documenta el flujo exacto con el que se aplican migraciones y semilla contra la base de datos de producción. Opciones seguras que pueden seguirse:

1. Ejecutar migraciones desde un equipo con la variable `DATABASE_URL_UNPOOLED` apuntando a la base de datos de Neon y el comando `npx prisma migrate deploy` (aplica migraciones existentes sin crear nuevas).
2. Si no hay historial de migraciones, `npx prisma migrate dev --name init` crea la migración inicial; ejecútelo contra una base de datos de ensayo primero.
3. La semilla en producción requiere definir `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD` en el entorno de ejecución y ejecutar `npm run db:seed`.

Antes de tocar el esquema en producción: exporte los mensajes (la aplicación ofrece exportación JSON), realice una copia de seguridad en Neon y pruebe el flujo completo en una base de datos de ensayo.

---

## 10. Errores conocidos y soluciones

Esta sección recoge los errores y las trampas **verificados** en el código, en la documentación interna del repositorio y en la guía de despliegue. Los que no han podido confirmarse del todo se marcan explícitamente.

### 10.1 El parámetro `--token` de la CLI de Vercel no funciona

**Síntoma**: `Error: The token provided via --token argument is not valid`.

**Causa**: el token se creó desde la cuenta personal y la Vercel CLI 56.x solo acepta `--token` con tokens de ámbito de equipo.

**Solución**: usar siempre la variable de entorno:

```bash
VERCEL_TOKEN="vcp_tu_token" vercel whoami
```

Si el problema persiste, genere un token nuevo desde Vercel Dashboard → Account → Tokens (cuenta personal, no equipo).

### 10.2 «You do not have access to the specified account»

**Síntoma**: el comando de Vercel responde con ese error.

**Causa**: se usó el parámetro `--scope` con el identificador del equipo en lugar del nombre legible (slug), o el token no tiene acceso al equipo.

**Solución**: no usar `--scope` ni `--team` salvo necesidad. Si hace falta, usar el slug:

```bash
vercel --scope omagallanes
```

### 10.3 La página `/auth/error` no existe

**Síntoma**: los errores de autenticación muestran la página de error por defecto de Next.js en lugar de una página propia.

**Causa (verificada)**: `lib/auth.ts` declara `pages.error: "/auth/error"` y `middleware.ts` la trata como ruta pública, pero **no existe ningún directorio ni página** en `app/(auth)/auth/error/`. Es un problema conocido documentado en la inteligencia del proyecto (severidad alta).

**Solución**: crear la página `app/(auth)/auth/error/page.tsx` con `export const dynamic = "force-dynamic"` y un mensaje de error genérico, o aceptar la página por defecto mientras tanto.

### 10.4 Páginas con `auth()` fallan durante el prerrenderizado estático

**Síntoma**: fallos en la compilación o en tiempo de ejecución en páginas que usan `auth()`.

**Causa (verificada)**: las páginas que llaman a `auth()` necesitan renderizado dinámico. Las páginas afectadas (páginas de inicio y registro de sesión, perfil, listados de mensajes, formulario de mensajes y detalle) ya declaran `export const dynamic = "force-dynamic"`.

**Solución**: cualquier página nueva que use `auth()` debe añadir `export const dynamic = "force-dynamic"`. El propio `app/layout.tsx` raíz también lo declara.

### 10.5 ESLint `react/no-unescaped-entities` rompe la compilación

**Síntoma**: la compilación falla por apóstrofos o comillas sin escapar en JSX.

**Causa**: la regla de ESLint `react/no-unescaped-entities`.

**Solución (verificada)**: en este proyecto la regla está configurada como advertencia (warn), por lo que no rompe la compilación. Si la ve en archivos nuevos, escríbalos con `&apos;` o `{"'"}`.

### 10.6 «Prisma Client not found» (cliente de Prisma no generado)

**Síntoma**: los puntos de conexión o los scripts fallan con errores de cliente de Prisma.

**Causa**: `prisma generate` no se ejecutó tras la instalación.

**Solución (verificada)**: el script `postinstall` de `package.json` (`prisma generate`) debe ejecutarse automáticamente con `npm install`. Si no ocurrió, ejecute `npm run db:generate`. No elimine el script `postinstall`.

### 10.7 No hay historial de migraciones en el repositorio

**Síntoma**: `prisma migrate` no encuentra migraciones en un clon nuevo.

**Causa (verificada)**: `/prisma/migrations/` está en `.gitignore` (línea 41). Las migraciones son regenerables y no se versionan.

**Solución**: ejecutar `npx prisma migrate dev --name init` (o el flujo que se elija para producción; véase la Parte 6.5).

### 10.8 Fallos de Prisma por la versión de OpenSSL del entorno

**Síntoma**: el cliente de Prisma no conecta en el entorno de despliegue.

**Causa**: el esquema declara `binaryTargets` concretos (`native`, `linux-musl-openssl-3.0.x`, `linux-musl-arm64-openssl-3.0.x`, `debian-openssl-3.0.x`). Si la plataforma usa otra versión de OpenSSL, Prisma falla.

**Solución**: verificar la versión de OpenSSL de la plataforma de destino y ajustar `binaryTargets` en `prisma/schema.prisma`, seguido de `npm run db:generate`.

### 10.9 Jest no transforma next-intl (módulos ES)

**Síntoma**: las pruebas fallan al importar next-intl con errores de sintaxis de módulos ES.

**Causa (verificada)**: `next/jest` antepone `/node_modules/` a `transformIgnorePatterns`; añadir patrones en la configuración personalizada no basta.

**Solución (ya aplicada en el proyecto)**: sobrescribir `transformIgnorePatterns` tras `createJestConfig` en `jest.config.js` con la lista `(next-auth|@auth/core|@auth/prisma-adapter|next-intl|use-intl|intl-messageformat|@formatjs)`. No revertir esa sobrescritura.

### 10.10 `getTranslations` de `next-intl/server` lanza una excepción en Jest

**Síntoma**: las pruebas de la API fallan con la excepción del código auxiliar de `getTranslations`.

**Causa (verificada)**: la función no está implementada para el entorno de pruebas.

**Solución**: simular (mock) el módulo `next-intl/server` en las pruebas de la API, cargando los catálogos reales de `messages/` (así lo hacen las pruebas existentes).

### 10.11 «Route /api/export/prompts couldn't be rendered statically»

**Síntoma**: aparece un mensaje así durante la compilación.

**Causa (verificada)**: la ruta de exportación usa `headers()` de Next.js, lo que impide la generación estática.

**Impacto**: ninguno. Es una advertencia, no un error. El despliegue se completa y la ruta funciona como ruta dinámica.

### 10.12 Error 500 después del despliegue

**Síntoma**: la aplicación responde con errores 500 tras un despliegue.

**Causa probable**: variables de entorno mal configuradas en el panel de Vercel (por ejemplo, `DATABASE_URL` ausente o con valor incorrecto, o `AUTH_SECRET` ausente o con el valor de ejemplo).

**Solución**:

```bash
VERCEL_TOKEN="vcp_tu_token" vercel logs <direccion>
```

y revisar Vercel → Project → Settings → Environment Variables.

### 10.13 Rutas con paréntesis en los comandos de Git

**Síntoma**: `git add app/(app)/prompts/page.tsx` falla o añade archivos equivocados.

**Causa**: la terminal interpreta los paréntesis como sintaxis propia.

**Solución (verificada)**: usar siempre comillas:

```bash
git add "app/(app)/prompts/page.tsx"
```

### 10.14 Errores de TypeScript en archivos de prueba preexistentes

**Síntoma**: `npx tsc --noEmit` muestra errores en pruebas que no se han tocado.

**Causa (verificada)**: existen errores de tipos preexistentes en algunos archivos de prueba.

**Solución**: la compilación de Vercel (Next.js) no revisa los archivos de prueba, de modo que estos errores **no bloquean el despliegue**. Solo son relevantes los errores en los archivos que se modifican.

### 10.15 Contraseñas antiguas visibles en el historial de Git

**Síntoma**: el historial de Git contiene versiones de `prisma/seed.ts` con contraseñas codificadas.

**Causa (verificada)**: las versiones antiguas de la semilla incluían contraseñas reales. Desde el 6 de agosto de 2026 la semilla solo lee `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD`.

**Solución**: rotar las contraseñas reales de las cuentas en producción si la semilla antigua se ejecutó alguna vez. No reintroducir credenciales en el código.

### 10.16 Borrado en cascada sin vuelta atrás

**Síntoma**: al borrar una etiqueta o un mensaje desaparecen relaciones que se esperaban conservar.

**Causa (verificada)**: las seis tablas puente usan `onDelete: Cascade` en ambas claves externas.

**Solución**: antes de borrar, exportar los mensajes en JSON o hacer una copia de seguridad. La operación es irreversible sin copia.

### 10.17 Referencias a archivos inexistentes en el README

**Síntoma**: los enlaces del `README.md` a `docs/index.md`, `DOCKER.md` y `DEPLOYMENT.md` no llevan a ninguna parte.

**Causa (verificada)**: el `README.md` conserva contenido del tenedor original y no se ha actualizado por completo.

**Solución**: tratar el `README.md` como documentación heredada. Este manual y `docs/reference/` son las fuentes fiables. La actualización del `README.md` queda pendiente.

### 10.18 Variables de la semilla no documentadas en `.env.example`

**Síntoma**: `npm run db:seed` falla con el mensaje de variables faltantes.

**Causa (verificada)**: el script exige `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD`, que no aparecen en `.env.example`.

**Solución**: definir ambas variables en el entorno desde el que se ejecuta la semilla. **Pendiente de verificación**: añadir su documentación a `.env.example`.

### 10.19 Dato pendiente: procedimiento de migraciones en producción

**Pendiente de verificación**: no se ha documentado cómo se aplican las migraciones de Prisma contra la base de datos de Neon en el flujo de despliegue actual (véase la Parte 9.10). Documente el procedimiento elegido antes de modificar el esquema.

### 10.20 Dato pendiente: datos del entorno del equipo de trabajo

**Pendiente de verificación**: el archivo `.env` del equipo de trabajo contiene tokens reales de servicios externos (por ejemplo, Vercel y Cloudflare). Si usted recibe una copia del entorno de trabajo, confirme con el responsable qué tokens son válidos y cuáles deben regenerarse; ninguno de esos valores debe publicarse.

---

## 11. Guía de referencia rápida

### 11.1 Instalación

| Tarea | Comando |
|---|---|
| Clonar el repositorio | `git clone https://github.com/omagallanes/p-database.git` |
| Instalar dependencias (con generación automática de Prisma) | `npm install` |
| Instalación reproducible | `npm ci` |
| Generar el cliente de Prisma | `npm run db:generate` |
| Comprobar versión de Node.js | `node --version` |
| Comprobar versión de npm | `npm --version` |

### 11.2 Desarrollo

| Tarea | Comando |
|---|---|
| Servidor de desarrollo | `npm run dev` |
| Linter | `npm run lint` |
| Compilación de tipos | `npx tsc --noEmit` |
| Compilación de producción | `npm run build` |
| Servidor de producción local | `npm start` |

### 11.3 Base de datos

| Tarea | Comando |
|---|---|
| Generar el cliente de Prisma | `npm run db:generate` (o `npm run prisma:generate`) |
| Crear y aplicar migraciones | `npm run db:migrate` (o `npx prisma migrate dev`) |
| Sincronizar el esquema sin migraciones | `npm run db:push` |
| Aplicar migraciones existentes | `npx prisma migrate deploy` |
| Sembrar la base de datos (requiere `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD`) | `npm run db:seed` |
| Migrar datos de campos antiguos a relaciones N:M | `npm run db:migrate-data` |
| Explorador visual de la base de datos | `npm run prisma:studio` |

### 11.4 Pruebas

| Tarea | Comando |
|---|---|
| Ejecutar el conjunto de pruebas | `npm test` |
| Modo de vigilancia | `npm run test:watch` |
| Medir la cobertura | `npm test -- --coverage` |

### 11.5 Despliegue

| Tarea | Comando |
|---|---|
| Vincular el clon con Vercel | `vercel link` |
| Verificar el token | `VERCEL_TOKEN="vcp_tu_token" vercel whoami` |
| Desplegar a producción | `VERCEL_TOKEN="vcp_tu_token" vercel deploy --prod` |
| Despliegue de prueba (preview) | `VERCEL_TOKEN="vcp_tu_token" vercel deploy` |
| Listar despliegues de producción | `VERCEL_TOKEN="vcp_tu_token" vercel list --environment production` |
| Detalles de un despliegue | `VERCEL_TOKEN="vcp_tu_token" vercel inspect <direccion>` |
| Registros en tiempo real | `VERCEL_TOKEN="vcp_tu_token" vercel logs <direccion>` |
| Volver a un despliegue anterior | `VERCEL_TOKEN="vcp_tu_token" vercel promote <identificador>` |
| Descargar variables de Vercel a un archivo local | `VERCEL_TOKEN="vcp_tu_token" vercel env pull .env.production` |
| Añadir una variable desde la línea de comandos | `vercel env add DATABASE_URL production` |

### 11.6 Flujo de trabajo completo (una sola pasada)

```bash
npm test && \
git push origin main && \
VERCEL_TOKEN="vcp_tu_token" vercel deploy --prod
```

---

## Apéndice A. Rutas de la aplicación y puntos de conexión de la API

### A.1 Páginas principales

| Ruta | Propósito |
|---|---|
| `/` | Página principal (redirige a los mensajes) |
| `/prompts` | Listado de mensajes propios con búsqueda y filtros |
| `/prompts/new` | Creación de un mensaje |
| `/prompts/[id]` | Detalle y edición de un mensaje |
| `/categories` y `/tags` | Páginas de categorías y etiquetas |
| `/taxonomy` y sus subrutas (`/type`, `/status`, `/language`, `/platforms`, `/use-cases`, `/client-projects`, `/model-hints`) | Gestión de catálogos (solo administradores) |
| `/shared` y `/shared/[id]` | Mensajes compartidos por otros usuarios y su detalle de solo lectura |
| `/auth/profile` | Perfil del usuario (pestañas de cuenta, escritorio y usuarios) |
| `/auth/signin`, `/auth/signup`, `/auth/error` | Autenticación (la página de error no existe; véase el error 10.3) |

### A.2 Puntos de conexión de la API

| Ruta | Métodos | Notas |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Gestión de sesiones de NextAuth |
| `/api/auth/register` | POST | Registro público de usuarios |
| `/api/prompts` | GET, POST | Listado (con filtros) y creación (requiere sesión) |
| `/api/prompts/[id]` | GET, PUT, DELETE | Detalle, actualización y borrado. El detalle permite al propietario o al autor de un mensaje compartido; la edición y el borrado exigen la propiedad |
| `/api/prompts/[id]/usage` | PATCH | Registro de uso (contador y fecha) |
| `/api/categories` y `/api/categories/[id]` | GET, POST / PUT, DELETE | Categorías |
| `/api/tags` y `/api/tags/[id]` | GET, POST / PUT, DELETE | Etiquetas |
| `/api/platforms` y `/api/platforms/[id]` | GET, POST / PUT, DELETE | Plataformas |
| `/api/use-cases` y `/api/use-cases/[id]` | GET, POST / PUT, DELETE | Casos de uso |
| `/api/client-projects` y `/api/client-projects/[id]` | GET, POST / PUT, DELETE | Clientes o proyectos |
| `/api/model-hints` y `/api/model-hints/[id]` | GET, POST / PUT, DELETE | Modelos sugeridos |
| `/api/types`, `/api/statuses`, `/api/languages` (y sus rutas `/[id]`) | GET, POST / PUT, DELETE | Catálogos de tipo, estado y lenguaje |
| `/api/users` y `/api/users/[id]` | GET, PUT / DELETE | Gestión de usuarios (solo administradores) |
| `/api/user/profile` | GET, PATCH | Perfil del usuario conectado |
| `/api/user/password` | PATCH | Cambio de contraseña (incrementa `tokenVersion` y revoca las sesiones anteriores) |
| `/api/user/preferences` | GET, PATCH | Preferencias de interfaz |
| `/api/export/prompts` | GET | Exportación de los mensajes propios en JSON |
| `/api/import/prompts` | POST | Importación de mensajes desde JSON (versiones 2.0 y 1.0) |
| `/api/shared/prompts` | GET | Mensajes compartidos por otros usuarios |

---

## Apéndice B. Modelos de datos de Prisma

Resumen de los 21 modelos de `prisma/schema.prisma` con sus campos principales:

| Modelo | Campos principales |
|---|---|
| `User` | `id` (cuid), `name`, `email` (único), `emailVerified`, `image`, `password`, `role` (por defecto «user»), `isActive` (por defecto verdadero), `language`, `promptListViewPreference` (por defecto «cards»), `uiPreferences` (JSON), `failedLoginAttempts`, `lockoutUntil`, `tokenVersion`, fechas de creación y actualización |
| `IpAttempt` | `ip` (único), `failedAttempts`, `lockoutUntil`, fechas. Índice por `lockoutUntil` |
| `Account` | `userId`, `type`, `provider`, `providerAccountId`, tokens de OAuth. Único por `provider` y `providerAccountId`; borrado en cascada con el usuario |
| `Session` | `sessionToken` (único), `userId`, `expires`. Borrado en cascada con el usuario |
| `VerificationToken` | `identifier`, `token` (único), `expires`. Único por `identifier` y `token` |
| `Prompt` | `title`, `description`, `body`, `type` (por defecto «USER»), `platform` (por defecto «CURSOR»), `modelHint`, `language` (por defecto «es»), `useCase`, `clientOrProject`, `status` (por defecto «DRAFT»), `isFavorite`, `isShared`, `version`, `changelog`, `notes`, `prePrompt` (texto largo), `manualDeUso` (texto largo), `usageCount`, `lastUsedAt`, `userId` (opcional). Índices por `status`, `platform`, `isFavorite`, `isShared`, `language` y `userId` |
| `Category` | `name` (único), `slug` (único), `parentId` (jerarquía), `sortOrder`. Índices por `parentId` y `slug` |
| `Tag` | `name` (único), `slug` (único). Índice por `slug` |
| `Platform` | `name` (único), `slug` (único), `sortOrder`. Índice por `slug` |
| `ClientProject` | `name` (único), `slug` (único), `sortOrder`. Índice por `slug` |
| `UseCase` | `name` (único), `slug` (único), `sortOrder`. Índice por `slug` |
| `ModelHint` | `name` (único), `slug` (único), `sortOrder`. Índice por `slug` |
| `PromptCategory`, `PromptTag`, `PromptPlatform`, `PromptClientProject`, `PromptUseCase`, `PromptModelHint` | Claves compuestas (`promptId` + identificador de la entidad), borrado en cascada en ambas claves |
| `Type`, `Status`, `Language` | Catálogos: `name` (único), `slug` (único), `sortOrder`. Índice por `slug` |

---

## Nota final de verificación

Este manual se redactó el 7 de agosto de 2026 leyendo los archivos reales del repositorio: `package.json`, `prisma/schema.prisma`, `next.config.js`, `vercel.json`, `.env.example`, `README.md`, `middleware.ts`, `lib/auth.ts`, `lib/prisma.ts`, `prisma/seed.ts`, `jest.config.js`, `jest.setup.js`, `i18n/locales.ts`, `i18n/request.ts`, `docs/informe-cobertura.md`, `docs/reference/api-endpoints.md`, `docs/guide/deployment.md` y la inteligencia de proyecto de `.opencode/context/`. Los datos pendientes de verificación se indican explícitamente en su contexto (principalmente: el flujo de migraciones en producción, la documentación de `SEED_ADMIN_PASSWORD` y `SEED_USER_PASSWORD` en `.env.example`, y la dirección de producción vigente).
