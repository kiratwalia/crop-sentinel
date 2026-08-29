import type {
  Alert,
  Analysis,
  Crop,
  Finding,
  HealthTrendPoint,
  Recommendation,
  RiskForecastPoint,
  RiskScores,
  WeatherNow,
} from "@/types";

export const DEMO_NOTICE =
  "Demo prediction — sample data for demonstration only, not a real diagnosis.";

export const crops: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    localName: "Tamatar",
    emoji: "🍅",
    season: "Rabi / Kharif",
    healthScore: 72,
  },
  { id: "potato", name: "Potato", localName: "Aloo", emoji: "🥔", season: "Rabi", healthScore: 64 },
  { id: "maize", name: "Maize", localName: "Makka", emoji: "🌽", season: "Kharif", healthScore: 85 },
  { id: "wheat", name: "Wheat", localName: "Gehun", emoji: "🌾", season: "Rabi", healthScore: 91 },
  { id: "rice", name: "Rice", localName: "Dhaan", emoji: "🌱", season: "Kharif", healthScore: 78 },
];

export const cropById = (id: string) => crops.find((c) => c.id === id);

export const findings: Finding[] = [
  {
    id: "early-blight",
    kind: "disease",
    name: "Early Blight",
    scientificName: "Alternaria solani",
    crops: ["tomato", "potato"],
    summary:
      "A fungal leaf disease that starts on older, lower leaves and spreads upward in warm, humid weather.",
    symptoms: [
      "Brown spots with dark rings, like a target mark",
      "Yellow ring around each spot",
      "Lower and older leaves dry up first",
      "Leaves fall early, fruit gets sunburn",
    ],
    immediateActions: [
      "Pluck and burn badly spotted leaves — do not leave them in the field",
      "Stop overhead watering; water at the base of the plant in the morning",
      "Spray a protective fungicide on both sides of the leaf",
      "Re-check the same plants after 5 days",
    ],
    prevention: [
      "Rotate with a non-solanaceous crop for 2 seasons",
      "Keep 60 cm spacing so air moves between plants",
      "Mulch the soil to stop rain splash",
      "Use certified, treated seed",
    ],
    organicOptions: [
      "Neem oil 3 ml/litre every 7 days",
      "Trichoderma viride soil drench",
      "Cow-milk spray (1:9 with water) as a mild protectant",
    ],
    chemicalOptions: [
      "Mancozeb 75% WP @ 2 g/litre",
      "Chlorothalonil 75% WP @ 2 g/litre (alternate to avoid resistance)",
    ],
    favourableConditions: [
      "Temperature 24-29°C",
      "Humidity above 80%",
      "Leaf wetness for more than 6 hours",
    ],
  },
  {
    id: "late-blight",
    kind: "disease",
    name: "Late Blight",
    scientificName: "Phytophthora infestans",
    crops: ["potato", "tomato"],
    summary:
      "A fast-moving disease that can destroy a field in under a week during cool, wet, cloudy weather.",
    symptoms: [
      "Water-soaked greasy patches on leaf edges",
      "White fuzzy growth under the leaf in the morning",
      "Stems turn black and collapse",
      "Tubers show firm brown rot",
    ],
    immediateActions: [
      "Treat as urgent — act the same day",
      "Remove and destroy infected plants away from the field",
      "Apply a systemic fungicide immediately",
      "Warn neighbouring farmers; this disease travels with wind",
    ],
    prevention: [
      "Plant only healthy, disease-free tubers",
      "Earth up potato ridges properly to protect tubers",
      "Avoid evening irrigation",
      "Harvest only in dry weather",
    ],
    organicOptions: [
      "Bordeaux mixture 1% as a preventive cover",
      "Copper oxychloride @ 3 g/litre",
    ],
    chemicalOptions: [
      "Metalaxyl + Mancozeb @ 2.5 g/litre",
      "Cymoxanil + Mancozeb @ 3 g/litre",
    ],
    favourableConditions: ["Temperature 12-20°C", "Humidity above 90%", "Continuous drizzle or fog"],
  },
  {
    id: "leaf-rust",
    kind: "disease",
    name: "Leaf Rust",
    scientificName: "Puccinia triticina",
    crops: ["wheat", "maize"],
    summary:
      "Orange-brown powdery pustules on leaves that reduce grain filling if they reach the flag leaf.",
    symptoms: [
      "Small orange-brown powder spots on the upper leaf",
      "Powder rubs off on your fingers",
      "Leaves dry from the tip downward",
      "Thin, shrivelled grain at harvest",
    ],
    immediateActions: [
      "Check the flag leaf first — protect it on priority",
      "Spray a triazole fungicide if 5% or more leaf area is affected",
      "Avoid extra nitrogen right now, it feeds the fungus",
    ],
    prevention: [
      "Sow rust-resistant varieties recommended for your district",
      "Sow on time; late sowing increases rust",
      "Remove volunteer wheat plants between seasons",
    ],
    organicOptions: ["Sulphur dust 20 kg/acre in the early stage", "Neem-based foliar spray"],
    chemicalOptions: ["Propiconazole 25% EC @ 1 ml/litre", "Tebuconazole 25.9% EC @ 1 ml/litre"],
    favourableConditions: ["Temperature 15-22°C", "Dew on leaves at night", "Humidity 70-85%"],
  },
  {
    id: "bacterial-leaf-blight",
    kind: "disease",
    name: "Bacterial Leaf Blight",
    scientificName: "Xanthomonas oryzae",
    crops: ["rice"],
    summary:
      "A bacterial disease of paddy that dries leaves from the tip and cuts yield sharply in flooded fields.",
    symptoms: [
      "Yellow wavy streaks from the leaf tip",
      "Leaf edges dry and turn straw coloured",
      "Milky ooze from a cut leaf kept in water",
      "Whole seedlings wilt in severe cases",
    ],
    immediateActions: [
      "Drain the field for 2-3 days to break the spread",
      "Stop top-dressing nitrogen for now",
      "Spray copper-based bactericide",
    ],
    prevention: [
      "Use resistant paddy varieties",
      "Balanced NPK, avoid excess urea",
      "Clean field bunds and remove weed hosts",
    ],
    organicOptions: ["Pseudomonas fluorescens seed and foliar treatment", "Cow-dung slurry filtrate spray"],
    chemicalOptions: ["Copper hydroxide @ 2 g/litre", "Streptocycline + copper oxychloride combination"],
    favourableConditions: ["Temperature 25-34°C", "Standing water with high humidity", "Strong wind or storm damage"],
  },
  {
    id: "fall-armyworm",
    kind: "pest",
    name: "Fall Armyworm",
    scientificName: "Spodoptera frugiperda",
    crops: ["maize", "rice"],
    summary:
      "A caterpillar pest that feeds inside the whorl of maize and can strip a young crop in days.",
    symptoms: [
      "Ragged holes and window-pane damage on leaves",
      "Moist sawdust-like droppings in the whorl",
      "Caterpillar with an inverted Y mark on the head",
      "Damaged growing point in young plants",
    ],
    immediateActions: [
      "Scout 10 plants at 5 spots — treat if 5% or more whorls are damaged",
      "Hand-pick and destroy egg masses and caterpillars in the morning",
      "Apply sand + lime mix into the whorl for young larvae",
      "Install 5 pheromone traps per acre",
    ],
    prevention: [
      "Deep summer ploughing to expose pupae",
      "Sow all fields in the area within a short window",
      "Intercrop with pulses to help natural enemies",
    ],
    organicOptions: [
      "Neem seed kernel extract 5%",
      "Bacillus thuringiensis @ 2 g/litre",
      "Release Trichogramma cards",
    ],
    chemicalOptions: [
      "Emamectin benzoate 5% SG @ 0.4 g/litre",
      "Spinetoram 11.7% SC @ 0.5 ml/litre",
    ],
    favourableConditions: ["Warm 22-32°C nights", "Dry spell after rain", "Young crop up to 40 days"],
  },
  {
    id: "whitefly",
    kind: "pest",
    name: "Whitefly Infestation",
    scientificName: "Bemisia tabaci",
    crops: ["tomato", "potato"],
    summary:
      "Tiny white flying insects that suck sap and spread leaf-curl virus; they hide under the leaf.",
    symptoms: [
      "Cloud of tiny white insects when you shake the plant",
      "Sticky honeydew and black sooty mould on leaves",
      "Leaves curl upward and turn leathery",
      "Stunted growth and poor flowering",
    ],
    immediateActions: [
      "Put up 8-10 yellow sticky traps per acre",
      "Spray under the leaves — that is where they sit",
      "Remove virus-affected plants completely",
    ],
    prevention: [
      "Grow a maize or bajra barrier crop around the field",
      "Use silver reflective mulch",
      "Avoid continuous tomato-tomato cropping",
    ],
    organicOptions: ["Neem oil 5 ml/litre with soap sticker", "Verticillium lecanii spray"],
    chemicalOptions: ["Diafenthiuron 50% WP @ 1 g/litre", "Flonicamid 50% WG @ 0.3 g/litre"],
    favourableConditions: ["Temperature 28-35°C", "Dry weather", "Low rainfall spells"],
  },
  {
    id: "healthy",
    kind: "disease",
    name: "No Disease Detected",
    scientificName: "Healthy leaf tissue",
    crops: ["tomato", "potato", "maize", "wheat", "rice"],
    summary: "The sample looks healthy. Keep up your current practices and monitor weekly.",
    symptoms: ["Uniform green colour", "No spots, holes or wilting", "Firm leaf texture"],
    immediateActions: [
      "No treatment needed today",
      "Re-scout the field after 7 days",
      "Keep photo records for comparison",
    ],
    prevention: [
      "Continue balanced fertiliser and clean irrigation",
      "Keep field borders weed-free",
      "Watch the weather-based risk score",
    ],
    organicOptions: ["Preventive neem spray every 15 days"],
    chemicalOptions: ["Not required at this stage"],
    favourableConditions: ["Good airflow", "Moderate humidity", "Balanced nutrition"],
  },
];

