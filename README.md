# RideShare Backend API

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.x-lightgrey)](https://expressjs.com/)

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database and Migrations](#database-and-migrations)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [Development Notes](#development-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

This is the backend API for the RideShare application, built using Express.js and MySQL (via Sequelize). It handles user management (passengers, drivers, staff, admins), authentication, RBAC, driver document uploads, ratings, and admin operations.

---

## Features

- User registration and authentication (Passenger, Driver, Staff, Admin)
- Role and permission-based access control (RBAC)
- Passenger profile management, including self-delete
- Driver document uploads and approval workflow (pending/approved/rejected)
- Passenger and Driver rating flows
- Driver Wallet model with association
- Basic rate limiting on auth endpoints

---

## Tech Stack

- Node.js
- Express.js
- MySQL / Sequelize ORM
- JWT Authentication
- Multer (file uploads)
- Postman (collection provided)

---

## Getting Started

### Prerequisites

- Node.js >= 14.x
- MySQL
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/rideshare-backend.git
cd rideshare-backend

# Install dependencies
npm install
```

### Configure Environment

Create a `.env` file in the project root:

```bash
DB_NAME=rideshare_db
DB_USER=root
DB_PASS=your_password
DB_HOST=127.0.0.1
DB_PORT=3306
JWT_SECRET=change_me
# If you use the provided Postman baseUrl (4000), set PORT=4000
PORT=4000
# Enable Sequelize SQL logs (true/false)
SEQ_LOG=false
```

### Start the Server

```bash
# Development (nodemon)
npm run dev

# or Production
npm start
```

The server starts at http://localhost:PORT (default 3000). All APIs are mounted under `/api`, e.g. `http://localhost:3000/api`.

---

## Environment Variables

- DB_NAME: Database name
- DB_USER: Database username
- DB_PASS: Database password
- DB_HOST: Database host (default 127.0.0.1)
- DB_PORT: Database port (default 3306)
- JWT_SECRET: Secret for JWT signing
- PORT: Server port (default 3000)
- SEQ_LOG: Enable Sequelize logging (true/false)

---

## Database and Migrations

- On server start, `sequelize.sync({ alter: true })` will auto-create/update tables, including:
  - `passengers.contract_id`
  - `wallets` table and relations

Optional manual scripts:

```bash
# Run migration helper
npm run migrate
# Seed roles/permissions/superadmin
npm run seed
```

Ensure MySQL is running and `.env` is configured before running migrations/seed.

---

## API Endpoints

Base URL: `http://localhost:PORT/api`

### Auth
- POST `/auth/passenger/register`
- POST `/auth/passenger/login`
- POST `/auth/driver/register`
- POST `/auth/driver/login`
- POST `/auth/staff/login`
- POST `/auth/admin/register`
- POST `/auth/admin/login`

### Passengers (admin)
- GET `/passengers`
- GET `/passengers/:id`
- PUT `/passengers/:id`
- DELETE `/passengers/:id`

### Passengers (self)
- GET `/passengers/profile/me`
- PUT `/passengers/profile/me`
- DELETE `/passengers/profile/me` (delete own account)
- POST `/passengers/rate-driver/:driverId`

### Drivers (admin)
- GET `/drivers`
- GET `/drivers/:id`
- PUT `/drivers/:id`
- DELETE `/drivers/:id`

### Drivers (self)
- GET `/drivers/profile/me`
- PUT `/drivers/profile/me`
- POST `/drivers/profile/me/toggle-availability`
- POST `/drivers/:id/documents` (form-data uploads)
- POST `/drivers/rate-passenger/:passengerId`

### Admins
- POST `/admins`
- GET `/admins`
- GET `/admins/:id`
- PUT `/admins/:id`
- DELETE `/admins/:id`
- POST `/admins/drivers/:driverId/approve`
- POST `/admins/drivers/:driverId/documents/approve`
- POST `/admins/drivers/:driverId/documents/reject`
- GET `/admins/drivers/pending-documents`
- GET `/admins/users/filter?role=driver|passenger|staff|admin`
- GET `/admins/staff?role=dispatcher`

### Roles
- POST `/roles`
- GET `/roles`
- GET `/roles/:id`
- PUT `/roles/:id`
- DELETE `/roles/:id`

### Permissions
- POST `/permissions`
- GET `/permissions`
- GET `/permissions/:id`
- PUT `/permissions/:id`
- DELETE `/permissions/:id`

---

## Folder Structure

```
.
├── config/
│   └── database.js
├── controllers/
├── middleware/
├── models/
├── postman/
│   └── rideshare.postman_collection.json
├── routes/
├── seed/
├── uploads/
├── server.js
├── package.json
└── README.md
```


## Contributing

Contributions are welcome. Please open an issue or submit a PR.

---

## License

MIT
