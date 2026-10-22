import { COURSE_CONTENT } from './course.js';

// The original file reuses supply-chain-management in Chapters 1 and 2.
// Keep the source intact, but give repeated concepts distinct runtime identifiers
// so a Chapter 1 popup cannot show the Chapter 2 definition or share its mastery.
export const CONTENT = JSON.parse(JSON.stringify(COURSE_CONTENT));
const seen = new Set();
const aliases = new Map();
for (const concept of CONTENT.concepts){
  if (seen.has(concept.id)){
    const originalId = concept.id;
    concept.id = `${concept.chapterId}:${originalId}`;
    aliases.set(`${concept.chapterId}/${originalId}`, concept.id);
  }
  seen.add(concept.id);
}
for (const lo of CONTENT.learningObjectives){
  lo.keyConcepts = (lo.keyConcepts || []).map(id => aliases.get(`${lo.chapterId}/${id}`) || id);
  for (const block of CONTENT.loProse[lo.code] || []){
    block.html = block.html.replace(/data-cid="([^"]+)"/g, (match,id) => `data-cid="${aliases.get(`${lo.chapterId}/${id}`) || id}"`);
  }
}
for (const question of CONTENT.quiz){
  question.concept = aliases.get(`${question.chapterId}/${question.concept}`) || question.concept;
}
