# Programming Quiz Application

A web-based programming quiz application supporting multiple technologies (Java, Python, C#, TypeScript) with applications for RoadOps, RoadSales, UES, and Digital teams. Features random question selection, comprehensive admin panel, and SQLite database storage.

## Features

### **User Features**
- **Multiple Applications**: Choose from RoadOps, RoadSales, UES, or Digital applications
- **Random Question Selection**: Displays configurable number of questions from question pools
- **Multiple Choice Interface**: Clean, intuitive multiple-choice question interface
- **Timer**: Tracks time taken to complete the quiz
- **Progress Tracking**: Visual progress bar and question counter
- **Results Display**: Shows score, percentage, and performance feedback
- **Responsive Design**: Works on desktop and mobile devices

### **Admin Features**
- **Secure Admin Panel**: Password-protected admin access (admin/admin123)
- **Results Management**: View all user quiz results in tabular format
- **Statistics Dashboard**: View performance analytics and score distributions
- **Question Management**: Upload custom question sets via CSV files for any application
- **Application Configuration**: Set maximum questions per application
- **Data Export**: Export all results to CSV format
- **SQLite Database**: All data stored in local SQLite database via Prisma ORM
- **Data Management**: Clear stored results when needed

## Getting Started

### **Prerequisites**
- Node.js (v14 or higher) - for development server
- Modern web browser with JavaScript enabled

### **Installation & Setup**

1. **Clone or download the project files**
2. **Install dependencies:**
   ```bash
   npm install
   ```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the database and server:**
   ```bash
   # Option 1: Use the batch file
   start-backup-server.bat
   
   # Option 2: Start manually
   node server-backup.js
   ```

3. **Open the application:**
   - Navigate to `http://localhost:3000` in your browser
   - The server must be running for the application to work

### **Database Setup**
The SQLite database is automatically created when you first run the server. If you need to reset or reseed the database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed
```

## Usage

### **For Students/Users**

1. **Open the application** in your web browser
2. **Enter your details** (name and email address)
3. **Click "Start Quiz"** to begin
4. **Answer the questions** using the multiple-choice options
5. **Navigate** between questions using Previous/Next buttons
6. **Submit the quiz** when completed
7. **View your results** with score, percentage, and time taken

### **For Administrators**

1. **Click "Admin Login"** button in the top-right corner
2. **Login credentials:**
   - Username: `admin`
   - Password: `admin123`
3. **Access admin panel** with the following features:
   - View all quiz results in a detailed table
   - Export results to CSV format
   - Upload custom question sets
   - View performance statistics
   - Clear stored data when needed

## File Structure

```
POC_Quiz/
├── index.html                  # Main application interface
├── styles.css                  # CSS styling and responsive design
├── script.js                   # Core quiz functionality and admin panel
├── server-backup.js            # Node.js/Express server with Prisma ORM
├── start-backup-server.bat     # Server startup script
├── package.json               # Node.js dependencies and scripts
├── README.md                  # Project documentation
├── IMPLEMENTATION_SUMMARY.md  # Technical implementation details
├── prisma/
│   ├── schema.prisma          # Database schema definition
│   ├── quiz_app.db            # SQLite database file
│   ├── seed.js               # Database seeding script
│   └── migrations/           # Database migration files
├── uploads/                   # Temporary CSV upload directory
├── java_questions.csv         # Java programming questions (50)
├── python_questions.csv       # Python programming questions (50)
├── csharp_questions.csv       # C# programming questions
├── typescript_questions.csv   # TypeScript programming questions
├── quiz_results.csv           # Sample results file format
└── .vscode/
    └── tasks.json            # VS Code task configuration
```

## Data Storage

### **Database**
- **Type**: SQLite database with Prisma ORM
- **Location**: `prisma/quiz_app.db`
- **Tables**: Applications, Questions, QuizResults
- **Admin Access**: Full CRUD operations via admin panel
- **Security**: All data stored locally, not accessible to regular users
- **Export**: Administrators can export results to CSV format

### **Question Database**
- **Applications**: RoadOps, RoadSales, UES, Digital with individual question pools
- **Custom Upload**: Administrators can upload question sets for any application
- **Format**: CSV format with specific column structure
- **Sample Files**: `java_questions.csv`, `python_questions.csv`, `csharp_questions.csv`, `typescript_questions.csv`

## CSV File Formats

### **Questions CSV Format**
```csv
question,optionA,optionB,optionC,optionD,correctAnswer
What is the size of int in Java?,16 bits,32 bits,64 bits,8 bits,B
Which keyword is used to define constants?,const,constant,final,static,C
```

### **Results CSV Format**
```csv
Name,Email,Score,Total Questions,Percentage,Time Taken (seconds),Timestamp
John Doe,john@email.com,20,25,80,1800,2025-07-31T10:30:00.000Z
```

## Security Features

- **Admin Authentication**: Protected admin panel with login credentials  
- **Data Privacy**: User results stored locally, not shared publicly
- **Access Control**: Admin functions only accessible after authentication
- **Local Storage**: All data processing happens client-side

## Development

### **Available Scripts**

```bash
npm run dev          # Start development server with auto-reload
npm run start        # Start production server
npm install          # Install dependencies
```

### **VS Code Tasks**
- **Start Development Server (Node.js)**: Runs the app with hot reload
- **Start Development Server (Python)**: Alternative Python server
- **Install Dependencies**: Installs npm packages
- **Open Quiz Application**: Opens the app directly in browser

### **Future Enhancements**
- Database integration for persistent storage
- User authentication system
- Advanced analytics and reporting
- Question categorization and difficulty levels
- Timed quiz sessions with configurable duration

## Admin Credentials

**Default admin credentials** (change in production):
- **Username**: `admin`
- **Password**: `admin123`

> **Note**: In a production environment, implement proper backend authentication and secure password management.

## Browser Requirements

- Modern web browser with JavaScript enabled
- Local storage support for data persistence
- File API support for CSV upload/download functionality

## Troubleshooting

### **Common Issues**

1. **Server not starting**: Ensure Node.js is installed and port 3000 is available
2. **Admin login not working**: Check credentials (admin/admin123)
3. **CSV upload failing**: Ensure CSV format matches the required structure
4. **Results not saving**: Check browser's local storage settings

### **Development Server Issues**

- If port 3000 is busy, modify the port in `package.json` scripts
- For CORS issues, use the provided development server instead of opening files directly
- Clear browser cache if experiencing unexpected behavior

## Support

For technical issues or questions:
1. Check the browser's developer console for error messages
2. Verify CSV file format matches the required structure  
3. Ensure admin credentials are correct
4. Try clearing browser local storage and refreshing the application
