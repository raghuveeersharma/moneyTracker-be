# MoneyTracker Backend

This is the server-side application for MoneyTracker, built with **Express.js**, **TypeScript**, and **MongoDB**.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Language**: TypeScript
- **Real-time**: Socket.io
- **Auth**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Security**: Helmet, CORS, Bcrypt

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB instance running (locally or Docker)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment:
   Create a `.env` file (or use default):
   ```env
   PORT=4000
   MONGO_URI=mongodb://root:example@localhost:27017/moneytracker?authSource=admin
   JWT_SECRET=your_jwt_secret
   ```

3. Run in Development Mode:
   ```bash
   npm run dev
   ```

### Scripts
- `npm run dev`: Runs with nodemon for hot-reloading.
- `npm run build`: Compiles TypeScript to `dist/`.
- `npm start`: Runs the compiled code.
- `npm run seed`: Seeds the database with fake users and transactions.

## API Endpoints

### Auth
- `POST /api/auth/register`: Create a new user.
- `POST /api/auth/login`: Authenticate and get token.
- `GET /api/auth/me`: Get current user profile.
- `GET /api/auth/users`: List all users (for chat).

### Transactions
- `GET /api/transactions`: List user transactions.
- `POST /api/transactions`: Create transaction.
- `GET /api/transactions/dashboard`: Get aggregated stats.
- `PUT /api/transactions/:id`: Update transaction.
- `DELETE /api/transactions/:id`: Delete transaction.

### Contacts
- `GET /api/contacts`: List contacts.
- `POST /api/contacts`: Add contact.
- `DELETE /api/contacts/:api`: Delete contact.

## Socket.io Events
- `connection`: Client connects.
- `join_room`: Client joins their user-specific room.
- `send_message`: Send a message to another user.
- `receive_message`: Listen for incoming messages.
