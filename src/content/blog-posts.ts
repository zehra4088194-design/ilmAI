export type BlogSection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: { title: string; text: string }[];
  note?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  intro: string[];
  takeaways: string[];
  sections: BlogSection[];
  faq: { question: string; answer: string }[];
  sources?: { label: string; href: string }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'fbise-exam-tips-2026',
    title: 'How to Prepare for FBISE Exams in 2026: A Practical Study Guide',
    description:
      'A step-by-step FBISE exam preparation guide covering syllabus checks, active recall, past-paper practice, time management, and the final revision week.',
    excerpt:
      'Turn the FBISE syllabus into a realistic plan, practise under exam conditions, and use a simple mistake log to improve each week.',
    category: 'Board Exams',
    publishedAt: '2026-05-15',
    updatedAt: '2026-07-30',
    readingMinutes: 11,
    intro: [
      'Strong board-exam preparation is less about studying for the longest number of hours and more about covering the right material, testing yourself, and correcting mistakes. A useful plan should tell you what to study today, how to check whether you learned it, and what to revise next.',
      'This guide is designed for FBISE students, but most of the method also works for other Pakistani boards. Always confirm the current syllabus, assessment framework, model papers, and date sheet on your board’s official website because requirements can change.',
    ],
    takeaways: [
      'Start from the official syllabus and current assessment material, not from guesses or old notes alone.',
      'Use short learn-recall-check cycles instead of repeatedly reading the same chapter.',
      'Complete timed past-paper sessions and record why each lost mark happened.',
      'Protect sleep and use the final week for consolidation rather than learning everything from zero.',
    ],
    sections: [
      {
        id: 'check-official-material',
        heading: '1. Build your plan from official material',
        paragraphs: [
          'Before making a timetable, list every examinable chapter and learning outcome for each subject. Compare your textbook contents with the latest material published by FBISE. If a teacher or academy provides a shortened syllabus, verify it before relying on it.',
          'Create a one-page subject map with three columns: not started, learning, and exam-ready. A chapter is exam-ready only when you can answer questions without looking at the book—not merely when you have read it once.',
        ],
        bullets: [
          'Download or note the current syllabus and assessment framework.',
          'Collect the prescribed textbook, class notes, model papers, and recent past papers.',
          'Mark chapters with high confidence, medium confidence, and low confidence.',
          'Write the exam date beside each subject so urgent subjects receive enough time.',
        ],
        note: 'Do not treat an unofficial “guess paper” as a replacement for full syllabus coverage. It can be a final practice resource, not the foundation of your preparation.',
      },
      {
        id: 'weekly-plan',
        heading: '2. Make a weekly plan you can actually finish',
        paragraphs: [
          'An unrealistic schedule creates guilt and is quickly abandoned. Plan about 70–80% of your available study time and leave the rest for schoolwork, difficult topics, illness, or family commitments. Assign specific outcomes instead of vague blocks such as “study physics.”',
          'For example, write “derive the first equation of motion from memory, solve six numerical questions, and review the error log.” This makes the session measurable. At the end, you can honestly decide whether the task is complete.',
        ],
        numbered: [
          {
            title: 'Choose two priority subjects',
            text: 'Give most of the week to the subjects with the nearest exam, weakest preparation, or largest unfinished portion.',
          },
          {
            title: 'Set three weekly outcomes per subject',
            text: 'Use outcomes such as completing a chapter test, memorising a definition set, or solving a full long-question section.',
          },
          {
            title: 'Reserve one catch-up block',
            text: 'Keep a flexible session near the end of the week for work that took longer than expected.',
          },
          {
            title: 'Review on the same day each week',
            text: 'Count completed outcomes, inspect mistakes, and adjust the next plan using evidence rather than mood.',
          },
        ],
      },
      {
        id: 'active-recall',
        heading: '3. Replace passive reading with active recall',
        paragraphs: [
          'Reading a page can feel familiar even when you cannot reproduce its ideas in an answer. Active recall closes that gap. After studying a small section, close the book and explain the concept aloud, write the main points, draw the diagram, or solve a question without help.',
          'Use a 30–40 minute learning block followed by a 10–15 minute closed-book check. If you cannot recall an item, return to that exact point and try again. This is more useful than highlighting the whole page.',
        ],
        bullets: [
          'For definitions: cover the answer and write the key terms from memory.',
          'For science diagrams: draw and label them on a blank page.',
          'For mathematics: solve a fresh problem without copying a worked example.',
          'For long questions: make a heading-only outline, then expand it into a complete response.',
          'For languages: practise both content and the required answer format.',
        ],
      },
      {
        id: 'past-papers',
        heading: '4. Use past papers in three stages',
        paragraphs: [
          'Past papers are most valuable when they diagnose a problem. Begin with topic-based questions while learning, move to mixed sections after several chapters, and attempt full timed papers when most of the syllabus is covered.',
          'After each attempt, classify every lost mark. Common causes are missing knowledge, misreading the question, weak working, incomplete explanation, poor time allocation, and careless calculation. The correction should match the cause.',
        ],
        numbered: [
          {
            title: 'Topic practice',
            text: 'Solve questions from the chapter you just learned. Keep the book closed unless you are checking the completed answer.',
          },
          {
            title: 'Section practice',
            text: 'Combine MCQs, short questions, and long questions from several chapters so you must choose the correct method yourself.',
          },
          {
            title: 'Full simulation',
            text: 'Use the real time limit, permitted stationery, and no notes. Check the paper only after time ends.',
          },
        ],
      },
      {
        id: 'answer-quality',
        heading: '5. Practise the way marks are awarded',
        paragraphs: [
          'Knowing a topic and presenting it clearly are separate skills. Use command words carefully: “define,” “explain,” “compare,” “derive,” and “calculate” ask for different responses. Show working in numerical questions, use units, label diagrams, and divide long answers into logical steps.',
          'When checking a response, ask whether a teacher can quickly see the required points. Decorative length does not compensate for missing facts. A shorter, structured answer can be stronger than a long unfocused paragraph.',
        ],
        bullets: [
          'Underline or circle the command word before answering.',
          'Estimate how much time the marks justify.',
          'For calculations, show the formula, substitution, working, unit, and final result.',
          'For explanations, connect cause and effect instead of listing unrelated facts.',
          'Leave a small amount of time to check unanswered parts, units, signs, and question numbers.',
        ],
      },
      {
        id: 'mistake-log',
        heading: '6. Keep a small mistake log',
        paragraphs: [
          'A mistake log turns practice into improvement. Use one page per subject or a simple table with the date, question, error type, correct idea, and next review date. Do not copy the entire solution; record the lesson that will prevent the same error.',
          'Review the log twice a week and before every mock paper. If the same error repeats, change your study method. For example, repeated sign errors need deliberate calculation checks, while incomplete theory answers need recall practice with marking points.',
        ],
      },
      {
        id: 'final-week',
        heading: '7. Use the final seven days for consolidation',
        paragraphs: [
          'The final week should reduce uncertainty, not create panic. Prioritise frequent mistakes, key formulas, definitions, diagrams, and a small number of timed sections. Avoid collecting new books or switching to a completely different schedule.',
          'Sleep is part of preparation. A tired student is more likely to misread questions, forget steps, and lose time. Keep a regular sleep window and prepare your documents and stationery before exam day.',
        ],
        bullets: [
          'Day 7–5: close the largest remaining gaps and complete targeted practice.',
          'Day 4–3: attempt timed sections and review every correction.',
          'Day 2: revise summaries, formulas, definitions, diagrams, and the mistake log.',
          'Day 1: complete light recall, pack materials, confirm timing and location, and rest.',
        ],
      },
      {
        id: 'exam-day',
        heading: '8. Follow a calm exam-room routine',
        paragraphs: [
          'Read the instructions before starting and scan the paper so you understand its structure. Begin with a sensible section, not necessarily the hardest question. Track time at a few planned checkpoints instead of looking at the clock after every line.',
          'If you get stuck, mark the question, move forward, and return later. A difficult question should not consume the time needed for several answerable ones. In the final review, check question numbers, skipped parts, calculation signs, units, and attached sheets.',
        ],
      },
    ],
    faq: [
      {
        question: 'How many hours should an FBISE student study each day?',
        answer:
          'There is no single correct number. Start from your available time and plan focused sessions with clear outcomes. Consistent two-hour days can be more useful than occasional eight-hour sessions with little recall or practice.',
      },
      {
        question: 'How many past papers should I solve?',
        answer:
          'Quality matters more than a target number. A paper is useful only if you attempt it honestly, check it, understand each lost mark, and revisit the weak areas before the next attempt.',
      },
      {
        question: 'Are guess papers enough for board preparation?',
        answer:
          'No. A guess paper cannot guarantee what will appear. Use the official syllabus and assessment material for coverage, then use model papers, past papers, and other practice resources for testing.',
      },
    ],
    sources: [
      {
        label: 'Federal Board of Intermediate and Secondary Education (official website)',
        href: 'https://www.fbise.edu.pk/',
      },
    ],
  },
  {
    slug: 'ai-tutoring-benefits',
    title: 'AI Tutoring for Students: Benefits, Limits, and a Safe Study Method',
    description:
      'Learn where an AI tutor can help, where it can be wrong, and how students can use it for explanations, practice, feedback, and responsible independent learning.',
    excerpt:
      'AI tutoring works best as an always-available practice partner—not as a replacement for teachers, textbooks, or your own thinking.',
    category: 'AI Learning',
    publishedAt: '2026-04-22',
    updatedAt: '2026-07-30',
    readingMinutes: 10,
    intro: [
      'An AI tutor can explain a concept in several ways, generate practice questions, and respond whenever a student is ready to study. That flexibility is useful, especially when a classroom question appears later at home. But an AI answer can also be incomplete, overconfident, or based on the wrong syllabus.',
      'The most effective approach is to give the AI a narrow task, verify important information, and finish with work you complete independently. This guide explains a practical method that keeps the student—not the tool—in control.',
    ],
    takeaways: [
      'Use AI for explanation, guided practice, feedback, and planning—not for blindly submitting generated work.',
      'Provide the board, grade, subject, chapter, and exact point of confusion.',
      'Verify high-stakes facts, quotations, formulas, citations, and marking requirements.',
      'End every session with a closed-book answer or problem completed by the student.',
    ],
    sections: [
      {
        id: 'where-ai-helps',
        heading: '1. Where an AI tutor can be genuinely useful',
        paragraphs: [
          'A student often needs a smaller explanation than a textbook provides. AI can break a difficult idea into steps, give a simpler example, translate unfamiliar wording, or ask diagnostic questions. It can also create extra practice after the available textbook questions are finished.',
          'The benefit is strongest when the interaction is specific. “Teach me chemistry” is too broad. “I am a Grade 10 FBISE student. Explain why ionic compounds conduct electricity when molten but not when solid, then ask me two checking questions” gives the tutor a clear job.',
        ],
        bullets: [
          'Explaining one concept at an appropriate level.',
          'Creating additional practice with a chosen difficulty.',
          'Giving feedback on a student-written answer.',
          'Turning a chapter list into a revision schedule.',
          'Simulating an oral quiz or viva.',
          'Helping a student identify the first step when they feel stuck.',
        ],
      },
      {
        id: 'limits',
        heading: '2. Understand the limits before relying on an answer',
        paragraphs: [
          'AI systems generate likely responses; they do not guarantee truth. They can make arithmetic errors, invent a source, apply the wrong board pattern, or provide a polished explanation that contains a subtle mistake. The risk increases when a question is ambiguous or depends on very recent information.',
          'Treat confidence and correctness as different things. A confident tone is not evidence. For exam rules, date sheets, syllabuses, official definitions, and required formats, check the board, institution, teacher, or prescribed text.',
        ],
        note: 'Never enter passwords, payment details, private identity documents, another person’s personal information, or confidential school records into a study prompt.',
      },
      {
        id: 'five-step-method',
        heading: '3. Use the five-step learn–check method',
        numbered: [
          {
            title: 'Define the target',
            text: 'State the grade, board or course, subject, chapter, and one learning goal. Add what you already understand.',
          },
          {
            title: 'Ask for an explanation',
            text: 'Request a level, format, or analogy that suits you. Ask the tutor to identify assumptions instead of hiding them.',
          },
          {
            title: 'Interrogate the answer',
            text: 'Ask “why?”, request a second example, and compare the response with your textbook or class notes.',
          },
          {
            title: 'Practise without help',
            text: 'Close the explanation and solve a new question or write a short answer independently.',
          },
          {
            title: 'Check and record',
            text: 'Use feedback to correct your work, then record the key mistake or rule in your own words.',
          },
        ],
      },
      {
        id: 'better-prompts',
        heading: '4. Ask prompts that make you think',
        paragraphs: [
          'A good study prompt asks the tutor to support a process rather than replace it. Tell the AI not to reveal the final answer immediately. Ask it to give one hint at a time, challenge your reasoning, or use questions to locate the misunderstanding.',
        ],
        bullets: [
          '“Ask me one question at a time to find which part of photosynthesis I misunderstand.”',
          '“Give me a hint for this algebra problem, but do not show the final answer unless I ask.”',
          '“Check my paragraph against these three marking points and tell me what is missing.”',
          '“Create five MCQs from these notes. Explain each option only after I answer.”',
          '“Give me two similar problems: one routine and one that tests the same idea in a new context.”',
        ],
      },
      {
        id: 'verify',
        heading: '5. Verify the parts that matter most',
        paragraphs: [
          'Verification does not mean checking every ordinary sentence. Focus on information where an error would damage your marks or mislead someone else. Compare formulas and definitions with the prescribed text, test calculations independently, and open the original source behind any citation.',
          'If the AI cannot identify a real source, do not cite the claim. If two sources disagree, ask a teacher or use the authority responsible for that information. For board requirements, the board’s official publication takes priority over a generated answer.',
        ],
      },
      {
        id: 'academic-integrity',
        heading: '6. Keep your work academically honest',
        paragraphs: [
          'Schools and universities have different rules for AI assistance. Some allow brainstorming or language feedback but prohibit generated assignments; others require a disclosure. Read the policy for the specific course and ask the teacher when it is unclear.',
          'A useful personal rule is that you should be able to explain and defend everything you submit. If the AI wrote a paragraph you do not understand, it is not ready to be part of your work. Rewrite ideas in your own structure and keep your own notes or drafts where required.',
        ],
      },
      {
        id: 'teacher-role',
        heading: '7. Know when a human teacher is the better choice',
        paragraphs: [
          'AI cannot observe every part of a student’s learning, guarantee curriculum alignment, or take professional responsibility for advice. Ask a teacher when repeated explanations are not resolving the confusion, when the marking scheme is uncertain, or when the issue involves wellbeing, safety, conflict, or a formal academic decision.',
          'The strongest model is complementary: teachers provide judgment, context, motivation, and accountability; AI provides extra explanation and practice between those human interactions.',
        ],
      },
      {
        id: 'session-template',
        heading: '8. A 25-minute AI study session',
        bullets: [
          'Minutes 0–3: choose one measurable objective and show the relevant question or topic.',
          'Minutes 3–10: request an explanation and ask follow-up questions.',
          'Minutes 10–18: complete two questions without seeing the solution.',
          'Minutes 18–22: compare, correct, and identify the reason for each mistake.',
          'Minutes 22–25: write a three-sentence summary and schedule the next recall.',
        ],
        note: 'If the session ends with only reading generated text, add a closed-book check. Learning becomes visible when you can retrieve or apply the idea yourself.',
      },
    ],
    faq: [
      {
        question: 'Can an AI tutor replace tuition or a classroom teacher?',
        answer:
          'It can provide useful extra explanation and practice, but it cannot guarantee correctness, understand every personal circumstance, or replace a qualified teacher’s judgment and accountability.',
      },
      {
        question: 'Is it cheating to use AI for homework?',
        answer:
          'That depends on the teacher’s or institution’s policy and how the tool is used. Guided explanation may be permitted while submitting generated work may not be. Follow the specific rules and disclose assistance when required.',
      },
      {
        question: 'How do I know whether an AI answer is correct?',
        answer:
          'Check important claims against your prescribed textbook, official board material, a reliable original source, or a teacher. Recalculate numerical work and never trust a citation until you open it.',
      },
    ],
  },
  {
    slug: 'time-management-students',
    title: 'Time Management for Students: A Weekly System That Survives Real Life',
    description:
      'A realistic time-management system for students using weekly priorities, focused study blocks, catch-up time, phone boundaries, and recovery after missed days.',
    excerpt:
      'Plan outcomes instead of filling every hour. This weekly system leaves room for school, sleep, family responsibilities, and unexpected delays.',
    category: 'Study Skills',
    publishedAt: '2026-03-10',
    updatedAt: '2026-07-30',
    readingMinutes: 9,
    intro: [
      'Many student timetables fail because they assume every day will go perfectly. A delayed bus, difficult homework, family commitment, or low-energy evening can break the whole plan. A better system expects variation and protects the most important work.',
      'The goal of time management is not to keep every minute busy. It is to decide what deserves attention, begin with less friction, and review the result early enough to adjust.',
    ],
    takeaways: [
      'Choose a few weekly outcomes before scheduling individual study sessions.',
      'Plan only part of your free time and keep a catch-up block.',
      'Match hard tasks to your best energy and make phone boundaries visible.',
      'After a missed day, re-plan priorities instead of trying to complete two full days at once.',
    ],
    sections: [
      {
        id: 'time-audit',
        heading: '1. Begin with a seven-day time audit',
        paragraphs: [
          'Before building a timetable, observe one normal week. Record school or university hours, travel, meals, prayer, work, exercise, family responsibilities, sleep, and the time you actually begin studying. Estimates are often optimistic; observation gives you a usable starting point.',
          'Look for repeatable windows rather than isolated free minutes. A 45-minute block after rest may be more valuable than two distracted hours late at night. Also identify transition costs: getting materials ready, choosing a task, and recovering from phone use.',
        ],
      },
      {
        id: 'weekly-outcomes',
        heading: '2. Select weekly outcomes, not a giant task list',
        paragraphs: [
          'Choose three to five important outcomes for the week. An outcome should describe evidence of progress: “complete and check Chapter 4 exercise,” “draft the history essay,” or “score at least 70% on a mixed biology quiz.”',
          'Separate these from maintenance tasks such as routine homework or reviewing class notes. If everything is labelled urgent, the plan provides no guidance when time becomes limited.',
        ],
        bullets: [
          'One or two outcomes for the weakest or nearest-exam subject.',
          'One outcome for a long assignment or project.',
          'One maintenance outcome for a stronger subject.',
          'One personal outcome such as sleep consistency, exercise, or organising materials.',
        ],
      },
      {
        id: 'schedule',
        heading: '3. Put priority work into fixed study blocks',
        paragraphs: [
          'Place your weekly outcomes into specific blocks. Use your highest-energy period for tasks that demand reasoning, writing, or problem solving. Reserve lower-energy periods for flashcards, organising notes, or light review.',
          'A practical block can be 25, 40, or 50 minutes. The exact number matters less than working on one defined task and taking a real break. Stop the block with a note describing the next action so restarting is easier.',
        ],
        numbered: [
          {
            title: 'Start cue',
            text: 'Use the same location, open the required page, put the phone away, and write the session target.',
          },
          {
            title: 'Focused work',
            text: 'Work on one task. Keep a small distraction list so unrelated thoughts do not become browser tabs.',
          },
          {
            title: 'Closed-book check',
            text: 'Spend the final minutes recalling, solving, or summarising without the notes.',
          },
          {
            title: 'Restart note',
            text: 'Write exactly where to continue and prepare the first required material.',
          },
        ],
      },
      {
        id: 'buffer',
        heading: '4. Leave 20–30% of your free time unplanned',
        paragraphs: [
          'Unplanned time is not wasted space; it is what makes the schedule durable. Use it for tasks that overrun, an unexpected quiz, or rest after a demanding day. Without a buffer, one delay forces every later task to move.',
          'Keep at least one catch-up block near the end of the week. If there is nothing to catch up, use it for extra practice or finish early. Do not automatically fill every buffer at the start of the week.',
        ],
      },
      {
        id: 'phone',
        heading: '5. Design a phone rule before the session starts',
        paragraphs: [
          'Willpower is weakest when the rule is vague. Decide where the phone will be, which exceptions are allowed, and when you will check messages. Silent mode may not be enough if the device is visible.',
        ],
        bullets: [
          'Put the phone outside arm’s reach or in another room.',
          'Use a clock or timer that does not require opening social apps.',
          'Tell family or classmates when you will next be available if necessary.',
          'Keep required study files offline or open only the exact resource you need.',
          'Check messages during a planned break, then return the phone to its study location.',
        ],
      },
      {
        id: 'small-start',
        heading: '6. Reduce procrastination with a five-minute start',
        paragraphs: [
          'Procrastination often protects us from uncertainty or discomfort. Make the first action very small: write the heading, solve the easiest example, read the question, or organise the data. Promise only five focused minutes. Continuing is easier once the task is concrete.',
          'If you still cannot continue, diagnose the obstacle. You may need a smaller task, missing information, a teacher’s help, food, sleep, or a different study environment. Calling every obstacle “laziness” does not solve it.',
        ],
      },
      {
        id: 'missed-day',
        heading: '7. Recover from a missed day without doubling the next one',
        paragraphs: [
          'When a day is missed, do not copy all of its tasks into tomorrow. Re-rank the week. Keep the one or two tasks that protect the most important outcomes, move one task to the catch-up block, and deliberately drop or shorten the lowest-value task.',
          'A recovery plan should be possible. Two impossible days do not repair one missed day; they usually create a second failure and more stress.',
        ],
      },
      {
        id: 'weekly-review',
        heading: '8. Review the system for ten minutes',
        bullets: [
          'Which weekly outcomes were completed, and what evidence shows completion?',
          'Which task repeatedly took longer than planned?',
          'When was concentration strongest?',
          'What distraction appeared most often?',
          'Which unfinished task still matters next week?',
          'What one change will make the next plan more realistic?',
        ],
        note: 'Change one or two variables at a time. A complete timetable redesign every week makes it difficult to learn what actually works.',
      },
    ],
    faq: [
      {
        question: 'Is the Pomodoro technique necessary?',
        answer:
          'No. It is one useful way to separate focus and breaks, but students can use different block lengths. Choose a duration that fits the task and your current concentration.',
      },
      {
        question: 'Should I study every subject every day?',
        answer:
          'Not usually. Daily contact may help with a language or memorisation task, but deep work is often easier when a session has one or two priorities. Use the week—not a single day—to balance subjects.',
      },
      {
        question: 'What should I do when my timetable keeps failing?',
        answer:
          'Compare planned time with actual time, reduce the number of weekly outcomes, add buffer time, and make tasks more specific. A timetable is a tool to revise, not a test of personal worth.',
      },
    ],
  },
  {
    slug: 'past-papers-study-method',
    title: 'How to Study With Past Papers: A Three-Pass Method',
    description:
      'Use past papers for learning, diagnosis, and timed exam practice with a three-pass method and a simple correction log.',
    excerpt:
      'Past papers become useful when every attempt changes what you study next. Learn the three passes: topic, mixed section, and full simulation.',
    category: 'Exam Practice',
    publishedAt: '2026-07-28',
    updatedAt: '2026-07-30',
    readingMinutes: 8,
    intro: [
      'Downloading a stack of past papers is not the same as studying them. Their value comes from attempting questions under clear conditions, checking the response, and using the result to select the next study task.',
      'The three-pass method lets you use papers before, during, and after syllabus completion without wasting full tests too early.',
    ],
    takeaways: [
      'Use topic questions first, mixed sections second, and full timed papers last.',
      'Check answers by error type, not only by total score.',
      'Repeat a skill with a fresh question after correcting it.',
      'Keep some recent or unfamiliar papers for honest final simulations.',
    ],
    sections: [
      {
        id: 'before-start',
        heading: '1. Prepare the right materials',
        paragraphs: [
          'Collect papers that match your board, subject, level, and current format. Older papers may still contain useful questions, but the structure or syllabus can change. Compare them with the latest official model material before treating their pattern as current.',
        ],
        bullets: [
          'A clean copy of each question paper.',
          'The permitted formula sheet or reference material, if applicable.',
          'A marking guide, teacher feedback, or reliable solution for checking.',
          'A timer and the same basic stationery you will use in the exam.',
          'A correction log with columns for question, error type, correction, and retest date.',
        ],
      },
      {
        id: 'pass-one',
        heading: '2. Pass one: topic-based learning',
        paragraphs: [
          'Use individual questions after learning a chapter. Work without notes first, then check. The goal is to connect knowledge with the way it is examined, not to measure a final exam score.',
          'Group similar questions only long enough to learn the method. Then mix the order so the question itself must tell you which method to use.',
        ],
      },
      {
        id: 'pass-two',
        heading: '3. Pass two: mixed-section diagnosis',
        paragraphs: [
          'Once several chapters are covered, attempt one complete section or a teacher-made mix under a time limit. This tests switching, question selection, and recall across topics.',
          'Before checking, mark each answer as confident, uncertain, or guessed. Compare confidence with correctness. Confident errors deserve special attention because they reveal a misconception that may otherwise survive.',
        ],
      },
      {
        id: 'pass-three',
        heading: '4. Pass three: full exam simulation',
        paragraphs: [
          'Save several suitable papers for full simulations. Sit at a desk, remove notes and notifications, use the real time limit, and do not pause the timer. Follow the same reading, question-order, and checking routine you plan to use in the exam.',
          'A simulation is a rehearsal, so record operational problems as well as academic ones: slow handwriting, poor question selection, missing stationery, weak time checkpoints, or anxiety after one difficult item.',
        ],
      },
      {
        id: 'error-types',
        heading: '5. Classify every lost mark',
        bullets: [
          'Knowledge gap: the fact, rule, or method was not known.',
          'Recall gap: it was learned before but could not be retrieved.',
          'Interpretation error: the command word or given information was misunderstood.',
          'Method error: the wrong approach was selected.',
          'Execution error: arithmetic, algebra, spelling, units, or signs went wrong.',
          'Presentation error: necessary working, labels, explanation, or structure was missing.',
          'Time error: the answer was unfinished or never attempted.',
        ],
        note: '“Careless mistake” is too broad. Name the specific action that failed and add a specific prevention check.',
      },
      {
        id: 'correction-loop',
        heading: '6. Complete the correction loop',
        numbered: [
          {
            title: 'Correct',
            text: 'Write the correct reasoning or method in your own words.',
          },
          {
            title: 'Rebuild',
            text: 'Review the smallest relevant concept instead of rereading the entire chapter.',
          },
          {
            title: 'Retest',
            text: 'Solve a fresh question that tests the same skill without copying the correction.',
          },
          {
            title: 'Revisit',
            text: 'Schedule a short recall several days later so the correction is not temporary.',
          },
        ],
      },
      {
        id: 'score-trends',
        heading: '7. Track trends, not one dramatic score',
        paragraphs: [
          'A single paper can be unusually easy, difficult, familiar, or poorly matched to the current format. Track results across several attempts and include section scores, unfinished marks, and repeated error types.',
          'The best sign of progress is not only a higher percentage. It is fewer repeated mistakes, more complete answers, better time control, and improved accuracy on unfamiliar questions.',
        ],
      },
    ],
    faq: [
      {
        question: 'Should I look at the solution when I get stuck?',
        answer:
          'First try to identify the missing step and use a small hint if available. If you read the solution, close it and solve a fresh similar question afterward so recognition is not mistaken for mastery.',
      },
      {
        question: 'Can I reuse the same past paper?',
        answer:
          'Yes, especially for checking whether corrections lasted. However, remembered answers can inflate the score, so combine repeats with unfamiliar questions and reserve some papers for final simulations.',
      },
      {
        question: 'When should I start full timed papers?',
        answer:
          'Begin when most of the syllabus is covered and you have already practised the main question types. Before that, topic and mixed-section practice usually gives more useful feedback.',
      },
    ],
  },
  {
    slug: 'mcq-mistake-log',
    title: 'The MCQ Mistake Log: Turn Wrong Answers Into Higher Scores',
    description:
      'A practical mistake-log template for MCQ practice that separates knowledge gaps, reasoning errors, and guesses, then schedules targeted retesting.',
    excerpt:
      'Do more than count correct answers. Record why an option was wrong, repair the exact gap, and retest the idea later.',
    category: 'Study Skills',
    publishedAt: '2026-07-29',
    updatedAt: '2026-07-30',
    readingMinutes: 7,
    intro: [
      'MCQ practice can create an illusion of progress when students answer large sets but never study the errors. A mistake log slows down the checking stage just enough to expose weak concepts, misleading wording, and guessing habits.',
      'The log can be a notebook page or spreadsheet. Keep it small enough to review and detailed enough to change your next action.',
    ],
    takeaways: [
      'Record uncertain correct answers as well as wrong answers.',
      'Name the precise error instead of writing “careless.”',
      'Explain why the correct option is right and why your chosen option is wrong.',
      'Retest the concept with a new question after a delay.',
    ],
    sections: [
      {
        id: 'template',
        heading: '1. Use six simple columns',
        bullets: [
          'Date and source: where the question came from.',
          'Topic: the smallest useful chapter or concept label.',
          'Result: wrong, guessed-correct, or uncertain-correct.',
          'Error type: knowledge, interpretation, reasoning, execution, or time.',
          'Correction: one or two sentences in your own words.',
          'Retest date: when you will answer a fresh question on the same idea.',
        ],
      },
      {
        id: 'record',
        heading: '2. Decide which questions to record',
        paragraphs: [
          'Record every wrong answer. Also record a correct answer if it was a guess, if you could not eliminate options with a reason, or if you changed from the correct option without evidence. These questions reveal fragile knowledge that a score alone hides.',
          'Do not fill the log with questions you answered confidently for the right reason. The log should concentrate attention on decisions that need repair.',
        ],
      },
      {
        id: 'diagnose',
        heading: '3. Diagnose the decision, not just the fact',
        bullets: [
          'Knowledge: “I did not know that acceleration is a vector.”',
          'Interpretation: “I missed the word ‘not’ in the stem.”',
          'Reasoning: “I selected a related fact that did not answer the question.”',
          'Execution: “I converted centimetres to metres incorrectly.”',
          'Overthinking: “I replaced a supported answer with an unlikely exception.”',
          'Guessing: “I could not explain why any option was correct.”',
        ],
      },
      {
        id: 'write-correction',
        heading: '4. Write a correction that can guide future action',
        paragraphs: [
          'Copying the answer key does not explain the mistake. Write the rule, contrast, or check that would lead you to the correct option next time. If distractors are important, state why each tempting option fails.',
          'Keep corrections short. If the concept needs a full page, review it in your notes and put only the decisive lesson in the log.',
        ],
      },
      {
        id: 'retest',
        heading: '5. Retest with spacing',
        paragraphs: [
          'Answer a fresh question on the same concept after one or two days, then again about a week later if it was difficult. A copied or immediately repeated question mostly tests short-term memory.',
          'If the error repeats, change the intervention. Repeated knowledge errors may need a new explanation; repeated interpretation errors may need a deliberate stem-marking routine.',
        ],
      },
      {
        id: 'weekly-review',
        heading: '6. Look for patterns each week',
        paragraphs: [
          'Count error types and topics, but also inspect context. Are mistakes concentrated late in long sessions? Do negative stems cause problems? Are calculations correct when untimed but weak under pressure?',
          'Choose one pattern for the next week. A small prevention rule—such as underlining negatives or writing units beside every quantity—is easier to apply than a vague promise to be more careful.',
        ],
      },
      {
        id: 'exam-use',
        heading: '7. Convert the log into an exam routine',
        bullets: [
          'Read the complete stem before looking for a familiar phrase.',
          'Predict the answer when possible, then compare the options.',
          'Eliminate options with a stated reason.',
          'Do not change an answer without new evidence.',
          'Mark uncertain items and return after completing answerable questions.',
          'Use final review time for logged error patterns, not random answer changes.',
        ],
      },
    ],
    faq: [
      {
        question: 'Should I record every MCQ I attempt?',
        answer:
          'No. Record wrong, guessed, and uncertain answers. The purpose is to focus review on weak decisions, not reproduce the entire question bank.',
      },
      {
        question: 'Is a notebook or spreadsheet better?',
        answer:
          'Use whichever you will review consistently. A notebook is quick and distraction-free; a spreadsheet makes filtering by topic and error type easier.',
      },
      {
        question: 'How often should I review the log?',
        answer:
          'Briefly review new entries after practice, revisit them twice during the week, and scan repeated patterns before a mock or exam.',
      },
    ],
  },
];

export const BLOG_POSTS_BY_SLUG = Object.fromEntries(BLOG_POSTS.map((post) => [post.slug, post])) as Record<
  string,
  BlogPost
>;
