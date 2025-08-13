const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// In-memory storage for quiz results
const quizResults = [];

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
    
    // Real question sets for each application
    const questionSets = {
        1: [ // RoadOps - Java
            {
                id: 0,
                question: "What is the size of int in Java?",
                options: { A: "16 bits", B: "32 bits", C: "64 bits", D: "8 bits" },
                correct: "B"
            },
            {
                id: 1,
                question: "Which of the following is not a Java keyword?",
                options: { A: "static", B: "Boolean", C: "void", D: "private" },
                correct: "B"
            },
            {
                id: 2,
                question: "What is the default value of boolean variable in Java?",
                options: { A: "true", B: "false", C: "0", D: "null" },
                correct: "B"
            },
            {
                id: 3,
                question: "Which method is used to start a thread in Java?",
                options: { A: "init()", B: "start()", C: "run()", D: "resume()" },
                correct: "B"
            },
            {
                id: 4,
                question: "What is the parent class of all classes in Java?",
                options: { A: "String", B: "Object", C: "Class", D: "Parent" },
                correct: "B"
            },
            {
                id: 5,
                question: "Which of the following is used to find and fix bugs in Java programs?",
                options: { A: "JVM", B: "JDB", C: "JDK", D: "JRE" },
                correct: "B"
            },
            {
                id: 6,
                question: "What is the extension of Java code files?",
                options: { A: ".js", B: ".txt", C: ".class", D: ".java" },
                correct: "D"
            },
            {
                id: 7,
                question: "Which environment variable is used to set Java path?",
                options: { A: "MAVEN_Path", B: "JavaPATH", C: "JAVA_HOME", D: "JAVA_PATH" },
                correct: "C"
            },
            {
                id: 8,
                question: "Which of the following is not an OOPS concept in Java?",
                options: { A: "Polymorphism", B: "Inheritance", C: "Compilation", D: "Encapsulation" },
                correct: "C"
            },
            {
                id: 9,
                question: "What is not the use of 'this' keyword in Java?",
                options: { A: "Referring to instance variable", B: "Passing itself to method", C: "Passing to another method", D: "Constructor chaining" },
                correct: "B"
            },
            {
                id: 10,
                question: "Which of the following is a type of polymorphism in Java?",
                options: { A: "Multiple polymorphism", B: "Compile time polymorphism", C: "Multilevel polymorphism", D: "Execution time polymorphism" },
                correct: "B"
            },
            {
                id: 11,
                question: "What is the size of float and double in Java?",
                options: { A: "32 and 64", B: "32 and 32", C: "64 and 64", D: "64 and 32" },
                correct: "A"
            },
            {
                id: 12,
                question: "Arrays in Java are-",
                options: { A: "Object references", B: "objects", C: "Primitive data type", D: "None of the above" },
                correct: "B"
            },
            {
                id: 13,
                question: "When an array is passed to a method what does the method receive?",
                options: { A: "The reference of the array", B: "A copy of the array", C: "Length of the array", D: "Copy of first element" },
                correct: "A"
            },
            {
                id: 14,
                question: "What is the default value of an object reference defined as an instance variable?",
                options: { A: "0", B: "null", C: "not defined", D: "depends on type" },
                correct: "B"
            },
            {
                id: 15,
                question: "Which of the following keywords is used to define interfaces in Java?",
                options: { A: "intf", B: "Intf", C: "interface", D: "Interface" },
                correct: "C"
            },
            {
                id: 16,
                question: "Which of the following is correct about constructor?",
                options: { A: "Constructor can have return type", B: "Constructor name must be same as class name", C: "Constructor can be inherited", D: "Constructor cannot be overloaded" },
                correct: "B"
            },
            {
                id: 17,
                question: "What will happen if constructor of a class is declared as private?",
                options: { A: "Object cannot be created in same package", B: "Object can only be created within class", C: "Public methods can be called", D: "Class can be inherited" },
                correct: "B"
            },
            {
                id: 18,
                question: "Which of the following statements is correct about inheritance in Java?",
                options: { A: "Private members accessible in subclass", B: "Protected members accessible in subclass", C: "Public members not accessible in subclass", D: "Default members not accessible from different package" },
                correct: "D"
            },
            {
                id: 19,
                question: "What is method overriding in Java?",
                options: { A: "Multiple methods with same name different parameters", B: "Method in subclass with same signature as parent", C: "Multiple constructors in class", D: "None of the above" },
                correct: "B"
            },
            {
                id: 20,
                question: "Which of the following statements is correct about static methods?",
                options: { A: "Static methods can be overridden", B: "Static methods can access instance variables", C: "Static methods can be called without object", D: "Static methods can use this keyword" },
                correct: "C"
            },
            {
                id: 21,
                question: "What is the purpose of finalize() method in Java?",
                options: { A: "Cleanup before garbage collection", B: "Delete object from memory", C: "End program execution", D: "None of the above" },
                correct: "A"
            },
            {
                id: 22,
                question: "Which exception is thrown when java is out of memory?",
                options: { A: "MemoryError", B: "OutOfMemoryError", C: "MemoryOutOfBoundsException", D: "MemoryFullException" },
                correct: "B"
            },
            {
                id: 23,
                question: "Which keyword is used to define a constant variable in Java?",
                options: { A: "const", B: "constant", C: "final", D: "static" },
                correct: "C"
            },
            {
                id: 24,
                question: "What is the use of super keyword in Java?",
                options: { A: "Call superclass method", B: "Call superclass constructor", C: "Access superclass variables", D: "All of the above" },
                correct: "D"
            }
        ],
        2: [ // RoadSales - C#
            {
                id: 0,
                question: "What is the file extension for C# source files?",
                options: { A: ".cs", B: ".c#", C: ".csharp", D: ".net" },
                correct: "A"
            },
            {
                id: 1,
                question: "Which keyword is used to define a class in C#?",
                options: { A: "class", B: "Class", C: "struct", D: "interface" },
                correct: "A"
            },
            {
                id: 2,
                question: "What is the correct way to declare a variable in C#?",
                options: { A: "var name = value", B: "variable name = value", C: "dim name = value", D: "let name = value" },
                correct: "A"
            },
            {
                id: 3,
                question: "Which access modifier makes a member accessible only within the same class?",
                options: { A: "public", B: "private", C: "protected", D: "internal" },
                correct: "B"
            },
            {
                id: 4,
                question: "What is the base class for all classes in C#?",
                options: { A: "Object", B: "Base", C: "System", D: "Class" },
                correct: "A"
            },
            {
                id: 5,
                question: "Which operator is used for string concatenation in C#?",
                options: { A: "&", B: "+", C: ".", D: "||" },
                correct: "B"
            },
            {
                id: 6,
                question: "What is the correct syntax for a for loop in C#?",
                options: { A: "for(int i=0; i<10; i++)", B: "for i=0 to 10", C: "for(i in range(10))", D: "foreach(i in 10)" },
                correct: "A"
            },
            {
                id: 7,
                question: "Which keyword is used to handle exceptions in C#?",
                options: { A: "catch", B: "except", C: "handle", D: "trap" },
                correct: "A"
            },
            {
                id: 8,
                question: "What is the correct way to define a method in C#?",
                options: { A: "public void MethodName() {}", B: "function MethodName() {}", C: "def MethodName():", D: "method MethodName() {}" },
                correct: "A"
            },
            {
                id: 9,
                question: "Which collection type is similar to arrays but can resize dynamically?",
                options: { A: "List", B: "Array", C: "Collection", D: "Set" },
                correct: "A"
            },
            {
                id: 10,
                question: "What is the correct way to inherit from a class in C#?",
                options: { A: "class Child : Parent", B: "class Child extends Parent", C: "class Child inherits Parent", D: "class Child from Parent" },
                correct: "A"
            },
            {
                id: 11,
                question: "Which keyword is used to prevent a class from being inherited?",
                options: { A: "sealed", B: "final", C: "abstract", D: "static" },
                correct: "A"
            },
            {
                id: 12,
                question: "What is the purpose of the using statement in C#?",
                options: { A: "Import namespaces", B: "Include files", C: "Define variables", D: "Create objects" },
                correct: "A"
            },
            {
                id: 13,
                question: "Which data type is used to store true/false values in C#?",
                options: { A: "bool", B: "boolean", C: "bit", D: "flag" },
                correct: "A"
            },
            {
                id: 14,
                question: "What is the correct way to create an array in C#?",
                options: { A: "int[] arr = new int[10]", B: "int arr[10]", C: "array<int> arr(10)", D: "int arr = new array(10)" },
                correct: "A"
            },
            {
                id: 15,
                question: "Which keyword is used to define a constant in C#?",
                options: { A: "const", B: "final", C: "readonly", D: "static" },
                correct: "A"
            },
            {
                id: 16,
                question: "What is the difference between struct and class in C#?",
                options: { A: "struct is value type class is reference type", B: "struct is reference type class is value type", C: "No difference", D: "struct cannot have methods" },
                correct: "A"
            },
            {
                id: 17,
                question: "Which loop is guaranteed to execute at least once in C#?",
                options: { A: "do-while", B: "while", C: "for", D: "foreach" },
                correct: "A"
            },
            {
                id: 18,
                question: "What is the correct way to check if a string is null or empty?",
                options: { A: "string.IsNullOrEmpty()", B: "string.isEmpty()", C: "string == null || string == \"\"", D: "string.isNull()" },
                correct: "A"
            },
            {
                id: 19,
                question: "Which keyword is used to define an interface in C#?",
                options: { A: "interface", B: "Interface", C: "abstract", D: "contract" },
                correct: "A"
            },
            {
                id: 20,
                question: "What is the purpose of the virtual keyword in C#?",
                options: { A: "Allow method overriding", B: "Make method static", C: "Make method private", D: "Make method final" },
                correct: "A"
            },
            {
                id: 21,
                question: "Which operator is used for type casting in C#?",
                options: { A: "()", B: "as", C: "cast", D: "convert" },
                correct: "A"
            },
            {
                id: 22,
                question: "What is the correct way to define a property in C#?",
                options: { A: "public int Property { get; set; }", B: "property int Property", C: "int Property() {}", D: "public Property: int" },
                correct: "A"
            },
            {
                id: 23,
                question: "Which keyword is used to call the base class constructor?",
                options: { A: "base", B: "super", C: "parent", D: "this" },
                correct: "A"
            },
            {
                id: 24,
                question: "What is the purpose of the static keyword in C#?",
                options: { A: "Belongs to class not instance", B: "Make variable constant", C: "Make method private", D: "Allow inheritance" },
                correct: "A"
            }
        ],
        3: [ // UES - Python
            {
                id: 0,
                question: "What is the file extension for Python files?",
                options: { A: ".py", B: ".python", C: ".pt", D: ".pyt" },
                correct: "A"
            },
            {
                id: 1,
                question: "Which keyword is used to define a function in Python?",
                options: { A: "function", B: "def", C: "func", D: "define" },
                correct: "B"
            },
            {
                id: 2,
                question: "What is the correct way to create a comment in Python?",
                options: { A: "// comment", B: "/* comment */", C: "# comment", D: "-- comment" },
                correct: "C"
            },
            {
                id: 3,
                question: "Which data type is mutable in Python?",
                options: { A: "tuple", B: "string", C: "list", D: "int" },
                correct: "C"
            },
            {
                id: 4,
                question: "What is the output of print(2 ** 3)?",
                options: { A: "6", B: "8", C: "9", D: "12" },
                correct: "B"
            },
            {
                id: 5,
                question: "Which operator is used for floor division in Python?",
                options: { A: "/", B: "//", C: "%", D: "**" },
                correct: "B"
            },
            {
                id: 6,
                question: "What is the correct way to create a list in Python?",
                options: { A: "list = []", B: "list = {}", C: "list = ()", D: "list = <>" },
                correct: "A"
            },
            {
                id: 7,
                question: "Which keyword is used to check if a value is in a list?",
                options: { A: "in", B: "is", C: "has", D: "contains" },
                correct: "A"
            },
            {
                id: 8,
                question: "What is the correct way to define a class in Python?",
                options: { A: "class MyClass:", B: "class MyClass()", C: "def MyClass:", D: "Class MyClass:" },
                correct: "A"
            },
            {
                id: 9,
                question: "Which method is used to add an element to a list?",
                options: { A: "append()", B: "add()", C: "insert()", D: "push()" },
                correct: "A"
            },
            {
                id: 10,
                question: "What is the purpose of the __init__ method?",
                options: { A: "Constructor", B: "Destructor", C: "Static method", D: "Class method" },
                correct: "A"
            },
            {
                id: 11,
                question: "Which keyword is used to handle exceptions in Python?",
                options: { A: "try", B: "catch", C: "except", D: "handle" },
                correct: "C"
            },
            {
                id: 12,
                question: "What is the correct way to create a dictionary in Python?",
                options: { A: "dict = []", B: "dict = {}", C: "dict = ()", D: "dict = <>" },
                correct: "B"
            },
            {
                id: 13,
                question: "Which function is used to get the length of a list?",
                options: { A: "length()", B: "size()", C: "count()", D: "len()" },
                correct: "D"
            },
            {
                id: 14,
                question: "What is the output of print(type([]))?",
                options: { A: "<class 'array'>", B: "<class 'list'>", C: "<class 'tuple'>", D: "<class 'dict'>" },
                correct: "B"
            },
            {
                id: 15,
                question: "Which keyword is used to define a lambda function?",
                options: { A: "lambda", B: "function", C: "def", D: "func" },
                correct: "A"
            },
            {
                id: 16,
                question: "What is the correct way to open a file in Python?",
                options: { A: "open('file.txt')", B: "file('file.txt')", C: "File('file.txt')", D: "fopen('file.txt')" },
                correct: "A"
            },
            {
                id: 17,
                question: "Which method is used to remove an element from a list?",
                options: { A: "delete()", B: "remove()", C: "pop()", D: "erase()" },
                correct: "B"
            },
            {
                id: 18,
                question: "What is the purpose of the self parameter?",
                options: { A: "Reference to current instance", B: "Reference to class", C: "Reference to parent", D: "Reference to module" },
                correct: "A"
            },
            {
                id: 19,
                question: "Which operator is used for string formatting?",
                options: { A: "+", B: "%", C: ".", D: "&" },
                correct: "B"
            },
            {
                id: 20,
                question: "What is the output of print('Hello' + 'World')?",
                options: { A: "Hello World", B: "HelloWorld", C: "Hello+World", D: "Error" },
                correct: "B"
            },
            {
                id: 21,
                question: "Which keyword is used to import modules?",
                options: { A: "import", B: "include", C: "require", D: "use" },
                correct: "A"
            },
            {
                id: 22,
                question: "What is the correct way to create a tuple?",
                options: { A: "tuple = []", B: "tuple = {}", C: "tuple = ()", D: "tuple = <>" },
                correct: "C"
            },
            {
                id: 23,
                question: "Which function is used to convert string to integer?",
                options: { A: "int()", B: "str()", C: "float()", D: "bool()" },
                correct: "A"
            },
            {
                id: 24,
                question: "What is the purpose of the pass keyword?",
                options: { A: "Skip current iteration", B: "Exit from loop", C: "Do nothing", D: "Return value" },
                correct: "C"
            }
        ],
        4: [ // Digital - TypeScript
            {
                id: 0,
                question: "What is the file extension for TypeScript files?",
                options: { A: ".ts", B: ".js", C: ".tsx", D: ".typescript" },
                correct: "A"
            },
            {
                id: 1,
                question: "Which command is used to compile TypeScript files?",
                options: { A: "tsc", B: "typescript", C: "ts-compile", D: "tscompile" },
                correct: "A"
            },
            {
                id: 2,
                question: "What is the correct way to declare a variable with type in TypeScript?",
                options: { A: "let name: string", B: "var name as string", C: "string name", D: "name: string" },
                correct: "A"
            },
            {
                id: 3,
                question: "Which keyword is used to define an interface in TypeScript?",
                options: { A: "interface", B: "type", C: "class", D: "struct" },
                correct: "A"
            },
            {
                id: 4,
                question: "What is the purpose of the 'any' type in TypeScript?",
                options: { A: "Represents any value", B: "Represents undefined", C: "Represents null", D: "Represents string" },
                correct: "A"
            },
            {
                id: 5,
                question: "Which operator is used for optional properties in TypeScript?",
                options: { A: "?", B: "!", C: "&", D: "|" },
                correct: "A"
            },
            {
                id: 6,
                question: "What is the correct way to define a function type in TypeScript?",
                options: { A: "(x: number) => number", B: "function(x: number): number", C: "number function(number x)", D: "func(x: number): number" },
                correct: "A"
            },
            {
                id: 7,
                question: "Which keyword is used to define a class in TypeScript?",
                options: { A: "class", B: "Class", C: "interface", D: "type" },
                correct: "A"
            },
            {
                id: 8,
                question: "What is the purpose of generics in TypeScript?",
                options: { A: "Create reusable components", B: "Define constants", C: "Handle errors", D: "Import modules" },
                correct: "A"
            },
            {
                id: 9,
                question: "Which access modifier makes a property accessible only within the class?",
                options: { A: "private", B: "public", C: "protected", D: "readonly" },
                correct: "A"
            },
            {
                id: 10,
                question: "What is the correct way to extend an interface?",
                options: { A: "interface Child extends Parent", B: "interface Child inherits Parent", C: "interface Child from Parent", D: "interface Child: Parent" },
                correct: "A"
            },
            {
                id: 11,
                question: "Which type represents a value that can be null or undefined?",
                options: { A: "null | undefined", B: "nullable", C: "optional", D: "maybe" },
                correct: "A"
            },
            {
                id: 12,
                question: "What is the purpose of the 'readonly' modifier?",
                options: { A: "Make property immutable", B: "Make property private", C: "Make property optional", D: "Make property public" },
                correct: "A"
            },
            {
                id: 13,
                question: "Which operator is used for type assertion in TypeScript?",
                options: { A: "as", B: "is", C: "typeof", D: "instanceof" },
                correct: "A"
            },
            {
                id: 14,
                question: "What is the correct way to define an enum in TypeScript?",
                options: { A: "enum Color { Red, Green, Blue }", B: "enum Color = { Red, Green, Blue }", C: "Color enum { Red, Green, Blue }", D: "enum { Color, Red, Green, Blue }" },
                correct: "A"
            },
            {
                id: 15,
                question: "Which keyword is used to import modules in TypeScript?",
                options: { A: "import", B: "include", C: "require", D: "use" },
                correct: "A"
            },
            {
                id: 16,
                question: "What is the purpose of the 'export' keyword?",
                options: { A: "Make module members available to other modules", B: "Exit from function", C: "Export data to file", D: "Create public method" },
                correct: "A"
            },
            {
                id: 17,
                question: "Which type is used for arrays in TypeScript?",
                options: { A: "Array<T> or T[]", B: "List<T>", C: "Collection<T>", D: "Set<T>" },
                correct: "A"
            },
            {
                id: 18,
                question: "What is the correct way to define a tuple in TypeScript?",
                options: { A: "[string, number]", B: "(string, number)", C: "{string, number}", D: "<string, number>" },
                correct: "A"
            },
            {
                id: 19,
                question: "Which operator is used for union types in TypeScript?",
                options: { A: "|", B: "&", C: "+", D: "||" },
                correct: "A"
            },
            {
                id: 20,
                question: "What is the purpose of the 'namespace' keyword?",
                options: { A: "Organize code into logical groups", B: "Define variables", C: "Create classes", D: "Import modules" },
                correct: "A"
            },
            {
                id: 21,
                question: "Which keyword is used for type guards in TypeScript?",
                options: { A: "is", B: "as", C: "typeof", D: "instanceof" },
                correct: "A"
            },
            {
                id: 22,
                question: "What is the correct way to define a decorator in TypeScript?",
                options: { A: "@decorator", B: "#decorator", C: "decorator:", D: "[decorator]" },
                correct: "A"
            },
            {
                id: 23,
                question: "Which configuration file is used for TypeScript projects?",
                options: { A: "tsconfig.json", B: "typescript.json", C: "config.ts", D: "ts.config" },
                correct: "A"
            },
            {
                id: 24,
                question: "What is the purpose of the 'declare' keyword?",
                options: { A: "Declare ambient types", B: "Declare variables", C: "Declare functions", D: "Declare classes" },
                correct: "A"
            }
        ]
    };
    
    const questions = questionSets[id] || [];
    if (questions.length === 0) {
        return res.status(404).json({ error: 'No questions found for this application' });
    }
    
    // Shuffle questions and take the requested count
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, questions.length));
    
    console.log(`✅ Returning ${selected.length} questions for application ${id}`);
    res.json(selected);
});

// Update application
app.put('/api/applications/:id', (req, res) => {
    res.json({ success: true });
});

// Save results
app.post('/api/quiz-results', (req, res) => {
    try {
        const result = {
            id: quizResults.length + 1,
            ...req.body,
            timestamp: new Date().toISOString()
        };
        
        quizResults.push(result);
        
        console.log(`💾 Quiz result saved for ${result.name} (${result.email})`);
        console.log(`📊 Score: ${result.score}/${result.totalQuestions} (${result.percentage}%) - Time: ${result.timeTaken}s`);
        
        res.json({ 
            success: true, 
            message: 'Result saved successfully',
            id: result.id
        });
    } catch (error) {
        console.error('❌ Error saving quiz result:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save result' 
        });
    }
});

// Get all results (for admin viewing)
app.get('/api/quiz-results', (req, res) => {
    res.json({
        total: quizResults.length,
        results: quizResults
    });
});

// Debug endpoint
app.get('/api/debug/database', (req, res) => {
    res.json({
        status: 'Simple server running',
        applications: 4,
        questionsPerApp: 25,
        totalResults: quizResults.length,
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
