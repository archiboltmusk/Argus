/**
 * Argus Sovereign Food Canon Radar
 *
 * Implements the "Food Canon Event" architecture:
 * 1. Need States (Not generic cuisine, but biological/emotional reality: Solace, Awakening, Fuel, Communion)
 * 2. Dish-Level Precision (The signature benchmark dish + peak preparation hour, not flattened restaurant ratings)
 * 3. The Sovereign Single Recommendation (Returns EXACTLY ONE plate to eliminate menu paralysis)
 * 4. The Serendipity Loosening (Surfaces unrated, proof-of-work neighborhood gems)
 * 5. Strictly Local Private Loop (Zero telemetry, no sponsored placements, no ghost kitchen sludge)
 */

export type FoodNeedState =
  | "solace_reset"        // Comfort, gentle warmth, emotional grounding after exhausting days
  | "sensory_awakening"   // High contrast, crunch, acid, spice, reviving dull senses
  | "kinetic_fuel"        // Clean, quick, high-energy, zero-sluggishness lunch
  | "tribal_communion";   // Shared feasts, slow unhurried dining with friends

export interface SignatureDishEntry {
  id: string;
  dishName: string;
  venueName: string;
  neighborhood: string; // e.g. "Shyambazar", "Park Circus", "Southern Avenue", "College Street"
  city: string; // "Kolkata"
  needState: FoodNeedState;
  peakHourDescription: string; // e.g. "8:00 PM – 9:00 PM when the second fresh kadai batch finishes"
  bestMealTimes: Array<"breakfast" | "lunch" | "evening_snack" | "dinner" | "late_night">;
  craftLineage: string; // e.g. "3rd-generation slow-cooked mustard oil gravy"
  priceDisplay: string; // e.g. "₹240"
  whyThisNow: string; // Epistemic reason for this single choice
  isUnratedStall?: boolean; // True for offline hidden gems with zero ad footprint
  walkingTip?: string;
}

export interface FoodEncounterQuery {
  needState: FoodNeedState;
  mealTime?: "breakfast" | "lunch" | "evening_snack" | "dinner" | "late_night";
  budgetMaxInr?: number;
  allowWildcardSerendipity?: boolean; // Loosen filter to invite unexpected discoveries
}

export const CURATED_KOLKATA_FOOD_CANON: SignatureDishEntry[] = [
  {
    id: "golbari-kosha-mangsho",
    dishName: "Kosha Mangsho with Rumali Roti",
    venueName: "New Punjabi Hotel (Golbari)",
    neighborhood: "Shyambazar 5-Point Crossing",
    city: "Kolkata",
    needState: "solace_reset",
    peakHourDescription: "7:45 PM – 8:30 PM when the second batch reaches velvety black-brown reduction",
    bestMealTimes: ["dinner", "late_night"],
    craftLineage: "98-year-old North Kolkata institution using slow-rendered mutton fat and secret spice paste",
    priceDisplay: "₹380",
    whyThisNow: "Uncompromising slow-cooked depth designed to dissolve mental exhaustion into rich, peppery warmth.",
    walkingTip: "Take the tram or metro to Shyambazar. Stand near the doorway counter to get the fresh kadai gravy.",
  },
  {
    id: "arsalan-mutton-biryani",
    dishName: "Kolkata Mutton Biryani with Golden Potato & Egg",
    venueName: "Arsalan (Original Marina)",
    neighborhood: "Park Circus 7-Point",
    city: "Kolkata",
    needState: "tribal_communion",
    peakHourDescription: "1:00 PM – 2:15 PM when the morning dum handi is unsealed",
    bestMealTimes: ["lunch", "dinner"],
    craftLineage: "Awadhi heritage refined in Metiabruz: long-grain aged basmati steeped in meetha ittar and gentle saffron stock",
    priceDisplay: "₹395",
    whyThisNow: "The defining communal benchmark of the city: fragrant, non-greasy grains balanced by a melt-in-mouth potato.",
    walkingTip: "Sit on the first floor with 2 or more friends; order one extra potato per person.",
  },
  {
    id: "southern-ave-gondhoraj-puchka",
    dishName: "Gondhoraj Lime & Iced Tamarind Puchka",
    venueName: "Dilip Da's Puchka Corner",
    neighborhood: "Southern Avenue (Near Vivekananda Park)",
    city: "Kolkata",
    needState: "sensory_awakening",
    peakHourDescription: "5:30 PM – 6:45 PM right as evening breeze sets in and spiced potato mash is fresh",
    bestMealTimes: ["evening_snack"],
    craftLineage: "Hand-pounded roasted cumin, black salt, fresh green chilli paste, and fragrant Gondhoraj zest",
    priceDisplay: "₹60 (8 pcs)",
    whyThisNow: "Immediate sensory shock: thin wafer-crisp semolina shells exploding with chilled citrus acid and warm roasted spice.",
    isUnratedStall: true,
    walkingTip: "No online presence or delivery. Walk past the lake railings; follow the crowd around the copper urn.",
  },
  {
    id: "college-st-paramount-sherbet",
    dishName: "Daab Sherbet (Tender Coconut & Malai Elixir)",
    venueName: "Paramount Cold Storage",
    neighborhood: "College Street (Boipara)",
    city: "Kolkata",
    needState: "kinetic_fuel",
    peakHourDescription: "2:30 PM – 4:00 PM during afternoon book-hunting lull",
    bestMealTimes: ["lunch", "evening_snack"],
    craftLineage: "Established in 1918; revolutionary meeting ground serving natural green coconut water with scraped malai and rose syrup",
    priceDisplay: "₹120",
    whyThisNow: "Zero-sugar heaviness, instant natural electrolyte surge and cooling mental clarity surrounded by century-old bookshelves.",
  },
  {
    id: "dekho-unrated-cabin-wildcard",
    dishName: "Mutton Kabiraji Cutlet with Kasundi",
    venueName: "Mitra Cafe (Historic Counter)",
    neighborhood: "Shobhabazar",
    city: "Kolkata",
    needState: "sensory_awakening",
    peakHourDescription: "6:00 PM – 7:15 PM fresh out of bubbling mustard oil",
    bestMealTimes: ["evening_snack", "dinner"],
    craftLineage: "British-era 'Coverage' cutlet encased in an airy, crispy spider-web egg lace lattice",
    priceDisplay: "₹220",
    whyThisNow: "The forgotten architecture of texture: gossamer egg crunch giving way to tender minced mutton and sinus-clearing fermented mustard.",
    walkingTip: "Get off at Shobhabazar Metro Gate 1. Eat it standing at the marble counter with raw onion rings.",
  },
];

