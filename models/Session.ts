import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string;
  teamName: string;
  teamLeadName: string;
  shift: number;
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number };
  puzzles: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    question: string;
    correctAnswer: string;
    rewardItems: Array<{ itemId: string; quantity: number }>;
  }>;
  inventory: Array<{
    itemId: string;
    quantity: number;
  }>;
  placedItems: Array<{
    row: number;
    col: number;
    itemId: string;
    variant?: string;
  }>;
  solvedPuzzleIds: string[];
  puzzleSolveTimestamps: Record<string, Date>;
  circuitCompletedAt: Date | null;
}

const SessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  teamName: { type: String, required: true, unique: true, index: true },
  teamLeadName: { type: String, required: true },
  shift: { type: Number, required: true },
  worldWidth: { type: Number, default: 3000 },
  worldHeight: { type: Number, default: 3000 },
  playerStart: { x: { type: Number, default: 1500 }, y: { type: Number, default: 1500 } },
  puzzles: { type: Array, default: [] },
  inventory: { type: Array, default: [] },
  placedItems: { type: Array, default: [] },
  solvedPuzzleIds: { type: [String], default: [] },
  puzzleSolveTimestamps: { type: Schema.Types.Mixed, default: {} },
  circuitCompletedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
