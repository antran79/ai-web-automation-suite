// ... existing code ... import statements and schema definition
import { Types } from 'mongoose';

// Thêm group field (ref ProfileGroup)
const ProfileSchema = new Schema({
  // ... existing code ... other fields
  group: { type: Types.ObjectId, ref: 'ProfileGroup', required: true },
  // ... existing code ...
});
// ... existing code ... export default
