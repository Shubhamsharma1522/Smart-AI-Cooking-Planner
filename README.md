# 🍳 CulinarySync AI | Smart AI Cooking Planner

An AI-powered personal cooking planner and interactive kitchen companion built for the **Google Prompt Wars** challenge. 

**CulinarySync AI** helps users generate a personal cooking schedule, meal plan, and structured to-do checklist based on their daily schedule, dietary needs, available kitchen appliances, and budget constraints.

---

## 💡 The Challenge
Modern lives are busy. Planning healthy, budget-friendly meals that fit into specific daily schedules is a friction point for many. 

**CulinarySync AI** solves this by taking a natural language description of the user's day (e.g., *"Working late until 7 PM, workout at 8 PM, need a quick high-protein lunch"*) and converting it into a structured, executable daily kitchen plan.

---

## ✨ Key Features

* **🗓️ Context-Aware Daily Planner:** Takes natural language inputs describing your schedule to plan preparation times that fit your availability.
* **🍽️ Structured Meal Dashboards:** Delivers a custom-tailored **Breakfast/Lunch/Dinner** menu with prep times, calorie counts, and key ingredients.
* **⏱️ Interactive Cooking Timeline:** Converts recipes into sequential, checkable tasks.
* **⏳ Built-in Step Countdown Timers:** Click any task to load it into the SVG circular progress countdown timer widget, complete with sound alarms and flash alerts.
* **🛒 Categorized Grocery Checklists:** Groups shopping lists into Produce, Pantry, Grains, Dairy, and Protein, and allows copy-exporting with a click.
* **🔄 Smart Substitutions:** Double-click any ingredient to discover alternative swaps (Vegan, Gluten-free, or budget options) powered by Gemini.
* **📊 Budget Feasibility Gauge:** Evaluates grocery costs against your target budget and displays a dynamic semi-circle feasibility gauge with AI-driven savings advice.
* **🎨 Premium Glassmorphic UI:** Styled with a responsive, modern dark mode using HSL tailored color schemes, smooth animations, and zero framework overhead.

---

## 🛠️ Tech Stack & Technologies

* **Core Structure:** HTML5 (Semantic and SEO optimized)
* **Styling & Theme:** Vanilla CSS3 (Custom design system, Glassmorphism, animations, dark/light theme switching)
* **Application Logic:** Vanilla JavaScript (ES6+, State Management, Client-Side API interactions)
* **AI Model:** Google Gemini 1.5 Flash (utilizing client-side API requests with `responseMimeType: "application/json"`)
* **Assets & Typography:** Google Fonts (Outfit, Plus Jakarta Sans), Google Material Icons

---

## 🚀 How to Run Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher) installed.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/Shubhamsharma1522/Smart-AI-Cooking-Planner.git
   cd Smart-AI-Cooking-Planner
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:8080
   ```
4. *Optional:* Open the **API Config** modal in the top right to save your Gemini API Key (stored safely in `localStorage`). If no key is provided, the app will run in **Interactive Demo Mode** with pre-baked high-fidelity plans.
