# IFRA Consulting Real Leads Management CRM

Production-style CRM / lead management system for **IFRA Consulting (Pvt) Ltd.**, an IT/software house.

The application is built with **Next.js**, **React**, **TypeScript**, **Tailwind CSS** and **Microsoft SQL Server 2019**. All CRM data is stored in SQL Server. There is no MySQL, PostgreSQL, MongoDB, Prisma or PHP in this project.

## Requirements

- Node.js 20+
- npm
- Microsoft SQL Server 2019
- SQL Server Management Studio 18 (SSMS)
- Git

## Installation

1. Install dependencies.

```bash
npm install
```

2. Start SQL Server.

3. Open SSMS and connect to your SQL Server 2019 instance.

4. Execute:

```text
database/real_leads_system.sql
```

5. Confirm the database exists:

```text
real leads system
```

In SSMS:

```sql
USE [real leads system];
SELECT name FROM sys.tables;
```

6. Copy `.env.example` to `.env` (already included locally) and set your SQL Server credentials:

```env
DB_USER=sa
DB_PASSWORD=YOUR_PASSWORD
DB_SERVER=localhost
DB_DATABASE=real leads system
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
AUTH_SECRET=change-this-to-a-long-random-secret-at-least-32-characters
```

If you use SQL Server Express, `DB_SERVER` may be `localhost\\SQLEXPRESS`.

7. Optional: refresh seed password hashes against the live database.

```bash
npm run seed:passwords
```

8. Run:

```bash
npm run dev
```

9. Open:

```text
http://localhost:3100
```

You will be redirected to `/login` if you are not authenticated, or `/dashboard` if you are.

10. Login:

**Administrator (full access — all leads, users, settings)**

```text
Username:
ifra consulting

Password:
ifra@123
```

**User (own leads only — no Users/Settings, cannot delete)**

```text
Username:
user

Password:
user@123
```

The password is stored as a bcrypt hash. It is never shown in the CRM UI.

### Sample staff accounts (after the SQL seed)

| Role | Username | Password | Access |
| --- | --- | --- | --- |
| Administrator | `ifra consulting` | `ifra@123` | All leads, users, settings, delete |
| User | `user` | `user@123` | Own leads only, can edit, cannot delete |
| User | `sarah.manager` | `Manager@123` | Own leads only |
| User | `ali.sales` | `Employee@123` | Own leads only |
| User | `hina.sales` | `Employee@123` | Own leads only |

## How to use the CRM

- **Add users**: Admin → Users → Add User. Roles are Administrator and User.
- **Add leads**: Leads → Add Lead. Lead codes are generated as `IFRA-000001`, `IFRA-000002`, …
- **Assign leads**: set Assigned Employee on create/edit (Administrator only).
- **Manage services**: Services page — add, edit, activate or deactivate.
- **Manage sources**: Lead Sources page.
- **Manage follow-ups**: Follow-ups page, or from a lead record. Overdue items are highlighted.
- **Create proposals**: from the lead record. Numbers are generated as `IFRA-P-000001`.
- **View reports**: Reports page, with optional date filters and CSV/Excel export.
- **Manage settings**: Settings page for company name, logo path, currency, timezone and number prefixes.
- **Change logo**: replace `public/images/logo.png` or update the logo path in Settings.

## Architecture

```text
Next.js (App Router)
   ↓
Server Actions / Route Handlers
   ↓
mssql
   ↓
Microsoft SQL Server 2019
   ↓
[real leads system]
```

All database work happens on the server. SQL Server credentials are never sent to the browser. Queries are parameterized.

## Roles

- **ADMIN**: full access, including users, settings and audit logs.
- **SALES MANAGER**: team leads, follow-ups, tasks, proposals and reports. Cannot manage admin accounts or security settings.
- **SALES EMPLOYEE**: assigned/created leads only. Cannot manage users, settings or audit logs.

Permissions are enforced in every server action, not only in the UI.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run seed:passwords
```
