// Daily Questions System - Soul Stare-style introspective prompts
export type DailyQuestion = {
  id: string;
  question: string;
  category: 'soul' | 'heart' | 'mind' | 'spirit';
  color: string;
  glowColor: string;
};

const SOUL_STARE_QUESTIONS: DailyQuestion[] = [
  // Soul Questions - Deep introspection
  {
    id: 'soul_1',
    question: "What part of yourself have you been hiding lately?",
    category: 'soul',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)'
  },
  {
    id: 'soul_2', 
    question: "If your soul could speak one truth today, what would it whisper?",
    category: 'soul',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)'
  },
  {
    id: 'soul_3',
    question: "What would you do if you knew no one was watching?",
    category: 'soul',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)'
  },
  {
    id: 'soul_4',
    question: "When did you last feel completely yourself?",
    category: 'soul',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)'
  },
  
  // Heart Questions - Emotional connection
  {
    id: 'heart_1',
    question: "Who do you miss that you haven't told?",
    category: 'heart',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.6)'
  },
  {
    id: 'heart_2',
    question: "What love are you afraid to give or receive?",
    category: 'heart',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.6)'
  },
  {
    id: 'heart_3',
    question: "If you could heal one relationship, which would it be?",
    category: 'heart',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.6)'
  },
  {
    id: 'heart_4',
    question: "What makes your heart feel most at home?",
    category: 'heart',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.6)'
  },
  
  // Mind Questions - Mental clarity
  {
    id: 'mind_1',
    question: "What belief about yourself is ready to evolve?",
    category: 'mind',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.6)'
  },
  {
    id: 'mind_2',
    question: "If fear wasn't a factor, what would you create?",
    category: 'mind',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.6)'
  },
  {
    id: 'mind_3',
    question: "What story are you telling yourself that no longer serves you?",
    category: 'mind',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.6)'
  },
  {
    id: 'mind_4',
    question: "How would you live if you trusted yourself completely?",
    category: 'mind',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.6)'
  },
  
  // Spirit Questions - Connection to purpose
  {
    id: 'spirit_1',
    question: "What is your spirit calling you toward?",
    category: 'spirit',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)'
  },
  {
    id: 'spirit_2',
    question: "How do you want to be remembered by the universe?",
    category: 'spirit',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)'
  },
  {
    id: 'spirit_3',
    question: "What part of your purpose feels most alive right now?",
    category: 'spirit',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)'
  },
  {
    id: 'spirit_4',
    question: "If you could send one message to every soul, what would it be?",
    category: 'spirit',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)'
  }
];

// Get today's question based on date
export function getTodaysQuestion(): DailyQuestion {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const questionIndex = dayOfYear % SOUL_STARE_QUESTIONS.length;
  return SOUL_STARE_QUESTIONS[questionIndex];
}

// Check if user has answered today's question
export function hasAnsweredToday(): boolean {
  const today = new Date().toDateString();
  return localStorage.getItem(`soul_stare_${today}`) === 'true';
}

// Mark today's question as answered
export function markQuestionAnswered(): void {
  const today = new Date().toDateString();
  localStorage.setItem(`soul_stare_${today}`, 'true');
}

// Get random question from specific category
export function getQuestionByCategory(category: DailyQuestion['category']): DailyQuestion {
  const categoryQuestions = SOUL_STARE_QUESTIONS.filter(q => q.category === category);
  const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
  return categoryQuestions[randomIndex];
}