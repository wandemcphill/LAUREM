import { randomInt } from 'node:crypto';
import type { LauremCanonicalRole } from '@/lib/laurem-role-policy';
import { getLauremRound1Bank, getLauremRound2Bank, ROUND1_QUESTIONS_PER_ATTEMPT, ROUND1_PASS_PERCENT } from '@/lib/laurem-interview-banks';
import type { ObjectiveInterviewQuestion, PracticalInterviewQuestion } from '@/lib/laurem-interview-banks';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBalanced<T extends { category: string }>(bank: T[], count: number): T[] {
  const groups = new Map<string, T[]>();
  for (const question of bank) {
    const group = groups.get(question.category) || [];
    group.push(question);
    groups.set(question.category, group);
  }
  const categories = shuffle([...groups.keys()]);
  const selected: T[] = [];
  const target = Math.floor(count / categories.length);
  const remainder = count % categories.length;
  categories.forEach((category, index) => {
    const take = target + (index < remainder ? 1 : 0);
    selected.push(...shuffle(groups.get(category) || []).slice(0, take));
  });
  return shuffle(selected).slice(0, count);
}

export function selectRound1Questions(role: LauremCanonicalRole) {
  return pickBalanced(getLauremRound1Bank(role), ROUND1_QUESTIONS_PER_ATTEMPT);
}

export function selectRound2Questions(role: LauremCanonicalRole) {
  return shuffle(getLauremRound2Bank(role)).slice(0, ROUND1_QUESTIONS_PER_ATTEMPT);
}

export function publicRound1Questions(questions: ObjectiveInterviewQuestion[]) {
  return questions.map(({ correctIndex: _correctIndex, ...question }) => question);
}

export function scoreRound1(questions: ObjectiveInterviewQuestion[], answers: Record<string, unknown>) {
  let score = 0;
  for (const question of questions) {
    const answer = Number(answers[question.id]);
    if (Number.isInteger(answer) && answer === question.correctIndex) score += 1;
  }
  return {
    score,
    total: questions.length,
    percent: questions.length ? Math.round((score * 10000) / questions.length) / 100 : 0,
    passed: questions.length > 0 && (score * 100) / questions.length >= ROUND1_PASS_PERCENT,
  };
}

export function publicRound2Questions(questions: PracticalInterviewQuestion[]) {
  return questions.map((question) => ({ id: question.id, category: question.category, text: question.text, guidance: question.guidance }));
}
