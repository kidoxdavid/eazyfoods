# Meals Page & Meal/Recipe Marketing – Feature Ideas

## Current Meals Page (Customer)

- **Recipes tab**: List recipes with filters (meal type, cuisine type, difficulty), search, recipe cards with image, meal type/difficulty badges, prep/cook time, servings, link to recipe detail.
- **Meal Plans tab**: List meal plans (one day / one week / one month), filter by plan type, “Build your plan” modal (pick recipes per slot, add ingredients to cart), “Suggested for you” plans (add to cart in one click).
- **Recipe detail**: Full recipe with ingredients (linked to products), instructions, add-all-ingredients-to-cart with household size.
- **Meal plan detail**: Plan with meals per day, add entire plan to cart.

---

## Suggested Features for the Meals Page

### Recipes

1. **Search** – Text search by recipe name, cuisine type, or ingredients (backend + frontend).
2. **Sort** – Sort by: newest, prep time (quick first), difficulty (easy first), servings, name.
3. **Favorites / Save recipes** – Let logged-in users save recipes to a “My Recipes” list (like saved chefs).
4. **“Cook this week”** – Mark 3–5 recipes for the week and “Add all to cart” in one click (household size applied to all).
5. **Cuisine type filter** – Dropdown or chips for African cuisines (e.g. West African, East African, Nigerian, Ghanaian) if the backend supports it.
6. **Dietary tags** – Filter or badge by vegetarian, vegan, gluten-free, etc. (if recipe model supports it).
7. **Prep time filter** – e.g. “Under 30 min”, “30–60 min”.
8. **Related recipes** – On recipe detail, show “You might also like” (same cuisine type or meal type).
9. **Print / PDF** – “Print recipe” or “Download PDF” on recipe detail.
10. **Share** – Share recipe link (Web Share API or copy link).

### Meal Plans

11. **Save custom plan** – Save “Build your plan” as a named plan in the user’s account (requires backend).
12. **Household size on plan cards** – When adding a suggested plan to cart, choose household size (1–6) before adding.
13. **Plan preview** – On plan card hover or tap, show a short preview (e.g. first 3 meals) before going to detail.
14. **Featured / staff picks** – Admin can mark meal plans as “Featured” and show them at the top or in a dedicated strip.
15. **Plan duration filter** – Already have one_day / one_week / one_month; add “custom” (e.g. 3 days) if needed.

### General

16. **Recently viewed recipes** – Track last 5–10 recipe IDs in localStorage and show “Recently viewed” on Meals page.
17. **Empty state CTA** – When no recipes match filters, suggest “Browse meal plans” or “Clear filters” more prominently.
18. **Breadcrumbs** – On recipe and meal plan detail, add breadcrumbs (Home → Meals → Recipe name).
19. **SEO** – Meta title/description and optional structured data (Recipe schema) for recipe pages.

---

## Meal & Recipe Section in Marketing

### Home Page (Customer)

- **Recipes & Meal Plans section** (implemented): A dedicated block on the home page showing a few featured recipes and a “View All” link to `/meals` so shoppers discover recipes and meal plans without going to the Meals page first.

### Additional Marketing Ideas

20. **Banner placements** – Ensure `meals_top_banner` and `meals_bottom_banner` are used on the Meals page and that admin can upload ads for these placements (already in PageBanner).
21. **Home hero mention** – In the main hero or tagline, briefly mention “recipes & meal plans” alongside groceries and chefs (e.g. “Groceries, recipes & chef meals, delivered”).
22. **Email / push** – “Recipe of the week” or “This week’s meal plan” in marketing emails or notifications (when that system exists).
23. **Deals page** – Optional “Meal plan deals” or “Recipe bundle” promos on a dedicated deals section or on Top Market Deals (e.g. “20% off this week’s meal plan”).
24. **Blog / content** – “How to use our meal plans”, “African recipe spotlights”, or “Ingredient guides” that link back to recipes and products (if you add a blog or content section).
25. **Admin marketing dashboard** – In the existing marketing/analytics dashboard, surface “Recipe & meal plan” metrics: top recipes by views or add-to-cart, meal plan conversion, suggested-plan usage (backend already has some of this in `marketing.py`).

---

## Summary Table

| Area           | Feature idea                          | Effort (rough) |
|----------------|---------------------------------------|-----------------|
| Meals page     | Search, sort, filters                 | Medium          |
| Meals page     | Favorites / saved recipes             | Medium (backend + UI) |
| Meals page     | “Cook this week” + add all to cart    | Small–medium    |
| Meals page     | Related recipes, print, share         | Small           |
| Meal plans     | Save custom plan, household on card  | Medium          |
| Marketing      | Recipes & Meal Plans block on Home    | Done            |
| Marketing      | Hero copy, banner placements          | Small           |
| Marketing      | Recipe/plan metrics in admin          | Small (backend already partial) |

Use this list to prioritize; the Home page “Recipes & Meal Plans” section is implemented to give the meal and recipe section more visibility in marketing.
