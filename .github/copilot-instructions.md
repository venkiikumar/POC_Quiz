<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Java Quiz Application - Copilot Instructions

This is a web-based Java quiz application built with HTML, CSS, and JavaScript. When working on this project, please consider the following:

## Project Structure
- `index.html` - Main application interface with user form, quiz sections, and results display
- `styles.css` - Modern, responsive styling with gradient backgrounds and smooth animations
- `script.js` - Core quiz functionality including CSV handling, timer, and results calculation
- `java_questions.csv` - Question database with 50 Java programming questions
- `quiz_results.csv` - Sample results file format

## Key Features to Maintain
- Random selection of 25 questions from 50-question pool
- CSV file upload for custom question sets
- Real-time timer and progress tracking
- Automatic results export to CSV
- User information capture (name and email)
- Responsive design for mobile and desktop

## Code Guidelines
- Use modern JavaScript (ES6+) features
- Maintain clean, readable code with proper comments
- Ensure cross-browser compatibility
- Follow accessibility best practices
- Keep CSS organized with clear section comments
- Use semantic HTML structure

## CSV Format Requirements
- Questions: `question,optionA,optionB,optionC,optionD,correctAnswer`
- Results: `Name,Email,Score,Total Questions,Percentage,Time Taken (seconds),Timestamp`

## When Making Changes
- Test quiz functionality thoroughly
- Ensure CSV import/export works correctly
- Validate timer and scoring accuracy
- Check responsive design on different screen sizes
- Maintain consistent UI/UX patterns

## Security Considerations
- All processing happens client-side
- No server-side dependencies
- CSV files are processed locally in browser
- User data is only stored in downloaded results file