export const findingById = (id: string) => findings.find((f) => f.id === id);

export const weatherNow: WeatherNow = {
  temperatureC: 27,
  humidity: 84,
  rainfallMm: 12.4,
  windKph: 9,
  condition: "Humid with passing showers",
  location: "Nashik, Maharashtra (demo location)",
  updatedAt: "Today, 9:00 AM",
};

export const riskScores: RiskScores = {
  disease: 74,
  pest: 52,
  environmental: 66,
  overall: 68,
};

export const riskForecast: RiskForecastPoint[] = [
  { day: "Mon", disease: 62, pest: 44, environmental: 58 },
  { day: "Tue", disease: 68, pest: 47, environmental: 61 },
  { day: "Wed", disease: 74, pest: 52, environmental: 66 },
  { day: "Thu", disease: 81, pest: 55, environmental: 72 },
  { day: "Fri", disease: 77, pest: 61, environmental: 70 },
  { day: "Sat", disease: 65, pest: 58, environmental: 60 },
  { day: "Sun", disease: 57, pest: 49, environmental: 54 },
];

export const healthTrend: HealthTrendPoint[] = [
  { date: "Week 1", health: 88, risk: 32 },
  { date: "Week 2", health: 85, risk: 38 },
  { date: "Week 3", health: 81, risk: 45 },
  { date: "Week 4", health: 76, risk: 58 },
  { date: "Week 5", health: 79, risk: 52 },
  { date: "Week 6", health: 74, risk: 64 },
  { date: "This week", health: 78, risk: 68 },
];

