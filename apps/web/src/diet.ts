/** Dietary labels shoppers can filter by. A label appears only after the catalogue team has checked the pack. */
export const DIET_LABELS: Record<string, string> = {
  vegan: 'Vegan', vegetarian: 'Vegetarian', gluten_free: 'Gluten-free', dairy_free: 'Dairy-free', nut_free: 'Nut-free', egg_free: 'Egg-free', soy_free: 'Soy-free',
  halal: 'Halal', kosher: 'Kosher', organic: 'Organic', no_added_sugar: 'No added sugar', low_sodium: 'Low sodium',
};
export type Nutrition = { serving?: string; calories?: number; fat_g?: number; sat_fat_g?: number; trans_fat_g?: number; carbs_g?: number; fibre_g?: number; sugars_g?: number; protein_g?: number; sodium_mg?: number };
