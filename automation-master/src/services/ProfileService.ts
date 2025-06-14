import ProfileGroup, { IProfileGroup } from '@/models/ProfileGroup';
import Profile from '@/models/Profile';

export class ProfileService {
  // PROFILE GROUP CRUD
  static async createGroup(data: { name: string; description?: string; }) {
    const doc = new ProfileGroup(data);
    await doc.save();
    return doc;
  }
  static async getGroups() {
    return ProfileGroup.find();
  }
  static async getGroupById(id: string) {
    return ProfileGroup.findById(id);
  }
  static async updateGroup(id: string, updates: any) {
    return ProfileGroup.findByIdAndUpdate(id, updates, { new: true });
  }
  static async deleteGroup(id: string) {
    return ProfileGroup.findByIdAndDelete(id);
  }
  // PROFILE CRUD THEO GROUP
  static async getProfilesInGroup(groupId: string) {
    return Profile.find({ group: groupId });
  }
  static async createProfile(data: any) {
    const doc = new Profile(data);
    await doc.save();
    return doc;
  }
  static async updateProfile(id: string, updates: any) {
    return Profile.findByIdAndUpdate(id, updates, { new: true });
  }
  static async deleteProfile(id: string) {
    return Profile.findByIdAndDelete(id);
  }
}
