// Quiz Application JavaScript - Updated for Backend API
class JavaQuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.startTime = null;
        this.endTime = null;
        this.userEmail = '';
        this.userName = '';
        this.timerInterval = null;
        this.isAdmin = false;
        this.selectedApplication = null;
        this.currentQuestionCount = 25; // Default question count
        
        // Determine the base URL based on environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.baseURL = 'http://localhost:3000/api'; // Local development
        } else {
            this.baseURL = `${window.location.origin}/api`; // Production (Azure)
        }
        
        // Admin credentials (in production, this should be handled by backend)
        this.adminCredentials = {
            username: 'admin',
            password: 'admin123'
        };
        
        // Application configurations (will be loaded from backend)
        this.applications = {};
        
        // Initialize the app
        this.initializeApp().catch(error => {
            console.error('Failed to initialize application:', error);
        });
    }

    async initializeApp() {
        this.setupEventListeners();
        
        // Load applications from backend (this will also populate dropdowns)
        await this.loadApplications();
        
        console.log('Application initialized successfully');
    }

    async loadApplications() {
        try {
            console.log('🔍 Loading applications from:', `${this.baseURL}/applications`);
            const response = await fetch(`${this.baseURL}/applications`);
            console.log('📡 Response status:', response.status, response.statusText);
            
            if (response.ok) {
                const apps = await response.json();
                console.log('📊 Raw applications data:', apps);
                
                this.applications = {};
                apps.forEach(app => {
                    this.applications[app.name] = {
                        id: app.id,
                        name: app.name,
                        questionCount: app.question_count,
                        maxQuestions: app.max_questions
                    };
                });
                console.log('✅ Applications loaded successfully:', this.applications);
                
                // Populate dropdowns immediately after loading
                this.populateApplicationDropdown();
                this.populateUploadApplicationDropdown();
            } else {
                console.error('❌ Failed to load applications. Status:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                
                // Show user-friendly error
                this.showConnectionError();
            }
        } catch (error) {
            console.error('💥 Error loading applications:', error);
            console.error('💡 Make sure the server is running on http://localhost:3000');
            
            // Show user-friendly error
            this.showConnectionError();
        }
    }

    populateApplicationDropdown() {
        const applicationSelect = document.getElementById('applicationSelect');
        if (applicationSelect) {
            applicationSelect.innerHTML = '<option value="">Select Application</option>';
            Object.keys(this.applications).forEach(appKey => {
                const app = this.applications[appKey];
                const option = document.createElement('option');
                option.value = appKey;
                option.textContent = app.name; // Remove language labels as requested
                applicationSelect.appendChild(option);
            });
        }
    }

    populateUploadApplicationDropdown() {
        const uploadSelect = document.getElementById('uploadApplicationSelect');
        if (uploadSelect) {
            uploadSelect.innerHTML = '<option value="">Select Application</option>';
            Object.keys(this.applications).forEach(appKey => {
                const app = this.applications[appKey];
                const option = document.createElement('option');
                option.value = app.id;
                option.textContent = app.name;
                uploadSelect.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        // User details form submission
        document.getElementById('detailsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startQuiz();
        });

        // Quiz navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.previousQuestion());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitQuiz());

        // Admin functionality
        document.getElementById('adminToggle').addEventListener('click', () => this.showAdminLogin());
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.adminLogout());

        // Application selection
        document.getElementById('applicationSelect').addEventListener('change', (e) => this.handleApplicationChange(e));

        // Upload functionality
        document.getElementById('uploadApplicationSelect').addEventListener('change', () => this.updateUploadButton());
        document.getElementById('csvFileInput').addEventListener('change', () => this.updateUploadButton());
        document.getElementById('uploadQuestionsBtn').addEventListener('click', () => this.uploadQuestions());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });

        // Option selection
        document.addEventListener('change', (e) => {
            if (e.target.type === 'radio' && e.target.name === 'answer') {
                this.selectAnswer(e.target.value);
                this.updateOptionStyles();
            }
        });
    }

    updateUploadButton() {
        const appSelect = document.getElementById('uploadApplicationSelect');
        const fileInput = document.getElementById('csvFileInput');
        const uploadBtn = document.getElementById('uploadQuestionsBtn');
        
        uploadBtn.disabled = !appSelect.value || !fileInput.files.length;
    }

    async uploadQuestions() {
        const appSelect = document.getElementById('uploadApplicationSelect');
        const fileInput = document.getElementById('csvFileInput');
        const statusDiv = document.getElementById('uploadStatus');
        
        if (!appSelect.value || !fileInput.files.length) {
            this.showUploadStatus('Please select an application and CSV file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        formData.append('applicationId', appSelect.value);

        try {
            this.showUploadStatus('Uploading questions...', 'loading');
            
            const response = await fetch(`${this.baseURL}/upload-questions`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showUploadStatus(result.message, 'success');
                
                // Reset form
                fileInput.value = '';
                appSelect.value = '';
                this.updateUploadButton();
                
                // Refresh admin stats
                if (this.isAdmin) {
                    this.updateAdminStats();
                }
            } else {
                const error = await response.json();
                this.showUploadStatus(error.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus('Upload failed: ' + error.message, 'error');
        }
    }

    showUploadStatus(message, type) {
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.textContent = message;
        statusDiv.className = `upload-status ${type}`;
        statusDiv.classList.remove('hidden');
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 5000);
        }
    }

    // Admin Authentication
    showAdminLogin() {
        if (this.isAdmin) {
            this.showAdminPanel();
        } else {
            document.getElementById('adminModal').classList.remove('hidden');
        }
    }

    handleAdminLogin(e) {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
            this.isAdmin = true;
            document.getElementById('adminModal').classList.add('hidden');
            document.getElementById('adminToggle').textContent = 'Admin Panel';
            this.showAdminPanel();
            alert('Admin login successful!');
        } else {
            alert('Invalid credentials. Please try again.');
        }
    }

    async showAdminPanel() {
        document.getElementById('adminPanel').classList.remove('hidden');
        document.getElementById('userForm').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('quizSection').classList.add('hidden');
        
        await this.updateAdminStats();
        this.populateApplicationSettings();
    }

    populateApplicationSettings() {
        const container = document.getElementById('applicationSettings');
        if (!container) return;

        container.innerHTML = '';
        
        Object.keys(this.applications).forEach(appKey => {
            const app = this.applications[appKey];
            const appDiv = document.createElement('div');
            appDiv.className = 'application-setting';
            appDiv.innerHTML = `
                <div class="app-header">
                    <h4>${app.name}</h4>
                </div>
                <div class="app-controls">
                    <label>Question Count for Quiz:</label>
                    <input type="number" 
                           id="questionCount_${app.id}" 
                           value="${app.maxQuestions}" 
                           min="1" 
                           max="${app.questionCount}"
                           onchange="window.quizApp.updateApplicationSetting('${app.id}', 'maxQuestions', this.value)">
                    <span class="max-count">Available: ${app.questionCount}</span>
                </div>
            `;
            container.appendChild(appDiv);
        });
    }

    async updateApplicationSetting(appId, setting, value) {
        try {
            console.log(`🔧 Updating application ${appId}: ${setting} = ${value}`);
            const response = await fetch(`${this.baseURL}/applications/${appId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    max_questions: parseInt(value) // Send as max_questions instead of question_count
                })
            });

            if (response.ok) {
                // Update local application data
                Object.keys(this.applications).forEach(appKey => {
                    if (this.applications[appKey].id == appId) {
                        this.applications[appKey].maxQuestions = parseInt(value); // Update maxQuestions instead of questionCount
                    }
                });
                
                console.log(`✅ Updated application ${appId}: max questions = ${value}`);
            } else {
                console.error('❌ Failed to update application setting');
                const errorText = await response.text();
                console.error('Error details:', errorText);
            }
        } catch (error) {
            console.error('💥 Error updating application setting:', error);
        }
    }

    adminLogout() {
        this.isAdmin = false;
        document.getElementById('adminPanel').classList.add('hidden');
        document.getElementById('userForm').classList.remove('hidden');
        document.getElementById('adminToggle').textContent = 'Admin Login';
        alert('Logged out successfully!');
    }

    async updateAdminStats() {
        try {
            console.log('🔍 Loading admin stats from:', `${this.baseURL}/quiz-results`);
            const response = await fetch(`${this.baseURL}/quiz-results`);
            console.log('📡 Admin stats response status:', response.status);
            
            if (response.ok) {
                const results = await response.json();
                console.log('📊 Admin stats data received:', results.length, 'results');
                console.log('Sample result:', results[0]);
                
                this.updateResultsSummary(results);
                this.updateStatsDisplay(results);
            } else {
                console.error('❌ Failed to load admin stats, status:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
            }
        } catch (error) {
            console.error('💥 Error loading admin stats:', error);
        }
    }

    updateResultsSummary(results) {
        const summaryDiv = document.getElementById('resultsSummary');
        
        console.log('📊 Updating results summary with', results.length, 'results');
        if (results.length > 0) {
            console.log('Sample result for summary:', results[0]);
        }
        
        if (results.length === 0) {
            summaryDiv.innerHTML = '<p>No quiz results available.</p>';
            return;
        }

        const totalUsers = results.length;
        const averageScore = (results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalUsers).toFixed(1);
        const highestScore = Math.max(...results.map(r => r.percentage || 0));
        const lowestScore = Math.min(...results.map(r => r.percentage || 0));

        summaryDiv.innerHTML = `
            <div class="stats-item">
                <span>Total Users:</span>
                <span class="stats-value">${totalUsers}</span>
            </div>
            <div class="stats-item">
                <span>Average Score:</span>
                <span class="stats-value">${averageScore}%</span>
            </div>
            <div class="stats-item">
                <span>Highest Score:</span>
                <span class="stats-value">${highestScore}%</span>
            </div>
            <div class="stats-item">
                <span>Lowest Score:</span>
                <span class="stats-value">${lowestScore}%</span>
            </div>
        `;
    }

    updateStatsDisplay(results) {
        const statsDiv = document.getElementById('statsDisplay');
        
        console.log('📊 Updating stats display with', results.length, 'results');
        
        if (results.length === 0) {
            statsDiv.innerHTML = '<p>No statistics available.</p>';
            return;
        }

        const excellent = results.filter(r => (r.percentage || 0) >= 90).length;
        const good = results.filter(r => (r.percentage || 0) >= 75 && (r.percentage || 0) < 90).length;
        const average = results.filter(r => (r.percentage || 0) >= 60 && (r.percentage || 0) < 75).length;
        const poor = results.filter(r => (r.percentage || 0) < 60).length;

        statsDiv.innerHTML = `
            <div class="stats-item">
                <span>Excellent (90%+):</span>
                <span class="stats-value">${excellent}</span>
            </div>
            <div class="stats-item">
                <span>Good (75-89%):</span>
                <span class="stats-value">${good}</span>  
            </div>
            <div class="stats-item">
                <span>Average (60-74%):</span>
                <span class="stats-value">${average}</span>
            </div>
            <div class="stats-item">
                <span>Poor (<60%):</span>
                <span class="stats-value">${poor}</span>
            </div>
        `;
    }

    handleApplicationChange(e) {
        this.selectedApplication = e.target.value;
        console.log('Selected application:', this.selectedApplication);
    }

    async startQuiz() {
        // Get user details
        this.userEmail = document.getElementById('userEmail').value.trim();
        this.userName = document.getElementById('userName').value.trim();
        const selectedApp = document.getElementById('applicationSelect').value;

        if (!this.userEmail || !this.userName) {
            alert('Please enter both email and name to start the quiz.');
            return;
        }

        if (!selectedApp) {
            alert('Please select an application to start the quiz.');
            return;
        }

        this.selectedApplication = selectedApp;
        const app = this.applications[selectedApp];
        this.currentQuestionCount = app.maxQuestions; // Use admin-configured limit instead of total count

        try {
            console.log(`🎯 Starting quiz for ${app.name} with ${this.currentQuestionCount} questions (out of ${app.questionCount} total)`);
            // Load questions from backend
            const response = await fetch(`${this.baseURL}/questions/${app.id}?count=${this.currentQuestionCount}`);
            
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            
            this.questions = await response.json();
            
            if (this.questions.length === 0) {
                alert(`No questions available for ${app.name}. Please contact the administrator.`);
                return;
            }
            
            // Transform questions to match expected format
            this.questions = this.questions.map(q => ({
                question: q.question,
                optionA: q.option_a,
                optionB: q.option_b,
                optionC: q.option_c,
                optionD: q.option_d,
                correctAnswer: q.correct_answer
            }));
            
            this.userAnswers = new Array(this.questions.length).fill(null);
            this.currentQuestionIndex = 0;
            this.startTime = new Date();

            // Show quiz section and hide user form
            document.getElementById('userForm').classList.add('hidden');
            document.getElementById('quizSection').classList.remove('hidden');

            // Start timer
            this.startTimer();

            // Display first question
            this.displayQuestion();
            
            console.log(`Started quiz for ${app.name} with ${this.questions.length} questions`);
            
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to load quiz questions. Please try again.');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const currentTime = new Date();
                const elapsed = Math.floor((currentTime - this.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                document.getElementById('timer').textContent = 
                    `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const questionElement = document.getElementById('questionText');
        const optionsContainer = document.getElementById('optionsContainer');
        const questionCounter = document.getElementById('questionCounter');
        const progressFill = document.getElementById('progressFill');

        questionElement.textContent = question.question;
        questionCounter.textContent = `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`;

        // Update progress bar
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        progressFill.style.width = `${progress}%`;

        // Create options
        optionsContainer.innerHTML = '';
        const options = ['A', 'B', 'C', 'D'];
        options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'answer';
            input.value = option;
            input.id = `option${option}`;

            const label = document.createElement('label');
            label.htmlFor = `option${option}`;
            label.textContent = `${option}. ${question[`option${option}`]}`;

            optionDiv.appendChild(input);
            optionDiv.appendChild(label);
            optionsContainer.appendChild(optionDiv);

            // Check if this option was previously selected
            if (this.userAnswers[this.currentQuestionIndex] === option) {
                input.checked = true;
            }
        });

        this.updateNavigationButtons();
        this.updateOptionStyles();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }

    selectAnswer(answer) {
        this.userAnswers[this.currentQuestionIndex] = answer;
    }

    updateOptionStyles() {
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            const input = option.querySelector('input[type="radio"]');
            if (input.checked) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    async submitQuiz() {
        if (confirm('Are you sure you want to submit your quiz? This action cannot be undone.')) {
            this.endTime = new Date();
            await this.calculateAndSaveResults();
        }
    }

    async calculateAndSaveResults() {
        const timeTaken = Math.floor((this.endTime - this.startTime) / 1000);
        let correctAnswers = 0;

        // Calculate score
        this.questions.forEach((question, index) => {
            if (this.userAnswers[index] === question.correctAnswer) {
                correctAnswers++;
            }
        });

        const totalQuestions = this.questions.length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);

        // Save to backend
        try {
            const app = this.applications[this.selectedApplication];
            const quizData = {
                name: this.userName,
                email: this.userEmail,
                applicationId: app.id,
                score: correctAnswers,
                totalQuestions: totalQuestions,
                percentage: percentage,
                timeTaken: timeTaken
            };
            
            console.log('💾 === SAVING QUIZ RESULTS ===');
            console.log('📤 Sending data to server:', JSON.stringify(quizData, null, 2));
            console.log('🎯 URL:', `${this.baseURL}/quiz-results`);
            
            const response = await fetch(`${this.baseURL}/quiz-results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(quizData)
            });
            
            console.log('📡 Save response status:', response.status, response.statusText);
            
            if (response.ok) {
                const responseData = await response.json();
                console.log('✅ Quiz result saved successfully:', responseData);
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to save quiz result. Status:', response.status);
                console.error('Error details:', errorText);
            }
        } catch (error) {
            console.error('💥 Error saving quiz result:', error);
        }

        // Display results
        this.displayResults(correctAnswers, totalQuestions, percentage, timeTaken);
    }

    displayResults(correctAnswers, totalQuestions, percentage, timeTaken) {
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Hide quiz section and show results
        document.getElementById('quizSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');

        // Update results display
        document.getElementById('finalScore').textContent = `Your Score: ${correctAnswers}/${totalQuestions}`;
        document.getElementById('percentage').textContent = `${percentage}%`;

        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        document.getElementById('timeTaken').textContent = 
            `Time Taken: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update result message
        let message = 'Great job!';
        if (percentage >= 90) {
            message = 'Excellent! Outstanding performance!';
        } else if (percentage >= 75) {
            message = 'Great job! Well done!';
        } else if (percentage >= 60) {
            message = 'Good effort! Keep practicing!';
        } else {
            message = 'Don\'t give up! Review the concepts and try again!';
        }

        document.getElementById('resultMessage').textContent = message;
    }

    showConnectionError() {
        // Show error message in both dropdowns
        const applicationSelect = document.getElementById('applicationSelect');
        const uploadSelect = document.getElementById('uploadApplicationSelect');
        
        if (applicationSelect) {
            applicationSelect.innerHTML = '<option value="">⚠️ Server connection failed - Please start the server</option>';
            applicationSelect.style.color = 'red';
        }
        
        if (uploadSelect) {
            uploadSelect.innerHTML = '<option value="">⚠️ Server connection failed - Please start the server</option>';
            uploadSelect.style.color = 'red';
        }
        
        // Show a more prominent error message
        const header = document.querySelector('header p');
        if (header) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                header.innerHTML = '⚠️ <strong>Database server is not running!</strong><br>Please run start-backup-server.bat or: <code>node server-backup.js</code>';
            } else {
                header.innerHTML = '⚠️ <strong>Application is starting up...</strong><br>Please wait a moment and refresh the page.';
            }
            header.style.color = 'red';
            header.style.backgroundColor = '#ffebee';
            header.style.padding = '10px';
            header.style.borderRadius = '5px';
            header.style.border = '1px solid #f44336';
        }
    }
}

