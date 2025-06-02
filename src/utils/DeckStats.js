// OOP Demo: DeckStats class
export class DeckStats {
  constructor(deck) {
    this.deck = deck;
  }

  totalCards() {
    return this.deck.cards.length;
  }

  averageCardLength() {
    if (!this.deck.cards.length) return 0;
    const total = this.deck.cards.reduce((sum, c) => sum + c.front.length + c.back.length, 0);
    return Math.round(total / this.deck.cards.length);
  }
} 