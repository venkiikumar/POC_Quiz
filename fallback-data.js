// Fallback questions for when database is not available
const fallbackQuestions = {
    1: [ // RoadOps
        {
            id: 0,
            question: "What is the primary purpose of RoadOps?",
            options: {
                A: "Road maintenance operations",
                B: "Traffic management",
                C: "Fleet optimization", 
                D: "Route planning"
            },
            correct: "A"
        },
        {
            id: 1,
            question: "Which metric is most important for RoadOps efficiency?",
            options: {
                A: "Response time",
                B: "Cost per mile",
                C: "Vehicle utilization",
                D: "All of the above"
            },
            correct: "D"
        },
        {
            id: 2,
            question: "What type of data does RoadOps primarily handle?",
            options: {
                A: "Operational data",
                B: "Financial data",
                C: "Customer data",
                D: "Marketing data"
            },
            correct: "A"
        }
    ],
    2: [ // RoadSales
        {
            id: 0,
            question: "What is the main feature of RoadSales?",
            options: {
                A: "Sales tracking",
                B: "Customer management", 
                C: "Lead generation",
                D: "All of the above"
            },
            correct: "D"
        },
        {
            id: 1,
            question: "RoadSales helps optimize which process?",
            options: {
                A: "Sales pipeline",
                B: "Customer onboarding",
                C: "Revenue forecasting",
                D: "All of the above"
            },
            correct: "D"
        },
        {
            id: 2,
            question: "What kind of reports does RoadSales generate?",
            options: {
                A: "Sales performance",
                B: "Customer analytics",
                C: "Revenue insights",
                D: "All of the above"
            },
            correct: "D"
        }
    ],
    3: [ // UES
        {
            id: 0,
            question: "What does UES stand for?",
            options: {
                A: "Unified Enterprise System",
                B: "Universal Enterprise Solution",
                C: "Unified Enterprise Solutions",
                D: "Universal Enterprise Systems"
            },
            correct: "C"
        },
        {
            id: 1,
            question: "UES integrates which business functions?",
            options: {
                A: "HR and Finance",
                B: "Operations and Sales",
                C: "IT and Security",
                D: "All enterprise functions"
            },
            correct: "D"
        },
        {
            id: 2,
            question: "What is the primary benefit of UES?",
            options: {
                A: "Cost reduction",
                B: "Process integration",
                C: "Data consistency",
                D: "All of the above"
            },
            correct: "D"
        }
    ],
    4: [ // Digital
        {
            id: 0,
            question: "What is digital transformation?",
            options: {
                A: "Converting to digital formats",
                B: "Using digital technologies to transform business",
                C: "Going paperless",
                D: "Automating processes"
            },
            correct: "B"
        },
        {
            id: 1,
            question: "Which technology is key to digital transformation?",
            options: {
                A: "Cloud computing",
                B: "Artificial Intelligence",
                C: "Internet of Things",
                D: "All of the above"
            },
            correct: "D"
        },
        {
            id: 2,
            question: "Digital transformation primarily focuses on:",
            options: {
                A: "Technology adoption",
                B: "Process improvement",
                C: "Customer experience",
                D: "All of the above"
            },
            correct: "D"
        }
    ]
};

module.exports = { fallbackQuestions };
