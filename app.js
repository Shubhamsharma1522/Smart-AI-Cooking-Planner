// ==========================================================================
// CulinarySync AI - Core Application Script
// ==========================================================================

// Global Application State
const state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    theme: localStorage.getItem('app_theme') || 'dark',
    currentPlan: null,
    activeTimer: {
        intervalId: null,
        durationSeconds: 0,
        remainingSeconds: 0,
        taskName: '',
        isPaused: true,
        isMuted: false
    },
    checkedTodos: new Set(),
    checkedGroceries: new Set(),
    selectedSub: null
};

// Local Static Substitution Dictionary (Instant Cache)
const LOCAL_SUBSTITUTIONS = {
    "egg": [
        { alternative: "Applesauce", ratio: "1/4 cup per egg", notes: "Best for moist baking (muffins, quick breads)." },
        { alternative: "Chia / Flaxseed Egg", ratio: "1 tbsp ground seed + 3 tbsp water", notes: "Let sit for 5 mins to gel. Great for nutty flavor and binding." },
        { alternative: "Silken Tofu", ratio: "1/4 cup blended silken tofu", notes: "Adds protein and moisture, neutral flavor." }
    ],
    "eggs": [
        { alternative: "Applesauce", ratio: "1/4 cup per egg", notes: "Best for moist baking (muffins, quick breads)." },
        { alternative: "Chia / Flaxseed Egg", ratio: "1 tbsp ground seed + 3 tbsp water", notes: "Let sit for 5 mins to gel. Great for nutty flavor and binding." }
    ],
    "milk": [
        { alternative: "Oat Milk", ratio: "1:1 replacement", notes: "Creamy texture, slightly sweet, excellent for oats and baking." },
        { alternative: "Almond Milk", ratio: "1:1 replacement", notes: "Lower calorie, light, slight nutty flavor." },
        { alternative: "Coconut Milk (Carton)", ratio: "1:1 replacement", notes: "Slight coconut flavor, rich texture." }
    ],
    "butter": [
        { alternative: "Coconut Oil", ratio: "1:1 replacement", notes: "Adds a subtle coconut aroma. Excellent for baking." },
        { alternative: "Olive Oil", ratio: "3/4 tbsp oil per 1 tbsp butter", notes: "Great for savory dishes and sauteing." },
        { alternative: "Mashed Avocado", ratio: "1:1 replacement", notes: "Reduces fat, adds nutrients. Best in brownies or dark chocolate bakes." }
    ],
    "chicken": [
        { alternative: "Tofu (Extra Firm)", ratio: "1:1 replacement", notes: "Press tofu before cooking to remove water. Season heavily or marinade." },
        { alternative: "Tempeh", ratio: "1:1 replacement", notes: "Nutty, firm texture, holds up well to grilling and sautéing." },
        { alternative: "Chickpeas (Canned)", ratio: "1 cup chickpeas per chicken breast", notes: "Perfect for curries, salads, and stews." }
    ],
    "cheese": [
        { alternative: "Nutritional Yeast", ratio: "Use as sprinkler (2 tbsp)", notes: "Adds a cheesy, nutty, savory flavor. Great for pasta/sauces." },
        { alternative: "Cashew Cheese", ratio: "Blend soaked cashews with lemon & garlic", notes: "Rich and creamy, perfect spread or melt alternative." }
    ],
    "all-purpose flour": [
        { alternative: "Oat Flour", ratio: "1:1 by weight (or 1.25 cup per cup)", notes: "Gluten-free, makes bakes denser and fiber-rich." },
        { alternative: "Almond Flour", ratio: "1:1 replacement", notes: "Needs more binder (like egg), adds fat and density, low carb." }
    ]
};

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAPIKeyStatus();
    setupEventListeners();
});

// Theme setup
function initTheme() {
    document.body.setAttribute('data-theme', state.theme);
    const themeIcon = document.querySelector('#btn-toggle-theme span');
    themeIcon.textContent = state.theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('app_theme', state.theme);
    initTheme();
}

// API status setup
function initAPIKeyStatus() {
    const badge = document.getElementById('api-status-badge');
    const inputKey = document.getElementById('input-api-key');
    
    if (state.apiKey) {
        badge.textContent = "API ACTIVE";
        badge.className = "status-badge status-active";
        inputKey.value = state.apiKey;
    } else {
        badge.textContent = "DEMO MODE";
        badge.className = "status-badge status-demo";
        inputKey.value = '';
    }
}