// Global functions for admin operations
async function viewAllResults() {
    const app = window.quizApp;
    if (!app.isAdmin) {
        alert('Access denied. Admin login required.');
        return;
    }

    try {
        console.log('🔍 Loading all results from:', `${app.baseURL}/quiz-results`);
        const response = await fetch(`${app.baseURL}/quiz-results`);
        console.log('📡 View all results response status:', response.status);
        
        if (response.ok) {
            const results = await response.json();
            console.log('📊 View all results data received:', results.length, 'results');
            displayResultsTable(results);
        } else {
            console.error('❌ Failed to load results, status:', response.status);
            const errorText = await response.text();
            console.error('Error details:', errorText);
        }
    } catch (error) {
        console.error('💥 Error loading results:', error);
    }
}

function displayResultsTable(results) {
    const modal = document.getElementById('resultsModal');
    const container = document.getElementById('resultsTableContainer');
    
    console.log('📊 Displaying results table with', results.length, 'results');
    if (results.length > 0) {
        console.log('Sample result for table:', results[0]);
    }
    
    if (results.length === 0) {
        container.innerHTML = '<p>No quiz results available.</p>';
        modal.classList.remove('hidden');
        return;
    }

    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Application</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Time Taken</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(result => {
        // Format time properly (convert seconds to MM:SS)
        const timeTaken = result.timeTaken || 0;
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Format date properly
        const date = new Date(result.createdAt);
        const dateFormatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        tableHTML += `
            <tr>
                <td>${result.name || 'N/A'}</td>
                <td>${result.email || 'N/A'}</td>
                <td>${result.application || 'N/A'}</td>
                <td>${result.score || 0}/${result.totalQuestions || 0}</td>
                <td>${(result.percentage || 0).toFixed(1)}%</td>
                <td>${timeFormatted}</td>
                <td>${dateFormatted}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    modal.classList.remove('hidden');
}

async function exportAllResults() {
    const app = window.quizApp;
    if (!app.isAdmin) {
        alert('Access denied. Admin login required.');
        return;
    }

    try {
        const response = await fetch(`${app.baseURL}/quiz-results`);
        if (response.ok) {
            const results = await response.json();
            
            if (results.length === 0) {
                alert('No results to export.');
                return;
            }

            // Create CSV content
            const csvHeaders = 'Name,Email,Application,Score,Total Questions,Percentage,Time Taken (seconds),Timestamp\n';
            const csvContent = results.map(result => {
                return `"${result.name}","${result.email}","${result.application}",${result.score},${result.totalQuestions},${result.percentage},${result.timeTaken},"${new Date(result.createdAt).toISOString()}"`;
            }).join('\n');

            const csvData = csvHeaders + csvContent;
            
            // Download CSV
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `quiz_results_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error exporting results:', error);
        alert('Failed to export results.');
    }
}

async function clearStoredResults() {
    const app = window.quizApp;
    if (!app.isAdmin) {
        alert('Access denied. Admin login required.');
        return;
    }

    if (confirm('Are you sure you want to clear all stored quiz results? This action cannot be undone.')) {
        try {
            const response = await fetch(`${app.baseURL}/quiz-results`, {
                method: 'DELETE'
            });

            if (response.ok) {
                app.updateAdminStats();
                
                // Hide the results section if it's currently visible
                document.getElementById('resultsSection').classList.add('hidden');
                
                // Ensure the admin panel remains visible
                document.getElementById('adminPanel').classList.remove('hidden');
                
                alert('All stored quiz results have been cleared.');
            } else {
                alert('Failed to clear results.');
            }
        } catch (error) {
            console.error('Error clearing results:', error);
            alert('Failed to clear results.');
        }
    }
}

function downloadSampleCSV() {
    const csvContent = `question,optionA,optionB,optionC,optionD,correctAnswer
"What is the size of int in Java?","16 bits","32 bits","64 bits","8 bits","B"
"Which of the following is not a Java keyword?","static","Boolean","void","private","B"
"What is the default value of boolean variable in Java?","true","false","0","null","B"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_questions.csv';
    link.click();
    window.URL.revokeObjectURL(url);
}

// Initialize the quiz application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new JavaQuizApp();
});