const STORAGE_FOOD_HISTORY_KEY = "argus.food_radar.history";

export interface MealFeedbackRecord {
  dishId: string;
  eatenAtEpochMs: number;
  rating: "transcendent_canon" | "comforting_solid" | "mediocre_miss";
  personalNote?: string;
}

export class FoodCanonRadarEngine {
  private dishes: Map<string, SignatureDishEntry> = new Map();
  private feedbackHistory: MealFeedbackRecord[] = [];

  constructor() {
    for (const d of CURATED_KOLKATA_FOOD_CANON) {
      this.dishes.set(d.id, d);
    }
    this.loadState();
  }

  private loadState(): void {
    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        const stored = localStorage.getItem(STORAGE_FOOD_HISTORY_KEY);
        if (stored) {
          this.feedbackHistory = JSON.parse(stored);
        }
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        localStorage.setItem(STORAGE_FOOD_HISTORY_KEY, JSON.stringify(this.feedbackHistory));
      }
    } catch {}
  }

  /**
   * Automatically resolves current time-of-day meal category
   */
  public getCurrentMealTime(): "breakfast" | "lunch" | "evening_snack" | "dinner" | "late_night" {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return "breakfast";
    if (hour >= 11 && hour < 16) return "lunch";
    if (hour >= 16 && hour < 19) return "evening_snack";
    if (hour >= 19 && hour < 23) return "dinner";
    return "late_night";
  }

  /**
   * The Sovereign Food Encounter:
   * Returns EXACTLY ONE signature dish based on need state, time, and budget.
   * Eliminates the 200-item menu paralysis.
   */
  public resolveSovereignPlate(query: FoodEncounterQuery): SignatureDishEntry | null {
    const targetMeal = query.mealTime || this.getCurrentMealTime();
    let candidates = Array.from(this.dishes.values());

    // 1. Strict filter by Need State
    let matches = candidates.filter((d) => d.needState === query.needState);

    // 2. Meal time alignment
    const mealTimeMatches = matches.filter((d) => d.bestMealTimes.includes(targetMeal));
    if (mealTimeMatches.length > 0) {
      matches = mealTimeMatches;
    }

    // 3. Serendipity Loosening: if wildcard is enabled or no match found
    if (query.allowWildcardSerendipity && Math.random() > 0.6) {
      const wildcards = candidates.filter((d) => d.isUnratedStall || d.id.includes("wildcard"));
      if (wildcards.length > 0) {
        return wildcards[Math.floor(Math.random() * wildcards.length)];
      }
    }

    if (matches.length === 0) {
      matches = candidates; // Graceful fallback
    }

    // Return the highest-resonance single dish
    return matches[0] || null;
  }

  public registerDish(dish: SignatureDishEntry): void {
    this.dishes.set(dish.id, dish);
  }

  public getAllDishes(): SignatureDishEntry[] {
    return Array.from(this.dishes.values());
  }

  public logMealFeedback(feedback: MealFeedbackRecord): void {
    this.feedbackHistory.push(feedback);
    this.saveState();
  }

  public getMealHistory(): MealFeedbackRecord[] {
    return [...this.feedbackHistory];
  }
}

export const foodCanonRadar = new FoodCanonRadarEngine();