// Event Bindings
function setupEventListeners() {
    // Theme Button
    document.getElementById('btn-toggle-theme').addEventListener('click', toggleTheme);

    // Modal Actions
    document.getElementById('btn-open-settings').addEventListener('click', openSettingsModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeSettingsModal);
    document.getElementById('btn-save-key').addEventListener('click', saveAPIKey);
    document.getElementById('btn-clear-key').addEventListener('click', clearAPIKey);
    document.getElementById('btn-use-demo').addEventListener('click', () => {
        closeSettingsModal();
    });

    // Form Submission
    document.getElementById('cooking-planner-form').addEventListener('submit', handleFormSubmit);

    // Budget Slider Value display
    const budgetSlider = document.getElementById('input-budget');
    const budgetDisplay = document.getElementById('budget-value');
    budgetSlider.addEventListener('input', (e) => {
        budgetDisplay.textContent = `$${e.target.value}`;
    });

    // Results Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });

    // Timeline Filtering
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            filterTimeline(e.target.getAttribute('data-filter'));
        }
    });

    // Timer Controls
    document.getElementById('btn-timer-play-pause').addEventListener('click', toggleTimer);
    document.getElementById('btn-timer-reset').addEventListener('click', resetTimer);
    
    const muteBtn = document.getElementById('btn-timer-mute');
    muteBtn.addEventListener('click', () => {
        state.activeTimer.isMuted = !state.activeTimer.isMuted;
        const icon = document.getElementById('btn-mute-icon');
        icon.textContent = state.activeTimer.isMuted ? 'volume_off' : 'volume_up';
    });

    // Substitution Search Button
    document.getElementById('btn-search-sub').addEventListener('click', triggerSubSearch);
    document.getElementById('input-sub-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerSubSearch();
    });

    // Export Grocery List Button
    document.getElementById('btn-export-groceries').addEventListener('click', exportGroceries);
}

// Modal functions
function openSettingsModal() {
    document.getElementById('modal-settings').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('modal-settings').classList.add('hidden');
}

function saveAPIKey() {
    const key = document.getElementById('input-api-key').value.trim();
    if (key) {
        state.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        initAPIKeyStatus();
        closeSettingsModal();
    }
}

function clearAPIKey() {
    state.apiKey = '';
    localStorage.removeItem('gemini_api_key');
    initAPIKeyStatus();
    closeSettingsModal();
}

// Switch Result Tabs
function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
        tab.classList.remove('active-content');
    });
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active-content');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// ==========================================================================
// Form Generation & AI Connection
// ==========================================================================
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const dayDesc = document.getElementById('input-day-desc').value.trim();
    const diet = document.getElementById('select-diet').value;
    const budget = document.getElementById('input-budget').value;
    const servings = document.getElementById('input-servings').value;
    const prepTime = document.getElementById('select-prep-time').value;

    // Get checked equipment
    const equipment = [];
    document.querySelectorAll('#equipment-group input:checked').forEach(cb => {
        equipment.push(cb.value);
    });

    // Toggle Skeletons
    document.getElementById('results-placeholder').classList.add('hidden');
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('results-skeleton').classList.remove('hidden');

    try {
        let planData;
        if (state.apiKey) {
            planData = await generateAICookingPlan(dayDesc, diet, budget, servings, prepTime, equipment);
        } else {
            // Simulate AI generating plan (looks very realistic, tailored to input)
            planData = await generateMockPlan(dayDesc, diet, budget, servings, prepTime, equipment);
        }

        state.currentPlan = planData;
        state.checkedTodos.clear();
        state.checkedGroceries.clear();
        
        renderMealDashboard(planData);
        renderTimelineList(planData.timeline);
        renderGroceryList(planData.groceries);
        renderBudgetFeasibility(planData.budget, budget);
        initDefaultSubstitution(planData.substitutions);

        // Show contents
        document.getElementById('results-skeleton').classList.add('hidden');
        document.getElementById('results-content').classList.remove('hidden');
        switchTab('tab-meals');

    } catch (err) {
        console.error("Error generating plan:", err);
        alert("Failed to generate cooking plan. Please verify your internet connection or try again later. Error details: " + err.message);
        document.getElementById('results-skeleton').classList.add('hidden');
        document.getElementById('results-placeholder').classList.remove('hidden');
    }
}

