const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Minimal Quiz Server...');
console.log(`🌐 Port: ${PORT}`);

// Basic middleware
app.use(express.json());
app.use(express.static(__dirname));

// Root endpoint - serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', port: PORT });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server working!', timestamp: new Date().toISOString() });
});

// Applications endpoint
app.get('/api/applications', (req, res) => {
    const apps = [
        { id: 1, name: 'RoadOps', description: 'RoadOps quiz', question_count: 25, max_questions: 25 },
        { id: 2, name: 'RoadSales', description: 'RoadSales quiz', question_count: 25, max_questions: 25 },
        { id: 3, name: 'UES', description: 'UES quiz', question_count: 25, max_questions: 25 },
        { id: 4, name: 'Digital', description: 'Digital quiz', question_count: 25, max_questions: 25 }
    ];
    res.json(apps);
});

// Questions endpoint
app.get('/api/questions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const count = parseInt(req.query.count) || 3;
    
    const questionSets = {
        1: 'Java',
        2: 'C#', 
        3: 'Python',
        4: 'TypeScript'
    };
    
    const questions = [];
    for(let i = 0; i < count; i++) {
        questions.push({
            id: i,
            question: `What is a key feature of ${questionSets[id] || 'programming'}?`,
            options: {
                A: "Object-oriented programming",
                B: "Cross-platform compatibility", 
                C: "Strong typing system",
                D: "All of the above"
            },
            correct: "D"
        });
    }
    
    res.json(questions);
});

// Update application
app.put('/api/applications/:id', (req, res) => {
    res.json({ success: true });
});

// Save results
app.post('/api/quiz-results', (req, res) => {
    res.json({ success: true, message: 'Result saved' });
});

// Debug endpoint
app.get('/api/debug/database', (req, res) => {
    res.json({
        status: 'Simple server running',
        applications: 4,
        questionsPerApp: 25,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health: /health`);
    console.log(`🧪 Test: /api/test`);
    console.log(`📋 Apps: /api/applications`);
    console.log(`❓ Questions: /api/questions/1?count=3`);
});

console.log('Server script loaded successfully');