export const alerts: Alert[] = [
  {
    id: "a1",
    cropId: "potato",
    title: "Late blight conditions building up",
    detail: "Cool nights and 90% humidity for 3 days. Inspect potato plots today.",
    severity: "critical",
    createdAt: "2 hours ago",
  },
  {
    id: "a2",
    cropId: "tomato",
    title: "Early blight spots reported nearby",
    detail: "Two analyses in your area showed early blight this week.",
    severity: "high",
    createdAt: "Yesterday",
  },
  {
    id: "a3",
    cropId: "maize",
    title: "Fall armyworm moth activity rising",
    detail: "Pheromone trap counts up 40%. Start whorl scouting.",
    severity: "moderate",
    createdAt: "2 days ago",
  },
];

const sampleImage = (seed: string) =>
  `https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=60&sig=${seed}`;

export const sampleAnalyses: Analysis[] = [
  {
    id: "an-1042",
    cropId: "tomato",
    mode: "auto",
    findingId: "early-blight",
    confidence: 92,
    severity: "high",
    riskLevel: "high",
    imageUrl: sampleImage("1"),
    createdAt: "2026-08-28T09:15:00.000Z",
    affectedArea: 34,
    envFactors: [],
    isSample: true,
  },
  {
    id: "an-1041",
    cropId: "potato",
    mode: "disease",
    findingId: "late-blight",
    confidence: 88,
    severity: "critical",
    riskLevel: "severe",
    imageUrl: sampleImage("2"),
    createdAt: "2026-08-27T15:40:00.000Z",
    affectedArea: 46,
    envFactors: [],
    isSample: true,
  },
  {
    id: "an-1040",
    cropId: "maize",
    mode: "pest",
    findingId: "fall-armyworm",
    confidence: 84,
    severity: "moderate",
    riskLevel: "moderate",
    imageUrl: sampleImage("3"),
    createdAt: "2026-08-26T07:05:00.000Z",
    affectedArea: 18,
    envFactors: [],
    isSample: true,
  },
  {
    id: "an-1039",
    cropId: "wheat",
    mode: "auto",
    findingId: "healthy",
    confidence: 95,
    severity: "low",
    riskLevel: "low",
    imageUrl: sampleImage("4"),
    createdAt: "2026-08-24T11:20:00.000Z",
    affectedArea: 0,
    envFactors: [],
    isSample: true,
  },
  {
    id: "an-1038",
    cropId: "rice",
    mode: "disease",
    findingId: "bacterial-leaf-blight",
    confidence: 79,
    severity: "high",
    riskLevel: "high",
    imageUrl: sampleImage("5"),
    createdAt: "2026-08-22T16:55:00.000Z",
    affectedArea: 27,
    envFactors: [],
    isSample: true,
  },
  {
    id: "an-1037",
    cropId: "tomato",
    mode: "pest",
    findingId: "whitefly",
    confidence: 81,
    severity: "moderate",
    riskLevel: "moderate",
    imageUrl: sampleImage("6"),
    createdAt: "2026-08-20T08:10:00.000Z",
    affectedArea: 21,
    envFactors: [],
    isSample: true,
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "r1",
    cropId: "potato",
    priority: "urgent",
    title: "Protect potato plots against late blight today",
    why: "Humidity has stayed above 85% for three nights. Late blight can wipe out a plot within a week.",
    steps: [
      "Walk the field and mark plants with greasy dark patches",
      "Remove and destroy those plants outside the field",
      "Spray a systemic fungicide, covering the underside of leaves",
      "Re-inspect after 4 days",
    ],
    organic: ["Bordeaux mixture 1%", "Copper oxychloride @ 3 g/litre"],
    chemical: ["Metalaxyl + Mancozeb @ 2.5 g/litre"],
  },
  {
    id: "r2",
    cropId: "tomato",
    priority: "urgent",
    title: "Stop early blight from moving to upper leaves",
    why: "A recent sample showed 34% leaf area affected. Upper leaves are still clean and can be saved.",
    steps: [
      "Pluck the lower spotted leaves and burn them",
      "Switch to drip or basin irrigation, avoid wetting leaves",
      "Apply a protectant fungicide in the morning",
    ],
    organic: ["Neem oil 3 ml/litre", "Trichoderma soil drench"],
    chemical: ["Mancozeb 75% WP @ 2 g/litre"],
  },
  {
    id: "r3",
    cropId: "maize",
    priority: "this-week",
    title: "Start fall armyworm whorl scouting",
    why: "Trap catches are rising and the crop is in the vulnerable 20-40 day stage.",
    steps: [
      "Check 10 plants at 5 random spots",
      "Destroy egg masses by hand",
      "Set up 5 pheromone traps per acre",
    ],
    organic: ["Neem seed kernel extract 5%", "Bacillus thuringiensis @ 2 g/litre"],
    chemical: ["Emamectin benzoate 5% SG @ 0.4 g/litre"],
  },
  {
    id: "r4",
    cropId: "tomato",
    priority: "this-week",
    title: "Install yellow sticky traps for whitefly",
    why: "Whitefly numbers climb in dry, warm spells and they spread leaf-curl virus.",
    steps: ["Place 8-10 traps per acre at canopy height", "Check traps twice a week", "Remove virus-affected plants"],
    organic: ["Neem oil 5 ml/litre with soap sticker"],
    chemical: ["Diafenthiuron 50% WP @ 1 g/litre"],
  },
  {
    id: "r5",
    cropId: "rice",
    priority: "preventive",
    title: "Keep nitrogen balanced in paddy",
    why: "Excess urea makes paddy soft and invites bacterial leaf blight.",
    steps: ["Split urea into three doses", "Do a leaf colour chart check", "Keep bunds free of weeds"],
    organic: ["Pseudomonas fluorescens seed treatment"],
    chemical: ["Not required as a preventive step"],
  },
  {
    id: "r6",
    cropId: "wheat",
    priority: "preventive",
    title: "Watch the flag leaf for rust",
    why: "Wheat health is good at 91%, but dew at night can bring leaf rust quickly.",
    steps: ["Inspect the flag leaf weekly", "Note any orange powder on fingers", "Keep a fungicide ready, do not spray blindly"],
    organic: ["Sulphur dust in early stage"],
    chemical: ["Propiconazole 25% EC @ 1 ml/litre (only if rust appears)"],
  },
];
