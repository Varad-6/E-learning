export interface Badge {
  step: number;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export const getBadgeForCompletions = (count: number): Badge | null => {
  const badges: Badge[] = [
    { step: 1, name: "Novice Explorer", color: "linear-gradient(135deg, #a1887f 0%, #5d4037 100%)", description: "Completed 1 course. Initiated into continuous learning.", icon: "Bronze" },
    { step: 2, name: "Pathway Learner", color: "linear-gradient(135deg, #bcaaa4 0%, #8d6e63 100%)", description: "Completed 2 courses. Advancing through the foundational tracks.", icon: "Bronze II" },
    { step: 3, name: "Skill Builder", color: "linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)", description: "Completed 3 courses. Demonstrating consistent skill acquisition.", icon: "Silver" },
    { step: 4, name: "Knowledge Seeker", color: "linear-gradient(135deg, #cfd8dc 0%, #78909c 100%)", description: "Completed 4 courses. Actively exploring multiple domains.", icon: "Silver II" },
    { step: 5, name: "Pro Practitioner", color: "linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)", description: "Completed 5 courses. Demonstrating strong platform proficiency.", icon: "Gold" },
    { step: 6, name: "Subject Specialist", color: "linear-gradient(135deg, #ffe082 0%, #ffa000 100%)", description: "Completed 6 courses. Highly qualified in core subjects.", icon: "Gold II" },
    { step: 7, name: "Elite Achiever", color: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)", description: "Completed 7 courses. Reached elite corporate training levels.", icon: "Elite" },
    { step: 8, name: "Master Mentor", color: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)", description: "Completed 8 courses. Possesses capability to guide other learners.", icon: "Master" },
    { step: 9, name: "Continuous Improver", color: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)", description: "Completed 9 courses. Lives the true spirit of Kaizen improvement.", icon: "Diamond" },
    { step: 10, name: "Grandmaster of Kaizen", color: "linear-gradient(135deg, #f472b6 0%, #db2777 100%)", description: "Completed 10+ courses. The supreme crown of corporate learning excellence.", icon: "Grandmaster" }
  ];

  if (count <= 0) return null;
  const index = Math.min(count, 10) - 1;
  return badges[index];
};
