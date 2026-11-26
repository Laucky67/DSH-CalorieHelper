import { localDate } from './calendar.ts';
import { clientSchemas, foodSchema, profileSchema, toolSchemas } from './contracts.ts';
import { addEntries, deleteEntry, editEntry, queryEntries } from './diets.ts';
import { TrackerError, validated } from './errors.ts';
import { addFood, deleteFood, editFood, searchFoods } from './foods.ts';
import { profileOn, summarize } from './profiles.ts';
import { openState } from './state.ts';
import type { TrackerStorage } from './state.ts';

export function createTracker(storage: TrackerStorage, today = () => localDate()) {
  const state = openState(storage);

  return {
    async food_create(input: unknown) {
      const data = validated(foodSchema, input, '请输入食物名称和有效的营养资料。');
      return state.write((draft) => addFood(draft, data));
    },
    async food_search(input: unknown) {
      const search = validated(toolSchemas.food_search, input, '请输入要查找的食物。');
      return state.read((snapshot) => searchFoods(snapshot, search));
    },
    async food_update(input: unknown) {
      const data = validated(toolSchemas.food_update, input, '请检查要修改的食物资料。');
      return state.write((draft) => editFood(draft, data));
    },
    async food_delete(input: unknown) {
      const { id } = validated(toolSchemas.food_delete, input, '请选择要删除的食物。');
      return state.write((draft) => deleteFood(draft, id));
    },
    async diet_create(input: unknown) {
      const data = validated(toolSchemas.diet_create, input, '请检查日期、餐别、食物和食用量。');
      return state.write((draft) => addEntries(draft, data));
    },
    async diet_query(input: unknown) {
      const query = validated(toolSchemas.diet_query, input, '请选择日期或饮食记录。');
      return state.read((snapshot) => queryEntries(snapshot, query));
    },
    async diet_update(input: unknown) {
      const data = validated(toolSchemas.diet_update, input, '请检查要修改的饮食记录。');
      return state.write((draft) => editEntry(draft, data));
    },
    async diet_delete(input: unknown) {
      const { id } = validated(toolSchemas.diet_delete, input, '请选择要删除的饮食记录。');
      return state.write((draft) => deleteEntry(draft, id));
    },
    async daily_summary(input: unknown) {
      const { date } = validated(clientSchemas.daily_summary, input, '请选择有效的日期。');
      return state.read((snapshot) => summarize(snapshot, date));
    },
    async profile_get() {
      return state.read((snapshot) => profileOn(snapshot, today()));
    },
    async profile_save(input: unknown) {
      const profile = validated(profileSchema, input, '请检查出生日期、性别、身高、体重和活动等级。');
      const effectiveDate = today();
      if (profile.birthDate && profile.birthDate > effectiveDate) throw new TrackerError('出生日期应为今天或更早。');
      return state.write((draft) => {
        draft.profiles.push({ effectiveDate, profile });
        return profile;
      });
    },
  };
}

export type Tracker = ReturnType<typeof createTracker>;
