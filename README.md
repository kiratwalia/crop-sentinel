# Crop Sentinel

Build a polished, responsive web app called "CropCare AI" for the SIH problem statement: "Early detection and management of crop diseases and pest infestations."

Create a professional Indian AgriTech/farmer-friendly UI, not a generic SaaS template.

Core pages:

- Landing

- Dashboard

- Analyze Crop

- Analysis Result

- History

- Risk Monitor

- Recommendations

Main flow:

Farmer selects crop (Tomato, Potato, Maize, Wheat, Rice) → uploads leaf/crop image → AI analysis → disease/pest prediction → confidence → severity → weather-based risk → management recommendations.

Dashboard should show:

- Crop health

- Disease/pest alerts

- Weather

- Overall risk score

- Recent analyses

- Crop health trend chart

- Recommended actions

Analyze page:

- Crop selection

- Disease/Pest/Automatic analysis

- Drag-and-drop image upload

- Image preview

- Analyze button

- Loading state

Result page:

- Uploaded image

- Predicted disease/pest

- Confidence

- Severity

- Risk level

- Symptoms

- Immediate actions

- Prevention

- Environmental risk factors

- AI explainability/attention-map placeholder

Risk Monitor:

- Temperature

- Humidity

- Rainfall

- Wind

- Disease risk

- Pest risk

- Environmental risk

- 7-day risk chart

Use realistic DEMO/MOCK data for now. Clearly label demo predictions and never claim fake accuracy.

Design:

- Sophisticated green agriculture-inspired theme

- Clean white/neutral cards

- Modern typography

- shadcn-style components

- Lucide icons

- Recharts

- Subtle animations

- Excellent desktop + mobile responsiveness

- Responsive sidebar/navigation

- Farmer-friendly language

Make all navigation and demo interactions functional. Keep components and mock data modular so a FastAPI + Python/PyTorch backend, Supabase database, and weather API can be integrated later.

Do not add unnecessary features like payments, blockchain, IoT, drones, or authentication.

Make the final UI polished enough for a Smart India Hackathon presentation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8233248d-7b7a-4d45-b0f5-ce56c1df4ae5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