// Call Gemini API
async function generateAICookingPlan(dayDesc, diet, budget, servings, prepTime, equipment) {
    const prompt = `
Generate a structured personal meal plan, cooking to-do checklist, grocery list, budget compatibility evaluation, and common swaps based on these rules:
- Day Context: "${dayDesc}"
- Dietary preference: "${diet}"
- Daily budget cap: $${budget} USD
- Number of servings: ${servings}
- Max prep time per meal: ${prepTime === 'any' ? 'No limit' : prepTime + ' mins'}
- Kitchen equipment available: ${equipment.length > 0 ? equipment.join(", ") : 'Basic kitchen only'}

You MUST respond with a single, highly structured JSON object following this EXACT schema (do not write any markdown wrappers like \`\`\`json outside, just return the raw JSON text):
{
  "meals": {
    "breakfast": {
      "title": "Breakfast meal name",
      "time": 15,
      "calories": 350,
      "description": "Short explanation matching the schedule context",
      "ingredients": ["egg", "milk", "bread"]
    },
    "lunch": {
      "title": "Lunch meal name",
      "time": 20,
      "calories": 500,
      "description": "Short description",
      "ingredients": ["spinach", "chicken breast", "olive oil"]
    },
    "dinner": {
      "title": "Dinner meal name",
      "time": 25,
      "calories": 600,
      "description": "Short description",
      "ingredients": ["rice", "tofu", "soy sauce", "vegetables"]
    }
  },
  "timeline": [
    {
      "id": "t1",
      "meal": "breakfast",
      "timeLabel": "08:00 AM",
      "title": "Prep Breakfast Ingredients",
      "instructions": "Whisk eggs with a splash of milk, chop parsley.",
      "durationMinutes": 5
    },
    {
      "id": "t2",
      "meal": "breakfast",
      "timeLabel": "08:05 AM",
      "title": "Cook Scrambled Eggs",
      "instructions": "Melt butter in skillet, add eggs, stir gently on low heat until soft curds form.",
      "durationMinutes": 5
    },
    {
      "id": "t3",
      "meal": "lunch",
      "timeLabel": "01:00 PM",
      "title": "Assemble Chicken Salad",
      "instructions": "Dice cooked chicken, toss with baby spinach, tomatoes, and olive oil dressing.",
      "durationMinutes": 10
    },
    {
      "id": "t4",
      "meal": "dinner",
      "timeLabel": "07:00 PM",
      "title": "Stir-Fry Tofu & Veggies",
      "instructions": "Heat oil in wok, fry pressed cubed tofu, add chopped broccoli and carrots, toss in soy sauce.",
      "durationMinutes": 15
    }
  ],
  "groceries": [
    { "name": "Large Eggs", "category": "Dairy", "quantity": "4 units", "essential": true },
    { "name": "Whole Milk", "category": "Dairy", "quantity": "100 ml", "essential": false },
    { "name": "Loaf of Bread", "category": "Pantry", "quantity": "1 loaf", "essential": true },
    { "name": "Baby Spinach", "category": "Produce", "quantity": "150g", "essential": true },
    { "name": "Chicken Breast", "category": "Meat & Seafood", "quantity": "300g", "essential": true },
    { "name": "Firm Tofu", "category": "Pantry", "quantity": "250g", "essential": true },
    { "name": "Broccoli & Carrots", "category": "Produce", "quantity": "200g", "essential": false }
  ],
  "substitutions": {
    "Eggs": [
      { "alternative": "Silken Tofu", "ratio": "1/4 cup per egg", "notes": "Good binder for scrambles." }
    ],
    "Chicken Breast": [
      { "alternative": "Canned Chickpeas", "ratio": "1 can", "notes": "Budget-friendly vegan alternative." }
    ]
  },
  "budget": {
    "estimatedCost": 18.50,
    "feasibilityPercentage": 85,
    "statusMessage": "Comfortable: Well within your limit. You have $6.50 remaining.",
    "savingTips": [
      "Buy store-brand eggs and bulk tofu to save $2.00.",
      "Substitute chicken breast with canned chickpeas if you want to lower the cost to $14."
    ]
  }
}

Ensure all steps in the timeline are logical, realistic, and tailored to the schedule in "Day Context". Adjust estimatedCost reasonably to represent the servings and meal styles.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "HTTP API error");
    }

    const jsonRes = await response.json();
    const responseText = jsonRes.candidates[0].content.parts[0].text;
    
    // Parse response
    return JSON.parse(responseText);
}

// Generate high-fidelity tailored mock plans (Demo Mode)
async function generateMockPlan(dayDesc, diet, budget, servings, prepTime, equipment) {
    // Artificial latency for premium developer feedback feel (500ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    const lowercaseDesc = dayDesc.toLowerCase();
    
    // Tailor mock based on diet
    let bTitle = "Avocado Toast with Soft Eggs";
    let bIng = ["Ripe Avocado", "Eggs", "Sourdough Slices", "Cherry Tomatoes"];
    let lTitle = "Grilled Garlic-Herb Chicken Salad";
    let lIng = ["Chicken Breast", "Mixed Greens", "Cucumber", "Olive Oil", "Lemon"];
    let dTitle = "Sesame Garlic Tofu Stir-Fry";
    let dIng = ["Firm Tofu", "Broccoli Florets", "Carrots", "Soy Sauce", "Sesame Oil", "Brown Rice"];

    if (diet === 'vegan' || diet === 'vegetarian') {
        bTitle = "Almond Butter & Banana Toast";
        bIng = ["Sourdough Bread", "Almond Butter", "Banana", "Chia Seeds"];
        lTitle = "Mediterranean Chickpea Salad";
        lIng = ["Canned Chickpeas", "Cucumber", "Cherry Tomatoes", "Olives", "Olive Oil", "Lemon"];
    }

    if (diet === 'vegan') {
        dTitle = "Crispy Ginger Tofu Stir-Fry";
        dIng = ["Firm Tofu", "Broccoli Florets", "Snap Peas", "Soy Sauce", "Ginger", "Brown Rice"];
    }

    if (diet === 'keto') {
        bTitle = "Bacon & Spinach Omelette";
        bIng = ["Eggs", "Streaky Bacon", "Baby Spinach", "Cheddar Cheese"];
        lTitle = "Avocado Chicken Bowl";
        lIng = ["Chicken Breast", "Ripe Avocado", "Leafy Greens", "Olive Oil"];
        dTitle = "Creamy Lemon Baked Salmon";
        dIng = ["Salmon Fillets", "Heavy Cream", "Lemon juice", "Asparagus spears", "Garlic"];
    }

    // Schedule adjustments
    let timeline = [];
    const isBusy = lowercaseDesc.includes('busy') || lowercaseDesc.includes('work') || lowercaseDesc.includes('late') || lowercaseDesc.includes('time') || prepTime === '15';
    
    if (isBusy) {
        timeline = [
            {
                id: "step1",
                meal: "breakfast",
                timeLabel: "07:30 AM",
                title: "Prep Toast & Fruit",
                instructions: "Toast your bread and slice bananas or prep avocados.",
                durationMinutes: 4
            },
            {
                id: "step2",
                meal: "breakfast",
                timeLabel: "07:34 AM",
                title: "Quick Assemble Breakfast",
                instructions: "Spread almond butter or avocado onto toast, top with chia seeds/spices.",
                durationMinutes: 3
            },
            {
                id: "step3",
                meal: "lunch",
                timeLabel: "12:30 PM",
                title: "Toss Cold Salad",
                instructions: "Open canned chickpeas or chop pre-cooked protein, toss quickly with greens and vinaigrette.",
                durationMinutes: 5
            },
            {
                id: "step4",
                meal: "dinner",
                timeLabel: "06:45 PM",
                title: "High-Heat Stir Fry",
                instructions: "Sauté tofu or protein on high heat in a wok. Toss in veggies and sauce, cover for 4 mins to steam.",
                durationMinutes: 10
            }
        ];
    } else {
        timeline = [
            {
                id: "step1",
                meal: "breakfast",
                timeLabel: "08:30 AM",
                title: "Warm Cook Breakfast",
                instructions: "Slowly fry eggs in butter, toast sourdough, and roast cherry tomatoes.",
                durationMinutes: 10
            },
            {
                id: "step2",
                meal: "lunch",
                timeLabel: "01:00 PM",
                title: "Grill Protein & Chop Vegetables",
                instructions: "Grill chicken or prepare chickpeas, chop fresh cucumbers and herbs, toss together.",
                durationMinutes: 15
            },
            {
                id: "step3",
                meal: "dinner",
                timeLabel: "07:15 PM",
                title: "Press Tofu & Steam Rice",
                instructions: "Rinse rice and start rice cooker. Wrap tofu in a clean towel and apply weight to extract excess water.",
                durationMinutes: 15
            },
            {
                id: "step4",
                meal: "dinner",
                timeLabel: "07:30 PM",
                title: "Stir Fry Dinner",
                instructions: "Cube pressed tofu, dust with cornstarch. Shallow fry until golden, add chopped veggies and stir-fry sauce.",
                durationMinutes: 15
            }
        ];
    }

    // Grocery compile
    const allIng = [...new Set([...bIng, ...lIng, ...dIng])];
    const categories = ["Produce", "Pantry", "Dairy", "Meat & Seafood", "Grains"];
    const groceries = allIng.map((name, i) => {
        let cat = "Pantry";
        if (name.includes("Avocado") || name.includes("Tomato") || name.includes("Greens") || name.includes("Cuc") || name.includes("Lemon") || name.includes("Broccoli") || name.includes("Asparagus") || name.includes("Peas") || name.includes("Ginger")) {
            cat = "Produce";
        } else if (name.includes("Chicken") || name.includes("Bacon") || name.includes("Salmon")) {
            cat = "Meat & Seafood";
        } else if (name.includes("Eggs") || name.includes("Milk") || name.includes("Butter") || name.includes("Cream") || name.includes("Cheese")) {
            cat = "Dairy";
        } else if (name.includes("Rice") || name.includes("Sourdough") || name.includes("Flour") || name.includes("Bread")) {
            cat = "Grains";
        }
        
        return {
            name,
            category: cat,
            quantity: i % 2 === 0 ? "1 unit/pack" : "250 grams",
            essential: i % 3 !== 0
        };
    });

    // Budget Calculations
    const numericBudget = parseFloat(budget);
    let estCost = servings * 7.5; // ~$7.50 per serving per day average
    if (numericBudget < 15) estCost = servings * 4.8; // adjust downwards for tight budgets
    if (numericBudget > 60) estCost = servings * 12.5;

    estCost = parseFloat(estCost.toFixed(2));
    
    let diff = numericBudget - estCost;
    let percent = Math.min(100, Math.max(10, Math.round((estCost / numericBudget) * 100)));
    let textStatus = `Safe: Estimated cost ($${estCost}) is within your $${numericBudget} daily limit.`;
    let tips = [
        "Buying pantry staples like rice and sauces in bulk will reduce cost by up to 30%.",
        "Prep your greens and wrap them in a damp towel to keep them fresh for secondary meals."
    ];

    if (diff < 0) {
        percent = 100; // Over budget
        textStatus = `Alert: Cooking estimate ($${estCost}) exceeds your budget by $${Math.abs(diff).toFixed(2)}.`;
        tips.unshift("Swap Fresh Chicken for Canned Chickpeas or Beans to save approximately $4.50.");
        tips.unshift("Use generic brand ingredients or skip optional items to align with budget.");
    } else if (diff < 5) {
        textStatus = `Tight: Estimated cost ($${estCost}) is very close to your $${numericBudget} daily limit.`;
    }

    return {
        meals: {
            breakfast: {
                title: bTitle,
                time: isBusy ? 7 : 12,
                calories: 320,
                description: "Light, healthy, energy-boosting meal designed for your morning routine.",
                ingredients: bIng
            },
            lunch: {
                title: lTitle,
                time: isBusy ? 10 : 20,
                calories: 480,
                description: "Clean, fresh prep that won't make you sluggish during the afternoon.",
                ingredients: lIng
            },
            dinner: {
                title: dTitle,
                time: isBusy ? 15 : 30,
                calories: 580,
                description: "Warm, rich comforting finish to fuel muscle recovery and promote sound sleep.",
                ingredients: dIng
            }
        },
        timeline,
        groceries,
        substitutions: {
            "Eggs": [
                { alternative: "Applesauce", ratio: "1/4 cup", notes: "Best for moisture in baked items." },
                { alternative: "Silken Tofu", ratio: "1/4 cup", notes: "Best for scramble-style meals." }
            ],
            "Chicken Breast": [
                { alternative: "Firm Tofu", ratio: "1:1 weight", notes: "Ensure you press tofu to retain marinades." },
                { alternative: "Chickpeas", ratio: "1 cup canned", notes: "Pre-cooked, budget friendly." }
            ],
            "Whole Milk": [
                { alternative: "Oat Milk", ratio: "1:1", notes: "Naturally creamy, neutral taste." }
            ]
        },
        budget: {
            estimatedCost: estCost,
            feasibilityPercentage: 100 - percent, // high percentage = good feasibility
            statusMessage: textStatus,
            savingTips: tips
        }
    };
}

// ==========================================================================
// Rendering Engine
// ==========================================================================

// Render Meals Dashboard
function renderMealDashboard(data) {
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    mealTypes.forEach(meal => {
        const mealData = data.meals[meal];
        document.getElementById(`${meal}-title`).textContent = mealData.title;
        document.getElementById(`${meal}-time`).textContent = `${mealData.time} mins`;
        document.getElementById(`${meal}-calories`).textContent = `${mealData.calories} kcal`;
        document.getElementById(`${meal}-desc`).textContent = mealData.description;

        const previewList = document.getElementById(`${meal}-ingredients-preview`);
        previewList.innerHTML = '';
        mealData.ingredients.slice(0, 5).forEach(ing => {
            const li = document.createElement('li');
            li.textContent = ing;
            previewList.appendChild(li);
        });
    });
}

// Render Timeline To-Do items
function renderTimelineList(items) {
    const container = document.getElementById('timeline-list-container');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="no-data">No steps found for your schedule.</div>';
        return;
    }

    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `timeline-item t-${item.meal}`;
        itemEl.setAttribute('data-meal', item.meal);
        itemEl.setAttribute('data-id', item.id);
        
        if (state.checkedTodos.has(item.id)) {
            itemEl.classList.add('done');
        }

        const isChecked = state.checkedTodos.has(item.id);

        itemEl.innerHTML = `
            <div class="timeline-bullet"></div>
            <div class="timeline-content">
                <div class="timeline-check-wrapper">
                    <div class="timeline-checkbox ${isChecked ? 'checked' : ''}" onclick="toggleTodoState('${item.id}')">
                        <span class="material-icons-round">check</span>
                    </div>
                </div>
                <div class="timeline-info">
                    <div class="timeline-title-row">
                        <h4>${item.title}</h4>
                        <div class="timeline-time-badge">${item.timeLabel} (${item.durationMinutes}m)</div>
                    </div>
                    <p class="timeline-instructions">${item.instructions}</p>
                </div>
                <button class="timeline-btn-timer" title="Load in timer" onclick="loadStepInTimer('${item.title}', ${item.durationMinutes})">
                    <span class="material-icons-round">hourglass_top</span>
                </button>
            </div>
        `;

        container.appendChild(itemEl);
    });
}

// Render Grocery Checklist
function renderGroceryList(items) {
    const wrapper = document.getElementById('grocery-lists-wrapper');
    wrapper.innerHTML = '';

    if (!items || items.length === 0) {
        wrapper.innerHTML = '<div class="no-data">No ingredients generated.</div>';
        return;
    }

    // Group items by category
    const grouped = {};
    items.forEach(item => {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    });

    // Render grouped categories
    Object.keys(grouped).forEach(cat => {
        const catCard = document.createElement('div');
        catCard.className = 'grocery-section-card';
        
        const h4 = document.createElement('h4');
        h4.textContent = cat;
        catCard.appendChild(h4);

        const ul = document.createElement('ul');
        ul.className = 'grocery-list-ul';

        grouped[cat].forEach(item => {
            const li = document.createElement('li');
            const itemKey = `${cat.toLowerCase()}-${item.name.toLowerCase()}`;
            const isChecked = state.checkedGroceries.has(itemKey);
            
            li.className = `grocery-item-li ${isChecked ? 'checked' : ''}`;
            li.addEventListener('click', (e) => {
                // Avoid firing if double clicking
                if (e.detail === 1) {
                    toggleGroceryState(itemKey, li);
                }
            });
            li.addEventListener('dblclick', () => {
                loadIngredientSubstitution(item.name);
            });

            li.innerHTML = `
                <div class="grocery-check-box ${isChecked ? 'checked' : ''}">
                    <span class="material-icons-round">check</span>
                </div>
                <div class="grocery-item-text">
                    <span>${item.name}</span>${item.essential ? '<span class="essential-star" title="Essential ingredient">*</span>' : ''}
                    <span class="item-qty">${item.quantity}</span>
                </div>
            `;
            ul.appendChild(li);
        });

        catCard.appendChild(ul);
        wrapper.appendChild(catCard);
    });
}

// Render Budget Gauge & Feasibility Panel
function renderBudgetFeasibility(budgetData, targetBudget) {
    // Rotation mapping: gauge is a semi-circle. 0deg starts left, 180deg right.
    // feasibilityPercentage represents compatibility: higher is better.
    // If feasibility is 100% (costs are very low relative to budget), fill is green (which represents 100% of comfort).
    const fillEl = document.getElementById('budget-gauge-fill');
    const percentEl = document.getElementById('budget-gauge-percentage');
    const costEl = document.getElementById('budget-estimated-cost');
    const targetEl = document.getElementById('budget-target-display');
    const msgEl = document.getElementById('budget-status-message');
    const tipsContainer = document.getElementById('budget-tips-container');

    const score = budgetData.feasibilityPercentage; // 0 to 100
    const angle = (score / 100) * 180; // convert to degrees for semi-circle gauge

    fillEl.style.transform = `rotate(${angle}deg)`;
    percentEl.textContent = `${score}%`;
    costEl.textContent = `$${budgetData.estimatedCost.toFixed(2)}`;
    targetEl.textContent = `$${parseFloat(targetBudget).toFixed(2)}`;
    msgEl.textContent = budgetData.statusMessage;

    // Apply color class depending on safety score
    if (score < 40) {
        percentEl.style.color = "var(--danger)";
    } else if (score < 75) {
        percentEl.style.color = "var(--warning)";
    } else {
        percentEl.style.color = "var(--success-light)";
    }

    // Load tips
    tipsContainer.innerHTML = '';
    budgetData.savingTips.forEach((tip, idx) => {
        const div = document.createElement('div');
        div.className = `tip-card ${idx % 2 === 0 ? 'savings-tip' : 'cooking-tip'}`;
        div.innerHTML = `<p>${tip}</p>`;
        tipsContainer.appendChild(div);
    });
}

// Load default substitutions from generated plan or fall back
function initDefaultSubstitution(planSubs) {
    const resultsArea = document.getElementById('substitution-results');
    resultsArea.innerHTML = '';

    const firstSubName = Object.keys(planSubs || {})[0];
    if (firstSubName && planSubs[firstSubName].length > 0) {
        renderSubList(firstSubName, planSubs[firstSubName]);
    } else {
        resultsArea.innerHTML = `
            <div class="sub-help-message">
                <span class="material-icons-round">info</span>
                <p>Double click any item on the grocery list to see smart substitutes instantly.</p>
            </div>
        `;
    }
}

// ==========================================================================
// Interaction & Checklist Logic
// ==========================================================================

// Toggle To-Do State
window.toggleTodoState = function(id) {
    const itemEl = document.querySelector(`.timeline-item[data-id="${id}"]`);
    const checkbox = itemEl.querySelector('.timeline-checkbox');

    if (state.checkedTodos.has(id)) {
        state.checkedTodos.delete(id);
        itemEl.classList.remove('done');
        checkbox.classList.remove('checked');
    } else {
        state.checkedTodos.add(id);
        itemEl.classList.add('done');
        checkbox.classList.add('checked');
        
        // Brief completion vibration/animation trigger
        itemEl.style.transform = 'scale(0.98)';
        setTimeout(() => { itemEl.style.transform = 'none'; }, 150);
    }
};

// Toggle Grocery Checkboxes
function toggleGroceryState(key, liElement) {
    const checkbox = liElement.querySelector('.grocery-check-box');
    
    if (state.checkedGroceries.has(key)) {
        state.checkedGroceries.delete(key);
        liElement.classList.remove('checked');
        checkbox.classList.remove('checked');
    } else {
        state.checkedGroceries.add(key);
        liElement.classList.add('checked');
        checkbox.classList.add('checked');
    }
}

// Timeline Filter logic
function filterTimeline(filter) {
    const items = document.querySelectorAll('.timeline-item');
    items.forEach(item => {
        const mealType = item.getAttribute('data-meal');
        if (filter === 'all' || mealType === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Export Groceries to Clipboard
function exportGroceries() {
    if (!state.currentPlan || !state.currentPlan.groceries) return;
    
    let text = "🛒 MY CULINARYSYNC AI GROCERY LIST\n";
    text += "=====================================\n\n";

    // Group items by category
    const grouped = {};
    state.currentPlan.groceries.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });

    Object.keys(grouped).forEach(cat => {
        text += `[${cat.toUpperCase()}]\n`;
        grouped[cat].forEach(item => {
            const key = `${cat.toLowerCase()}-${item.name.toLowerCase()}`;
            const checkSymbol = state.checkedGroceries.has(key) ? "[x]" : "[ ]";
            const essential = item.essential ? " (Essential)" : "";
            text += `${checkSymbol} ${item.name} - ${item.quantity}${essential}\n`;
        });
        text += "\n";
    });

    navigator.clipboard.writeText(text).then(() => {
        alert("Grocery list copied to clipboard! You can paste it in your notes or WhatsApp.");
    }).catch(err => {
        console.error("Clipboard copy failed:", err);
    });
}

// ==========================================================================
// Substitutions Logic
// ==========================================================================

// Double click grocery item to load substitution details
function loadIngredientSubstitution(name) {
    switchTab('tab-groceries'); // ensure panel is visible
    
    // Check generated plan substitutions first
    const normName = name.toLowerCase();
    let matches = null;
    let foundName = name;

    if (state.currentPlan && state.currentPlan.substitutions) {
        // Look for matching keys
        for (const key of Object.keys(state.currentPlan.substitutions)) {
            if (key.toLowerCase() === normName || normName.includes(key.toLowerCase()) || key.toLowerCase().includes(normName)) {
                matches = state.currentPlan.substitutions[key];
                foundName = key;
                break;
            }
        }
    }

    // Fallback to local dict if no API key match
    if (!matches) {
        for (const key of Object.keys(LOCAL_SUBSTITUTIONS)) {
            if (normName.includes(key) || key.includes(normName)) {
                matches = LOCAL_SUBSTITUTIONS[key];
                foundName = key.charAt(0).toUpperCase() + key.slice(1);
                break;
            }
        }
    }

    if (matches) {
        renderSubList(foundName, matches);
    } else {
        // Render a basic message showing we can query AI if key is active, or generic suggestions
        const resultsArea = document.getElementById('substitution-results');
        resultsArea.innerHTML = `
            <div class="loaded-sub-container">
                <h4>${name}</h4>
                <div class="loaded-sub-tag">Not In Database</div>
                <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom: 12px;">We don't have direct swaps cached for this item.</p>
                <div class="loaded-sub-item">
                    <span class="sub-name">Generic Swaps</span>
                    <p class="sub-note">Try swapping with another ingredient from the same food group (e.g. root veggies for root veggies, seeds for nuts).</p>
                </div>
            </div>
        `;
    }
}

// Render the Substitution items
function renderSubList(name, subs) {
    const resultsArea = document.getElementById('substitution-results');
    resultsArea.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'loaded-sub-container';
    container.innerHTML = `
        <h4>${name}</h4>
        <div class="loaded-sub-tag">Swaps Available</div>
    `;

    subs.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'loaded-sub-item';
        item.innerHTML = `
            <div>
                <span class="sub-name">${sub.alternative}</span>
                <span class="sub-ratio">(${sub.ratio})</span>
            </div>
            <p class="sub-note">${sub.notes}</p>
        `;
        container.appendChild(item);
    });

    resultsArea.appendChild(container);
}

// Trigger custom text search for substitutes
async function triggerSubSearch() {
    const searchInput = document.getElementById('input-sub-search');
    const query = searchInput.value.trim();
    if (!query) return;

    const resultsArea = document.getElementById('substitution-results');
    resultsArea.innerHTML = '<div class="sub-help-message"><span class="material-icons-round animate-spin">sync</span><p>Searching for alternatives...</p></div>';

    // If key is set, we can query AI to get a beautiful custom substitution
    if (state.apiKey) {
        try {
            const prompt = `Provide 2 or 3 common, cooking substitution alternatives for "${query}".
Return a JSON array of objects representing these alternatives. Each object must have:
- alternative: "name of ingredient"
- ratio: "conversion ratio (e.g. 1:1, or 1 tsp for 1 tbsp)"
- notes: "a brief note on culinary application"
JSON response format only, no wrappers.
[{"alternative":"...","ratio":"...","notes":"..."}]`;
            
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (response.ok) {
                const jsonRes = await response.json();
                const responseText = jsonRes.candidates[0].content.parts[0].text;
                // Parse and render
                const cleanJson = responseText.replace(/```json|```/g, "").trim();
                const subs = JSON.parse(cleanJson);
                renderSubList(query, subs);
                return;
            }
        } catch (e) {
            console.error("AI Substitution search failed", e);
        }
    }

    // Static Local Fallback Search
    const normQuery = query.toLowerCase();
    let found = null;
    for (const key of Object.keys(LOCAL_SUBSTITUTIONS)) {
        if (normQuery.includes(key) || key.includes(normQuery)) {
            found = LOCAL_SUBSTITUTIONS[key];
            renderSubList(key.charAt(0).toUpperCase() + key.slice(1), found);
            break;
        }
    }

    if (!found) {
        resultsArea.innerHTML = `
            <div class="loaded-sub-container">
                <h4>${query}</h4>
                <div class="loaded-sub-tag" style="background:var(--border-color); color:var(--text-secondary);">No Matches</div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">No local match found. Please set your Gemini API key in config to unlock full AI-powered substitution lookups.</p>
            </div>
        `;
    }
}

// ==========================================================================
// Timer Engine
// ==========================================================================

// Load a specific step into the countdown widget
window.loadStepInTimer = function(title, minutes) {
    // If timer is running, stop it first
    if (state.activeTimer.intervalId) {
        clearInterval(state.activeTimer.intervalId);
        state.activeTimer.intervalId = null;
    }

    state.activeTimer.taskName = title;
    state.activeTimer.durationSeconds = minutes * 60;
    state.activeTimer.remainingSeconds = minutes * 60;
    state.activeTimer.isPaused = true;

    // Switch tab to show the active timer
    switchTab('tab-todos');

    // Enable buttons
    document.getElementById('btn-timer-play-pause').disabled = false;
    document.getElementById('btn-timer-reset').disabled = false;
    document.getElementById('timer-task-label').textContent = title;

    updateTimerDisplay();
}

// Toggle Play/Pause on the timer
function toggleTimer() {
    const playIcon = document.getElementById('btn-timer-icon');
    
    if (state.activeTimer.isPaused) {
        // Start running
        state.activeTimer.isPaused = false;
        playIcon.textContent = 'pause';
        
        state.activeTimer.intervalId = setInterval(() => {
            state.activeTimer.remainingSeconds--;
            
            if (state.activeTimer.remainingSeconds <= 0) {
                // Completed
                clearInterval(state.activeTimer.intervalId);
                state.activeTimer.intervalId = null;
                state.activeTimer.isPaused = true;
                playIcon.textContent = 'play_arrow';
                triggerAlarm();
            }
            
            updateTimerDisplay();
        }, 1000);
    } else {
        // Pause timer
        state.activeTimer.isPaused = true;
        playIcon.textContent = 'play_arrow';
        clearInterval(state.activeTimer.intervalId);
        state.activeTimer.intervalId = null;
    }
}

// Reset the active timer to original load state
function resetTimer() {
    if (state.activeTimer.intervalId) {
        clearInterval(state.activeTimer.intervalId);
        state.activeTimer.intervalId = null;
    }

    state.activeTimer.isPaused = true;
    state.activeTimer.remainingSeconds = state.activeTimer.durationSeconds;
    document.getElementById('btn-timer-icon').textContent = 'play_arrow';
    
    updateTimerDisplay();
}

// Re-draw timer SVG ring and text countdown
function updateTimerDisplay() {
    const timeDisplay = document.getElementById('timer-time-display');
    const ringCircle = document.getElementById('timer-ring-circle');

    const m = Math.floor(state.activeTimer.remainingSeconds / 60);
    const s = state.activeTimer.remainingSeconds % 60;
    
    timeDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // SVG dash offset calculation
    // dasharray = 440 (2 * pi * radius of 70 = ~439.8)
    const ratio = state.activeTimer.remainingSeconds / state.activeTimer.durationSeconds;
    const dashOffset = 440 - (ratio * 440);
    ringCircle.style.strokeDashoffset = isNaN(dashOffset) ? 0 : dashOffset;
}

// Trigger audio alarm and flash screen on completion
function triggerAlarm() {
    const alarmAudio = document.getElementById('audio-timer-alarm');
    if (alarmAudio && !state.activeTimer.isMuted) {
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(e => console.log("Audio play blocked by browser policy"));
    }
    
    // Add visual alarm flashing effect
    const widget = document.querySelector('.timer-widget');
    widget.style.boxShadow = '0 0 30px var(--danger)';
    widget.style.borderColor = 'var(--danger)';
    
    setTimeout(() => {
        widget.style.boxShadow = 'var(--card-shadow)';
        widget.style.borderColor = 'var(--border-color)';
    }, 3000);
}
