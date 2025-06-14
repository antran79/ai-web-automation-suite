import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IScenarioGroup extends Document {
  name: string;
  description?: string;
  domain: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ScenarioGroupSchema = new Schema<IScenarioGroup>({
  name: { type: String, required: true },
  description: { type: String },
  domain: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

const ScenarioGroup = mongoose.models.ScenarioGroup || mongoose.model<IScenarioGroup>('ScenarioGroup', ScenarioGroupSchema);
export default ScenarioGroup;
