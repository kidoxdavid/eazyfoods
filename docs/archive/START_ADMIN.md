# Starting the Admin Portal

## Prerequisites
- Backend dependencies installed: `pip install -r requirements.txt`
- Frontend dependencies installed: `cd frontend-admin && npm install`

## Step 1: Start the Backend Server

Open a terminal and run:
```bash
cd /Users/davidebubeihezue/Documents/easyfoods
uvicorn app.main:app --reload
```

The backend will start on: `http://localhost:8000`

## Step 2: Start the Admin Frontend

Open a **NEW** terminal window and run:
```bash
cd /Users/davidebubeihezue/Documents/easyfoods/frontend-admin
npm run dev
```

The admin portal will start on: `http://localhost:3002`

## Login Credentials

- **Email**: `admin@eazyfoods.com`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change the password in production!

## Troubleshooting

### "ModuleNotFoundError: No module named 'app'"
- Make sure you're in the project root directory: `/Users/davidebubeihezue/Documents/easyfoods`
- Install dependencies: `pip install -r requirements.txt`

### "ModuleNotFoundError: No module named 'fastapi'"
- Install dependencies: `pip install -r requirements.txt`

### Backend not starting
- Check if port 8000 is already in use
- Make sure PostgreSQL is running
- Check your `.env` file has correct database credentials

### Frontend not starting
- Make sure you're in the `frontend-admin` directory
- Run `npm install` if you haven't already
- Check if port 3002 is already in use

