/**
 * SM-2 Spaced Repetition Algorithm
 * Rating: 0=blackout, 1=wrong, 2=hard, 3=ok, 4=easy, 5=perfect
 */

export function sm2(card, rating) {
  let { interval, easeFactor, reps } = card;

  if (rating < 3) {
    // Failed — reset
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    reps += 1;
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)
  );

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return {
    ...card,
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    reps,
    due: due.toISOString().split("T")[0],
    lastReviewed: new Date().toISOString().split("T")[0],
  };
}

export function isDue(card) {
  const today = new Date().toISOString().split("T")[0];
  return !card.due || card.due <= today;
}

export function getDueCards(cards) {
  return cards.filter(isDue);
}

export function createCard(word, definition, source = "") {
  return {
    id: `${word}_${Date.now()}`,
    word,
    definition,
    source,
    phonetic: "",
    example: "",
    interval: 0,
    easeFactor: 2.5,
    reps: 0,
    due: new Date().toISOString().split("T")[0],
    lastReviewed: null,
    created: new Date().toISOString().split("T")[0],
  };
}
