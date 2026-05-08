# Customer Service Dashboard

This is a React-based web application for tracking customer service metrics and reports, built with Vite.

## Requirements

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

## Getting Started

Follow these steps to set up the project locally:

1. **Install Dependencies:**
   Run the following command to install all necessary libraries:
   ```bash
   npm install
   ```

2. **Environment Variables:**
   This project requires Firebase configuration to run.
   - Copy the `.env.example` file and rename it to `.env`
   - Fill in your actual Firebase keys in the newly created `.env` file.
   ```bash
   cp .env.example .env
   ```

3. **Start the Development Server:**
   Run the following command to start the app locally:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Building for Production

To build the project for production, run:
```bash
npm run build
```
The optimized files will be generated in the `dist` folder.
