import Domain, { type IDomain } from '@/models/Domain';
import ScenarioGroup, { type IScenarioGroup } from '@/models/ScenarioGroup';
import Scenario from '@/models/Scenario';

export class ScenarioService {
  // DOMAIN CRUD
  static async createDomain(data: { domain: string; description?: string; owner?: string; }): Promise<IDomain> {
    const doc = new Domain(data);
    await doc.save();
    return doc;
  }
  static async getDomains(): Promise<IDomain[]> {
    return Domain.find().exec();
  }
  static async getDomainById(id: string): Promise<IDomain | null> {
    return Domain.findById(id).exec();
  }
  static async updateDomain(id: string, updates: Partial<IDomain>) {
    return Domain.findByIdAndUpdate(id, updates, { new: true }).exec();
  }
  static async deleteDomain(id: string) {
    return Domain.findByIdAndDelete(id).exec();
  }
  // SCENARIO GROUP CRUD
  static async createScenarioGroup(data: { name: string; description?: string; domain: string; }): Promise<IScenarioGroup> {
    const doc = new ScenarioGroup({ ...data, domain: data.domain });
    await doc.save();
    return doc;
  }
  static async getScenarioGroups(domainId: string): Promise<IScenarioGroup[]> {
    return ScenarioGroup.find({ domain: domainId }).exec();
  }
  static async getScenarioGroupById(id: string): Promise<IScenarioGroup | null> {
    return ScenarioGroup.findById(id).exec();
  }
  static async updateScenarioGroup(id: string, updates: Partial<IScenarioGroup>) {
    return ScenarioGroup.findByIdAndUpdate(id, updates, { new: true }).exec();
  }
  static async deleteScenarioGroup(id: string) {
    return ScenarioGroup.findByIdAndDelete(id).exec();
  }
  // SCENARIO CRUD THEO GROUP
  static async getScenariosInGroup(groupId: string) {
    return Scenario.find({ group: groupId }).exec();
  }
  static async getScenarioById(id: string) {
    return Scenario.findById(id).exec();
  }
  static async createScenario(data: any) {
    const doc = new Scenario(data);
    await doc.save();
    return doc;
  }
  static async updateScenario(id: string, updates: any) {
    return Scenario.findByIdAndUpdate(id, updates, { new: true }).exec();
  }
  static async deleteScenario(id: string) {
    return Scenario.findByIdAndDelete(id).exec();
  }
}
