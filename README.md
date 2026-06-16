# 🌱 EcoTracker — Hyper-Minimal Carbon Dashboard

**EcoTracker** is a mobile-first, single-page progressive web application designed to help individuals effortlessly understand, track, and mitigate their daily environmental footprint. By combining real-time data entry with game design principles, the application converts complex carbon metrics into actionable insights and rewarding lifestyle shifts.

---

## 🎯 Project Description & Value Proposition

Most carbon calculators are tedious — relying on annual estimates and static forms that fail to change daily habits. **EcoTracker** solves this by breaking down sustainability into a dynamic, daily habit loop.

The application focuses on the three highest-impact pillars of individual emissions:
- 🏠 **Home Utilities**
- 🚗 **Daily Commuting**
- 🥗 **Dietary Choices**

Users receive real-time visual feedback on how their routine affects the planet and earn gamified points for choosing sustainable alternatives.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| ⚡ **Real-Time Calculation Engine** | Instantly computes carbon impact in kg CO₂e as sliders are moved — no page reloads |
| 🎮 **Gamified Rewards & Challenges** | "Green Commute Swap" challenge awards Eco-Points for sustainable transit choices |
| 📈 **7-Day Analytics View** | Minimalist bar chart with trailing emission history, tier rankings, and weekly stats |
| 💾 **Zero-Server Persistence** | `localStorage` saves and hydrates all user preferences and reward balances client-side |
| 🎨 **Premium Minimalist UI** | High-contrast modern aesthetic, animated SVG progress rings, tactile sliders |
| 🎉 **Celebration Animations** | Confetti burst + modal reward on challenge completion |

---

## 📊 Parameters & Mathematical Framework

### Input Metrics

| Parameter | Range | Description |
|---|---|---|
| `monthly_electricity` | 0–1000 kWh | Household power consumption (split by household size) |
| `distance_traveled` | 0–100 km | Daily commute distance |
| `transit_mode` | Car / EV / Bus-Train / Bike | Transport efficiency profile |
| `meat_servings_weight` | 0.0–1.0 kg | Daily ruminant meat consumption |
| `plant_servings_weight` | 0.0–2.0 kg | Daily vegetables & grains consumption |

### Emission Factor Constants

```
EF_grid          = 0.475  kg CO₂e / kWh
EF_gasoline      = 0.192  kg CO₂e / km
EF_ev            = 0.053  kg CO₂e / km
EF_public_transit= 0.028  kg CO₂e / km
EF_bike_walk     = 0.000  kg CO₂e / km
EF_meat          = 27.000 kg CO₂e / kg
EF_plant         =  1.500 kg CO₂e / kg
```

### Calculation Formulas

```
E_energy  = (monthly_electricity / 30) × EF_grid / household_size
E_transit = distance_traveled × EF_selected_mode
E_food    = (meat_kg × EF_meat) + (plant_kg × EF_plant)
total     = E_energy + E_transit + E_food
```

### Gamification — Green Commute Swap

```
carbon_saved    = (distance × EF_gasoline) − (distance × EF_transit)
eco_points      = floor(carbon_saved × 10)
```

---

## 🏆 Eco-Point Tier System

| Tier | Points Required | Badge |
|---|---|---|
| Eco Starter   | 0+    | 🌱 |
| Green Warrior | 500+  | 🌿 |
| Climate Hero  | 1500+ | 🌍 |
| Earth Legend  | 3000+ | ⭐ |
| Eco God       | 6000+ | 🏆 |

---

## ⚙️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Structure** | Semantic HTML5, mobile-first responsive layout |
| **Styling** | Vanilla CSS3 — custom design system, CSS variables, animations |
| **Logic** | Vanilla JavaScript ES6+ — state machine, real-time reactivity |
| **Persistence** | Browser `localStorage` — no backend, no server |
| **Fonts** | Inter (Google Fonts) |

---

## 🚀 Getting Started

No build tools, no dependencies, no server required.

```bash
# Clone the repo
git clone https://github.com/DevashGupta/EcoTracker.git

# Open directly in your browser
open index.html
```

Or simply download and double-click `index.html`.

---

## 📁 File Structure

```
EcoTracker/
├── index.html      # App structure & all view panels
├── styles.css      # Complete design system & animations
├── app.js          # Calculation engine, state, rendering & persistence
└── README.md
```

---

## 📸 Views

- **Onboarding** — 3-step profile setup wizard
- **Today's Dashboard** — Live footprint ring, subtotal cards, sliders, challenge card
- **Analytics** — 7-day bar chart, tier status, weekly breakdown table

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<p align="center">Built with 💚 for a greener planet</p>
