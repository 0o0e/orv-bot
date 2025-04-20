const quests = [
    { quest: "send a message in #off-topic", difficulty: "Easy", reward: 30 },
    { quest: "send 10 messages in #general in the span of 1 hour, no spam allowed", difficulty: "Easy", reward: 30 },
    { quest: "solve this question: What is Yoo Joonghyuk's sister's name?", difficulty: "Easy", reward: 50 },
    { quest: "solve this question: What cabin number was Kim Dokja in at the start of ORV?", difficulty: "Easy", reward: 30 },
    { quest: "comment, compliment on a writers work in #writers-hub", difficulty: "Medium", reward: 50 },
    { quest: "comment, compliment on a artists work in #oc-and-media", difficulty: "Medium", reward: 50 },
    { quest: "Wish someone happy birthday in #members-birthday-party", difficulty: "Easy", reward: 30 },
    { quest: "solve this question: What is the name of the Dokkaebi hosting the early scenarios?", difficulty: "Easy", reward: 40 },
    { quest: "solve this question: What weapon does Jung Heewon wield?", difficulty: "Easy", reward: 40 },
    { quest: "solve this question: What mental skill protects Kim Dokja's mind?", difficulty: "Easy", reward: 40 },
    { quest: "solve this question: Who leads the Salvation Church?", difficulty: "Easy", reward: 40 }
];

// List of compliment keywords for detecting genuine compliments
const complimentKeywords = [
    // General positive words
    "amazing", "awesome", "beautiful", "brilliant", "creative", "excellent", "fantastic",
    "great", "impressive", "incredible", "lovely", "magnificent", "outstanding", "perfect",
    "phenomenal", "remarkable", "stunning", "superb", "wonderful", "masterpiece", "pretty", "cool",
    
    // Writing-specific compliments
    "well-written", "engaging", "captivating", "compelling", "powerful", "eloquent",
    "immersive", "intriguing", "moving", "poetic", "vivid", "beautifully written",
    "well crafted", "deep", "thoughtful", "emotional", "gripping", "fascinating",
    
    // Art-specific compliments
    "gorgeous", "beautiful", "stunning", "detailed", "skillful", "talented",
    "creative", "artistic", "expressive", "vibrant", "dynamic", "elegant",
    "refined", "polished", "masterful", "professional", "eye-catching",
    
    // Emotional responses
    "love", "adore", "enjoy", "appreciate", "touched", "moved", "inspired",
    "impressed", "amazed", "blown away", "speechless",
    
    // Skill recognition
    "skilled", "talented", "gifted", "professional", "expert", "master",
    "proficient", "accomplished", "exceptional", "outstanding",
    
    // Improvement recognition
    "improved", "progress", "better", "evolved", "grown", "developed",
    
    // Specific feature compliments
    "style", "technique", "composition", "detail", "perspective",
    "character", "plot", "development", "pacing", "flow",
    
    // Enthusiastic expressions
    "wow", "omg", "incredible", "amazing", "fantastic", "awesome",
    "brilliant", "extraordinary", "magnificent", "marvelous"
];

function isCompliment(message) {
    const content = message.content.toLowerCase();
    return complimentKeywords.some(keyword => content.includes(keyword.toLowerCase()));
}

module.exports = {
    quests,
    isCompliment
};
