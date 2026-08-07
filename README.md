**Español**: la versión en español de este documento está disponible en [README-ES.md](README-ES.md).

# Prompt Library

Open-source web application to manage, organize, and search instructions (prompts) for artificial intelligence. Built with Next.js, Prisma, and PostgreSQL.

> 🪧 **Project website**: [bprompts.paginaviva.net](https://bprompts.paginaviva.net)

---

## Table of Contents

1. [Description](#description)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Technologies](#technologies)
5. [Requirements](#requirements)
6. [Installation](#installation)
7. [Environment configuration](#environment-configuration)
8. [Database](#database)
9. [Development](#development)
10. [Testing](#testing)
11. [Production build](#production-build)
12. [Deployment](#deployment)
13. [Documentation](#documentation)
14. [Credits and origin](#credits-and-origin)
15. [License](#license)

---

## Description

Prompt library for artificial intelligence: management, organization, and search of prompts for different AI models, based on Prompt Database. This repository is a fork of [YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database), with credit to its creator.

The application lets you create, edit, and delete prompts, organize them with hierarchical categories and tags, filter and search them by full text, copy them to the clipboard with a click, and export or import them in JSON format.

## Features

- Create, edit, and delete prompts
- Organize with hierarchical categories (up to two levels) and tags
- Filter by category, tag, platform, status, language, clients, projects, use cases, model suggestions, and favorites
- Full-text search in title, description, and body
- Usage tracking (usage counter and last used date)
- One-click copy to clipboard
- Duplicate prompts
- Mark as favorite
- Export and import in JSON format
- User authentication with NextAuth
- Per-user prompt isolation
- User profile with tabs (account, dashboard, users)
- User management for the admin role
- Prompts shared between users (read-only view)
- Multilingual interface with language selector (Spanish and English)
- Modern interface with TailwindCSS and shadcn/ui

## Screenshots

Application screenshots will be published soon. The list of planned screenshots and their location is documented in [screenshots/lista-de-capturas.md](screenshots/lista-de-capturas.md).

| Screenshot | Description |
|---|---|
| `screenshots/pantalla-principal.png` | Message listing with search and filters |
| `screenshots/pantalla-formulario.png` | Creation and editing form |
| `screenshots/pantalla-detalle.png` | Detail view with copy button |
| `screenshots/pantalla-categorias.png` | Hierarchical category management |
| `screenshots/pantalla-etiquetas.png` | Tag management |
| `screenshots/pantalla-perfil.png` | User profile with tabs |
| `screenshots/pantalla-administracion.png` | User management (admin) |
| `screenshots/pantalla-idiomas.png` | Language selector |

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI components**: shadcn/ui
- **Database**: PostgreSQL
- **Object-relational mapping**: Prisma
- **Authentication**: NextAuth
- **Validation**: Zod
- **Testing**: Jest
- **Translations**: next-intl

## Requirements

- Node.js version 20 or higher
- npm, yarn, or pnpm as package manager
- PostgreSQL database (e.g., Neon)
- Vercel account for deployment

## Installation

1. Clone the repository:

```bash
git clone https://github.com/paginaviva/biblioteca-de-prompts.git
cd biblioteca-de-prompts
```

2. Install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Configure the environment variables (see [Environment configuration](#environment-configuration)).

## Environment configuration

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

The main variables are:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL database connection string |
| `DATABASE_URL_UNPOOLED` | Connection string without connection pooling (for migrations) |
| `AUTH_SECRET` | NextAuth session secret |
| `AUTH_URL` | Public URL of the application |
| `SEED_ADMIN_PASSWORD` | Seed admin user password |
| `SEED_USER_PASSWORD` | Seed sample user password |
| `NEXT_PUBLIC_BASE_PATH` | Base path for subfolder deployments (empty by default) |

> ⚠️ **Important**: the `.env` file contains real credentials and must never be published. Only the `.env.example` file is versioned.

## Database

```bash
# Generate the Prisma client
npm run db:generate

# Apply the migrations
npm run db:migrate

# (Optional) Seed the database with sample data
npm run db:seed
```

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing

```bash
npm test
```

Tests in watch mode:

```bash
npm run test:watch
```

## Production build

```bash
npm run build
npm start
```

## Deployment

The application is deployed to production on Vercel with a PostgreSQL database managed on Neon.

1. Configure the environment variables in the Vercel dashboard (Project → Settings → Environment variables)
2. Connect the `paginaviva/biblioteca-de-prompts` repository
3. Deploy from the main branch

The full procedure is detailed in the [developer and installer manual](manuales/manual-del-desarrollador.md).

## Documentation

| Document | Description | Languages |
|---|---|---|
| [User manual](manuales/manual-de-usuario.md) | Complete usage guide for the application | Spanish |
| [User manual (English)](manuales/manual-de-usuario-en.md) | Complete usage guide for the application | English |
| [Developer and installer manual](manuales/manual-del-desarrollador.md) | Technical guide for installation, configuration and deployment | Spanish |
| [Developer and installer manual (English)](manuales/manual-del-desarrollador-en.md) | Technical guide for installation, configuration and deployment | English |

## Credits and origin

This project is a fork of [YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database), created by **Berry @ Yellowgrape**. Subsequent development has been carried out by the [PáginaVIVA](https://github.com/paginaviva) organization.

- Original repository: [github.com/YellowBerry007/prompt-database](https://github.com/YellowBerry007/prompt-database)
- Fork: [github.com/paginaviva/biblioteca-de-prompts](https://github.com/paginaviva/biblioteca-de-prompts)
- Website: [bprompts.paginaviva.net](https://bprompts.paginaviva.net)

## License

This project is released under the MIT license. The original code of `YellowBerry007/prompt-database` retains its author's rights.
