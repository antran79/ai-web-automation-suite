// ... existing code ... import statements and schema definition
import { Types } from 'mongoose';

// Thêm group field (ref ScenarioGroup)
const ScenarioSchema = new Schema({
  // ... existing code ... scenario fields
  group: { type: Types.ObjectId, ref: 'ScenarioGroup', required: true },
  // ... existing code ...
});
// ... existing code ... export default
