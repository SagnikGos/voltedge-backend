export const allPuzzles: Record<
  string,
  {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    question: string;
    correctAnswer: string;
    rewardItems: Array<{ itemId: string; quantity: number }>;
  }
> = {
  // Shift 1
  s1q1: { id: 's1q1', x: 384, y: 288, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock1', correctAnswer: 'resistor', rewardItems: [{ itemId: 'resistor', quantity: 2 }] },
  s1q2: { id: 's1q2', x: 800, y: 576, width: 128, height: 128, question: 'https://docs.google.com/document/d/mock2', correctAnswer: 'capacitor', rewardItems: [{ itemId: 'capacitor', quantity: 2 }] },
  s1q3: { id: 's1q3', x: 1184, y: 480, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock3', correctAnswer: 'transistor', rewardItems: [{ itemId: 'transistor', quantity: 2 }] },
  s1q4: { id: 's1q4', x: 1984, y: 992, width: 160, height: 160, question: 'https://docs.google.com/document/d/mock4', correctAnswer: 'switch', rewardItems: [{ itemId: 'switch', quantity: 2 }] },
  s1q5: { id: 's1q5', x: 2496, y: 1984, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock5', correctAnswer: 'bulb', rewardItems: [{ itemId: 'bulb', quantity: 2 }] },
  s1q6: { id: 's1q6', x: 1000, y: 2000, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock6', correctAnswer: 'diode', rewardItems: [{ itemId: 'diode', quantity: 1 }] },
  s1q7: { id: 's1q7', x: 2000, y: 1000, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock7', correctAnswer: 'transformer', rewardItems: [{ itemId: 'transformer', quantity: 1 }] },
  s1q8: { id: 's1q8', x: 400, y: 2200, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock8', correctAnswer: 'inductor', rewardItems: [{ itemId: 'inductor', quantity: 1 }] },
  s1q9: { id: 's1q9', x: 2400, y: 400, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock9', correctAnswer: 'ammeter', rewardItems: [{ itemId: 'ammeter', quantity: 1 }] },
  s1q10: { id: 's1q10', x: 1500, y: 500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock10', correctAnswer: 'voltmeter', rewardItems: [{ itemId: 'voltmeter', quantity: 1 }] },
  s1q11: { id: 's1q11', x: 1200, y: 1500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock11', correctAnswer: 'motor', rewardItems: [{ itemId: 'motor', quantity: 1 }] },
  s1q12: { id: 's1q12', x: 1800, y: 2500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock12', correctAnswer: 'battery', rewardItems: [{ itemId: 'battery', quantity: 1 }] },
  s1q13: { id: 's1q13', x: 500, y: 800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock13', correctAnswer: 'relay', rewardItems: [{ itemId: 'switch', quantity: 1 }] },
  s1q14: { id: 's1q14', x: 2200, y: 1800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock14', correctAnswer: 'fuse', rewardItems: [{ itemId: 'fuse', quantity: 1 }] },
  s1q15: { id: 's1q15', x: 1600, y: 2800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock15', correctAnswer: 'ground', rewardItems: [{ itemId: 'resistor', quantity: 1 }] },

  // Shift 2
  s2q1: { id: 's2q1', x: 384, y: 288, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock16', correctAnswer: 'resistor', rewardItems: [{ itemId: 'resistor', quantity: 2 }] },
  s2q2: { id: 's2q2', x: 800, y: 576, width: 128, height: 128, question: 'https://docs.google.com/document/d/mock17', correctAnswer: 'capacitor', rewardItems: [{ itemId: 'capacitor', quantity: 2 }] },
  s2q3: { id: 's2q3', x: 1184, y: 480, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock18', correctAnswer: 'transistor', rewardItems: [{ itemId: 'transistor', quantity: 2 }] },
  s2q4: { id: 's2q4', x: 1984, y: 992, width: 160, height: 160, question: 'https://docs.google.com/document/d/mock19', correctAnswer: 'switch', rewardItems: [{ itemId: 'switch', quantity: 2 }] },
  s2q5: { id: 's2q5', x: 2496, y: 1984, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock20', correctAnswer: 'bulb', rewardItems: [{ itemId: 'bulb', quantity: 2 }] },
  s2q6: { id: 's2q6', x: 1000, y: 2000, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock21', correctAnswer: 'diode', rewardItems: [{ itemId: 'diode', quantity: 1 }] },
  s2q7: { id: 's2q7', x: 2000, y: 1000, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock22', correctAnswer: 'transformer', rewardItems: [{ itemId: 'transformer', quantity: 1 }] },
  s2q8: { id: 's2q8', x: 400, y: 2200, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock23', correctAnswer: 'inductor', rewardItems: [{ itemId: 'inductor', quantity: 1 }] },
  s2q9: { id: 's2q9', x: 2400, y: 400, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock24', correctAnswer: 'ammeter', rewardItems: [{ itemId: 'ammeter', quantity: 1 }] },
  s2q10: { id: 's2q10', x: 1500, y: 500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock25', correctAnswer: 'voltmeter', rewardItems: [{ itemId: 'voltmeter', quantity: 1 }] },
  s2q11: { id: 's2q11', x: 1200, y: 1500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock26', correctAnswer: 'motor', rewardItems: [{ itemId: 'motor', quantity: 1 }] },
  s2q12: { id: 's2q12', x: 1800, y: 2500, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock27', correctAnswer: 'battery', rewardItems: [{ itemId: 'battery', quantity: 1 }] },
  s2q13: { id: 's2q13', x: 500, y: 800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock28', correctAnswer: 'relay', rewardItems: [{ itemId: 'switch', quantity: 1 }] },
  s2q14: { id: 's2q14', x: 2200, y: 1800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock29', correctAnswer: 'fuse', rewardItems: [{ itemId: 'fuse', quantity: 1 }] },
  s2q15: { id: 's2q15', x: 1600, y: 2800, width: 96, height: 96, question: 'https://docs.google.com/document/d/mock30', correctAnswer: 'ground', rewardItems: [{ itemId: 'resistor', quantity: 1 }] },
};

export const shift1Pool = ['s1q1', 's1q2', 's1q3', 's1q4', 's1q5', 's1q6', 's1q7', 's1q8', 's1q9', 's1q10', 's1q11', 's1q12', 's1q13', 's1q14', 's1q15'];
export const shift2Pool = ['s2q1', 's2q2', 's2q3', 's2q4', 's2q5', 's2q6', 's2q7', 's2q8', 's2q9', 's2q10', 's2q11', 's2q12', 's2q13', 's2q14', 's2q15'];
