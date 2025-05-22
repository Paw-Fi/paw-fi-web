# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Paw-Fi Web Application Documentation

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 1. Project Overview

Paw-Fi is an educational web application focused on teaching personal finance and investment concepts. The application features:

- Interactive learning modules with various question types
- Progressive lesson unlocking system
- Chat system for personalized recommendations
- Gamification elements including XP rewards and completion tracking
- AI-assisted personalized learning path generation
- Interactive drag-and-drop categorization exercises
- Dynamic visualization with Mermaid diagrams
- User authentication system with email verification

The application is built with TypeScript, React, Tailwind CSS, and TanStack Router. It leverages modern UI patterns, GSAP animations, and a component-based architecture for an engaging user experience.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 2. Project Structure

The project follows a modular structure organized into the following key directories:

```
/src
  /assets       # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Static assets like images
  /components   # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Reusable UI components
  /contexts     # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 React contexts for state management
  /data         # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Mock data and data access functions
  /integrations # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Third-party service integrations
  /lib          # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Core library functions
  /routes       # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Application routes
  /services     # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Service layer
  /styles       # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Global styles
  /types        # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 TypeScript type definitions
  /utils        # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Utility functions
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3. Core Features

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.1. Learning System

The learning system is the primary feature of the application, providing an interactive educational experience through structured lessons and quizzes.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.1.1. Key Components

- `LearningPage` (`/routes/sabina-learning.tsx`): Main page displaying available lessons
- `Lesson` (`/routes/learning/$lessonId.tsx`): Individual lesson with interactive questions
- Question Components (`/components/learning/question-types/*`): Various question type implementations
- `useLesson` Hook (`/components/learning/hooks/use-lesson.ts`): Manages lesson state and interactions
- `lesson-utils.ts`: Core validation functions for all question types
- `unlock-next-lesson.ts`: Function to unlock sequential lessons
- `MermaidRenderer.tsx`: Component for rendering diagram syntax as SVG

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.1.2. Data Model

Lessons follow a structured data model defined in `/types/learning.types.ts`:

- `Lesson`: Contains metadata (title, description, XP) and an array of questions
- `Question`: Base type for all question types with shared properties
- Specialized question types (ChoiceQuestion, SortQuestion, etc.) with type guards

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.1.3. Progression System

The application implements a progression system that:

- Tracks completed lessons
- Awards XP for correct answers
- Unlocks subsequent lessons upon completion
- Persists progress in localStorage

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.2. Authentication System

The authentication system handles user registration, login, and session management throughout the application.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.2.1. Key Components

- `AuthProvider` (`/contexts/auth-context.tsx`): Context provider for authentication state
- `SignInForm` (`/components/auth/sign-in-form.tsx`): Login form with validation
- `SignUpForm` (`/components/auth/sign-up-form.tsx`): Registration form with email verification
- `PageLayout` (`/components/layout/page-layout.tsx`): Layout component that handles header visibility based on authentication

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.2.2. Implementation Notes

The authentication system includes:

- Email verification flow for new user registrations with proper verification detection
- Improved sign-up form with cleaner UI and better user feedback
- Conditional UI elements based on authentication state
- Protected routes for authenticated users only
- Consistent layout with header visibility control
- Sign-out functionality accessible from the header
- Streamlined navigation flow after authentication

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3. Chat System

The Chat system collects user preferences and information to personalize the learning experience.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3.1. Key Components

- `ChatProvider` (`/contexts/chat-context.tsx`): Context provider for Chat state
- `ChatRoute` (`/routes/chat.tsx`): Main Chat UI
- `ChatInterface` (`/components/chat/chat-interface.tsx`): AI-assisted chat for personalized recommendations

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3.2. Authentication Integration

The Chat interface has been updated to integrate with the authentication system:

- Shows different welcome messages based on authentication state
- Disables the input field when the user is not logged in
- Displays sign-in and sign-up buttons for unauthenticated users
- Provides a seamless path to authentication from the chat interface

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3.3. Implementation Notes

The Chat system has been refactored to reuse components from the learning system, eliminating code duplication. This includes:

- Shared question type components
- Common validation logic
- Unified data models
- Integrated AI assistance for generating personalized learning paths
- Real-time progress indicators for course generation
- Automatic JSON continuation for handling large AI responses

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3. Drag-and-Drop Categorization

The application includes a drag-and-drop system for categorization questions using the dnd-kit library.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3.1. Key Components

- `DragOverlay`, `Draggable`, `Droppable` (`/components/learning/dnd/*`)
- `SortCategoriesQuestion` (`/components/learning/question-types/sort-categories-question.tsx`)

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.3.2. Features

- Item dragging between categories
- Visual feedback during dragging
- Empty state indicators for categories
- Mobile and desktop support

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 4. UI Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 4.1. Question Types

The application supports multiple question types:

1. **Choice Questions** (`choice-question.tsx`)
   - Single choice (scq)
   - Multiple choice (mcq)
   - Styled options with descriptions

2. **Image Choice Questions** (`image-choice-question.tsx`)
   - Choice questions with image support
   - Support for Mermaid diagrams

3. **Sort Questions** (`sort-question.tsx`)
   - Reorderable items using drag-and-drop

4. **Category Sort Questions** (`sort-categories-question.tsx`)
   - Drag items into appropriate category containers

5. **Match Questions** (`match-question.tsx`)
   - Matching pairs of related items

6. **Matrix Rating Questions** (`matrix-rating-question.tsx`)
   - Ratings across multiple dimensions
   - Color-coded options

7. **Text Input Questions** (`text-input-question.tsx`)
   - Text field with validation
   - Support for prefixes/suffixes

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 4.2. Helper Components

- `MermaidRenderer`: Renders Mermaid diagram syntax as SVG
- `ActionButtons`: Navigation buttons for lessons
- `AnswerFeedback`: Visual feedback for correct/incorrect answers
- `CompletionDisplay`: End-of-lesson completion modal with animations
- `LessonProgressBar`: Visual indicator of lesson progress

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 5. State Management & Routing

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 5.1. Local Storage

The application uses localStorage for persistence:

- `paw-fi-course`: Stores course and lesson data including completion status
- `Chat`: Stores Chat responses

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 5.2. React Hooks and Context

- `useLesson`: Custom hook for lesson state management
- `ChatContext`: Context provider for Chat state
- `useChat`: Hook for accessing Chat context

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 5.3. Routing Implementation

The application uses TanStack Router (formerly React Router) for routing:

- File-based routing with `createFileRoute`
- Route parameters for lesson IDs
- Programmatic navigation with `useNavigate`
- Route protection for locked lessons

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 6. Animation and Interactions

The application uses GSAP for animations:

- Card animations on the learning page
- Confetti effects on lesson completion
- Transition animations between questions

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 7. Recent Improvements

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 7.1. Mermaid Diagram Rendering

- Implemented proper rendering of Mermaid diagrams using the Mermaid API
- Added loading states and error handling for diagrams

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 7.2. Question Validation

- Fixed parameter mismatch in image-choice-question component
- Corrected validation logic in areAllAnswersCorrect function

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 7.3. Chat Refactoring

- Eliminated code duplication by reusing learning components
- Implemented TypeScript interfaces and type guards for safe mapping
- Created adapter functions to transform data formats

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 7.4. Drag-and-Drop Improvements

- Refactored from SortableContext to direct Draggable/Droppable approach
- Fixed performance issues with useRef
- Improved styling and visual feedback

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 8. Development Guidelines

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 8.1. Adding New Question Types

To add a new question type:

1. Define the question type in `learning.types.ts`
2. Create a new component in `/components/learning/question-types/`
3. Implement a type guard function
4. Update the question content renderer to support the new type

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 8.2. Creating Lessons

Lessons can be created by:

1. Adding new lesson data to the mock data files
2. Using the author import functionality to import JSON-formatted lessons

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 9. Technical Implementation Details

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 9.1. Question Validation Logic

The question validation system (`lesson-utils.ts`) implements sophisticated logic for each question type:

- **Choice Questions**: Validates selected options against correct options
- **Sort Questions**: Compares ordered arrays with expected sequence
- **Category Sort Questions**: Maps items to categories and compares with correct categorization
- **Match Questions**: Validates bidirectional matches between pairs
- **Matrix Rating Questions**: Compares user ratings with expected ratings
- **Text Input Questions**: Performs pattern matching, case sensitivity checks, and validates against possible answers

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 9.2. Animation Implementation

The application uses GSAP for animations:
- Spring-based transitions for UI elements
- Confetti effect on lesson completion
- Sequential animation of modal content
- Cat mascot animations throughout the learning experience

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 9.3. Data Persistence Strategy

The application stores data in localStorage with a unified approach:
- `paw-fi-course`: Single storage key for all course data
- Course structure with nested lessons
- Automatic unlocking of lessons based on completion
- XP reward tracking

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.4. JSON Continuation Feature

The application implements an automatic JSON continuation mechanism to handle large JSON responses from the Gemini API that may be truncated due to token limitations.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.4.1. Key Components

- `ChatInterface` (`/components/chat/chat-interface.tsx`): Manages the chat UI and JSON continuation
- `continueJsonResponse` function: Handles the automatic continuation process
- `checkJsonString` function: Detects incomplete JSON and validates structure

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.4.2. Implementation Details

- **Automatic Detection**: The system automatically detects when a JSON response from the AI is incomplete
- **Background Continuation**: When incomplete JSON is detected, the system automatically sends a "continue" message to the API
- **Seamless Merging**: The system properly merges multiple JSON fragments into a single coherent JSON object
- **Clean UI**: Only the final, complete JSON is displayed to the user, with intermediate steps removed
- **Format Support**: Handles both single lesson format and complete course format with multiple lessons
- **Loading Indicators**: Shows loading animation while retrieving the rest of the data

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 3.4.3. Technical Implementation

- Uses a timeout-based approach to automatically trigger continuation requests
- Implements smart JSON merging logic to handle formatting issues between fragments
- Filters message history to remove intermediate messages and show only the complete result
- Enhanced JSON validation to detect both single lesson and course data structures
- Recursive continuation for handling particularly large JSON responses

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 10. Documentation Maintenance Guidelines

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 10.1. How to Update This Documentation

This documentation should be updated whenever changes are made to the codebase. Follow these guidelines to maintain documentation quality:

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 For New Components or Files

1. Add a new subsection in the appropriate section describing the component/file
2. Include:
   - File path and purpose
   - Key interfaces/types used
   - Main functionality and usage examples
   - Relationships with other components
   - Any important implementation details

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 For Modified Components

1. Update the relevant documentation section
2. Add a note in the "Recent Improvements" section with:
   - Date of change
   - Summary of modifications
   - Reason for changes
   - Impact on related components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 For Refactoring/Restructuring

1. Update the project structure section if folder organization changes
2. Update component relationships in the relevant sections
3. Document any migration steps or breaking changes

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Documentation Structure

This documentation follows the codebase structure:
- Each major directory (`components`, `routes`, etc.) has a corresponding section
- Components are grouped by their functional relationship
- Types and interfaces are documented with their usage patterns

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 10.2. Changelog Template

When updating the documentation, add a changelog entry in this format:

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 11. Future Enhancements

Potential areas for future development:

- User authentication system
- Server-side storage of progress
- Additional gamification elements (badges, leaderboards)
- Enhanced analytics for learning progress
- More interactive question types
- Social sharing of achievements
- Expanded course catalog with advanced financial topics

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 12. Layout System

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 12.1. Page Layout Component

The application uses a centralized layout system to maintain consistent styling and header visibility across pages.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 12.1.1. Key Components

- `PageLayout` (`/components/layout/page-layout.tsx`): Wrapper component for all pages except the home page

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 12.1.2. Implementation Details

- Uses TanStack Router's location state to detect the current path
- Conditionally renders the header based on the current route
- Applies consistent flex-1 and bg-background styling to all pages
- Eliminates duplicate styling code across individual page components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 12.1.3. Usage

The PageLayout is applied at the root route level in `__root.tsx`, ensuring all child routes inherit the layout:

```tsx
// In __root.tsx
import { Outlet } from '@tanstack/react-router';
import PageLayout from '../components/layout/page-layout';

export const Route = createRootRoute({
  component: () => (
    <PageLayout>
      <Outlet />
    </PageLayout>
  ),
});
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13. Detailed Code Documentation

This section provides a detailed file-by-file breakdown of the Paw-Fi codebase. Use this as a reference for understanding specific implementation details.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13.1. Types

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/types/learning.types.ts`

This file defines all TypeScript interfaces and types for the learning system.

**Key Types & Usage:**

- `ContentBlockType`: Used for structured content blocks ('paragraph', 'bulletList', etc.)
- `QuestionType`: Defines all possible question types ('mcq', 'scq', 'sort-order', etc.)
- `BaseQuestion`: Foundation type for all question types with common properties
- `Question`: A flexible type to accommodate various question formats from JSON
- Type aliases (`ChoiceQuestion`, `SortQuestion`, etc.) for different question types
- Type guards (`isChoiceQuestion`, `isSortQuestion`, etc.) to safely check question types

**Relationships:**
- Used throughout the learning components
- Essential for type safety when handling different question formats
- Enables TypeScript to validate correct usage of question properties

**Example Usage:**
```typescript
// Type guard usage
if (isChoiceQuestion(question)) {
  // Handle choice question specifically
}

// Question type with specific properties
const question: ChoiceQuestion = {
  id: 'q1',
  type: 'mcq',
  question: 'Select all that apply',
  options: [...],
};
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13.2. Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Learning Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/learning/MermaidRenderer.tsx`

**Purpose:** Renders Mermaid diagram syntax as SVG visualizations.

**Implementation Details:**
- Uses the Mermaid API to process diagram syntax
- Implements loading states and error handling
- Converts text-based diagram descriptions into visual SVGs

**Usage:**
```tsx
<MermaidRenderer content="graph TD; A-->B;" />
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/learning/hooks/use-lesson.ts`

**Purpose:** Custom hook for lesson state management.

**Key Functionality:**
- Manages current question index
- Tracks user answers for each question
- Validates answers using lesson-utils
- Handles progression between questions
- Manages lesson completion state
- Unlocks next lessons upon completion
- Calculates earned XP based on performance

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/learning/lesson-utils.ts`

**Purpose:** Core validation functions for question answers.

**Key Functions:**
- `areAllAnswersCorrect`: Checks if all answers in a lesson are correct
- `isAnswerCorrect`: Validates a specific answer for any question type
- `isCurrentQuestionAnswered`: Checks if the current question has been answered

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 UI Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/ui/button.tsx`

**Purpose:** Reusable button component with various styles.

**Variants:**
- `primary`: Main call-to-action style
- `secondary`: Alternative action style
- `outline`: Bordered style
- `ghost`: Minimal style

**Sizes:**
- `sm`, `md`, `lg`

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/ui/modal.tsx`

**Purpose:** Reusable modal dialog component.

**Features:**
- Backdrop with click-to-close
- Focus management
- Animation using GSAP
- Accessibility features

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13.3. Authentication Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/auth/sign-up-form.tsx`

**Purpose:** Registration form with email verification.

**Key Features:**
- Form validation for email, password, and name fields
- Integration with Supabase Auth API
- Email verification flow with confirmation message
- Error handling and feedback
- Responsive design with clean UI

**Implementation Details:**
- Uses the AuthContext for registration functionality
- Shows a verification message after successful registration
- Properly detects verification status using the `confirmation_sent_at` property
- Conditional rendering of UI elements based on verification state
- Includes "Already have an account?" link directly in the component
- Streamlined navigation flow to direct users to the chat page after authentication
- Simplified verification UI with clear instructions and visual indicators

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/auth/sign-in-form.tsx`

**Purpose:** Login form with validation.

**Key Features:**
- Form validation for email and password
- Integration with Supabase Auth API
- Error handling and feedback
- Navigation to dashboard on successful login

**Implementation Details:**
- Uses the AuthContext for login functionality
- Provides a link to the registration page for new users
- Handles various authentication error states

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/contexts/auth-context.tsx`

**Purpose:** Context provider for authentication state.

**Key Functions:**
- `signUp`: Handles user registration with email verification
- `signIn`: Authenticates users with email and password
- `signOut`: Logs out the current user
- `getUser`: Retrieves the current authenticated user

**Implementation Details:**
- Uses Supabase Auth API for authentication operations
- Maintains user state across the application
- Provides authentication methods to components via context

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13.4. Layout Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/layout/page-layout.tsx`

**Purpose:** Centralized layout component for consistent page structure.

**Key Features:**
- Conditional header rendering based on route
- Consistent styling for all pages
- Simplified page component structure

**Implementation Details:**
- Uses TanStack Router's location state to detect the current path
- Renders the header on all pages except the home page
- Applies consistent flex-1 and bg-background styling to all pages

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 13.5. Chat Components

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 `/src/components/chat/chat-interface.tsx`

**Purpose:** Interactive chat interface that uses the Gemini API with automatic JSON continuation.

**Key Features:**
- Real-time conversation with the Gemini AI
- Authentication integration for access control
- Conditional UI based on authentication state
- Detects when to generate personalized lessons
- Stores generated lesson data in localStorage
- Automatically handles incomplete JSON responses from the AI

**Authentication Integration:**
- Shows different welcome messages based on authentication state
- Disables the input field when the user is not logged in
- Displays sign-in and sign-up buttons for unauthenticated users
- Provides a seamless path to authentication from the chat interface

**JSON Continuation System:**
- `checkJsonString(str: string)`: Detects if a string is valid JSON and whether it's complete
- `continueJsonResponse()`: Handles the automatic continuation of incomplete JSON
- `getAIResponse(userMessage: string, addToChat: boolean)`: Enhanced to support JSON continuation

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14. Backend Services

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.1. Supabase

We use Supabase for authentication and data storage. The Supabase client is initialized in `lib/supabase.ts`.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2. Chat History Backend

We've implemented a dedicated backend service for storing and retrieving chat history. The backend is built with Express, TypeScript, and MongoDB, providing a RESTful API for managing conversations.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2.1. Key Features

- Store and retrieve chat conversations with the Gemini AI
- Organize conversations by user
- Add messages to existing conversations
- Update conversation details
- Delete conversations

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2.2. API Endpoints

| Method | Endpoint                      | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | /api/conversations/user/:userId | Get all conversations for a user  |
| GET    | /api/conversations/:id        | Get a specific conversation       |
| POST   | /api/conversations            | Create a new conversation         |
| PUT    | /api/conversations/:id        | Update an existing conversation   |
| POST   | /api/conversations/:id/messages | Add a message to a conversation   |
| DELETE | /api/conversations/:id        | Delete a conversation             |

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2.3. Integration with Frontend

The frontend interacts with this API using the `conversation-service.ts` service, which provides functions for all the API endpoints. The chat interface has been updated to use this service for storing and retrieving chat history.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2.4. Project Structure

```
paw-fi-be/
├── src/
│   ├── config/
│   │   └── db.ts                 # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Database connection
│   ├── controllers/
│   │   └── conversationController.ts  # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 API controllers
│   ├── models/
│   │   └── Conversation.ts       # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 MongoDB models
│   ├── routes/
│   │   └── conversationRoutes.ts # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 API routes
│   └── server.ts                 # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Main server file
├── .env.example                  # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Environment variables template
├── package.json                  # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 Dependencies and scripts
└── tsconfig.json                 # Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 TypeScript configuration
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15. Database Schema

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1. Supabase Tables

The application uses Supabase as its backend-as-a-service (BaaS) solution. The following tables are defined in the Supabase database:

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.1. `users`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users.id |
| email | text | User's email address |
| full_name | text | User's full name |
| created_at | timestamp | When the user record was created |
| updated_at | timestamp | When the user record was last updated |
| avatar_url | text | URL to the user's avatar image |
| email_verified | boolean | Whether the user's email has been verified |

**RLS Policies:**
- Users can read their own records
- Users can update their own records
- Service role can insert new records (triggered by auth sign-up)

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.2. `user_progress`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| lesson_id | text | ID of the completed lesson |
| completed_at | timestamp | When the lesson was completed |
| score | integer | Score achieved in the lesson |
| xp_earned | integer | XP points earned from the lesson |

**RLS Policies:**
- Users can read their own progress records
- Users can insert their own progress records
- Users cannot modify existing progress records

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.3. `user_preferences`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| theme | text | UI theme preference |
| notification_settings | jsonb | Notification preferences |
| learning_goals | jsonb | User's learning goals and interests |

**RLS Policies:**
- Users can read their own preference records
- Users can update their own preference records

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.4. `lessons`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Lesson title |
| description | text | Lesson description |
| content | jsonb | Lesson content including questions |
| created_at | timestamp | When the lesson was created |
| updated_at | timestamp | When the lesson was last updated |
| category_id | uuid | References categories.id |
| difficulty | text | Lesson difficulty level |
| xp_reward | integer | XP points awarded for completion |
| estimated_time | integer | Estimated completion time in minutes |

**RLS Policies:**
- All users can read lessons
- Only admins can create/update lessons

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.5. `categories`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Category name |
| description | text | Category description |
| icon | text | Category icon identifier |
| created_at | timestamp | When the category was created |
| parent_id | uuid | References categories.id for hierarchical categories |

**RLS Policies:**
- All users can read categories
- Only admins can create/update categories

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.6. `badges`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Badge name |
| description | text | Badge description |
| icon | text | Badge icon URL |
| requirement | jsonb | Requirements to earn the badge |
| created_at | timestamp | When the badge was created |

**RLS Policies:**
- All users can read badges
- Only admins can create/update badges

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.7. `user_badges`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| badge_id | uuid | References badges.id |
| earned_at | timestamp | When the badge was earned |

**RLS Policies:**
- Users can read their own badges
- System can insert badges for users

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.8. `learning_paths`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Path title |
| description | text | Path description |
| lessons | jsonb | Array of lesson IDs in sequence |
| created_at | timestamp | When the path was created |
| updated_at | timestamp | When the path was last updated |

**RLS Policies:**
- All users can read learning paths
- Only admins can create/update learning paths

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.9. `user_learning_paths`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| path_id | uuid | References learning_paths.id |
| progress | jsonb | Progress data for the path |
| started_at | timestamp | When the user started the path |
| completed_at | timestamp | When the user completed the path |

**RLS Policies:**
- Users can read their own learning path progress
- Users can update their own learning path progress

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.10. `chat_sessions`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References users.id |
| session_id | text | Chat session identifier |
| model | text | AI model used (e.g., 'gemini-pro') |
| is_active | boolean | Whether the session is active |
| created_at | timestamp | When the session was created |
| updated_at | timestamp | When the session was last updated |

**RLS Policies:**
- Users can read their own chat sessions
- Users can create new chat sessions
- Users can update their own chat sessions
- Users can delete their own chat sessions

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.11. `chat_messages`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversation_id | uuid | References chat_sessions.id |
| content | text | Message content |
| role | text | Message role ('user' or 'assistant') |
| timestamp | timestamp | When the message was sent |
| metadata | jsonb | Additional message metadata |

**RLS Policies:**
- Users can read messages in their own chat sessions
- Users can insert messages into their own chat sessions

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.2. Authentication Tables

Supabase Auth provides several built-in tables for authentication management:

- `auth.users`: Stores user credentials and authentication details
- `auth.sessions`: Manages user sessions
- `auth.refresh_tokens`: Handles token refresh for authenticated sessions

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 14.3. Database Triggers

- `on_auth_user_created`: Creates a new record in the `users` table when a user signs up
- `on_user_updated`: Updates the `auth.users` metadata when a user updates their profile

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15. Chat System Architecture

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1. Edge Functions

The chat system uses Supabase Edge Functions to handle chat history management. Edge Functions are serverless functions that run on Supabase's infrastructure, providing a scalable and efficient way to handle backend operations.

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.1. `chat_sessions` Edge Function

**Purpose:** Manages chat sessions (conversations) in the database.

**Endpoints:**
- `GET /chat_sessions`: Retrieves all chat sessions for the authenticated user
- `GET /chat_sessions/:id`: Retrieves a specific chat session with its messages
- `POST /chat_sessions`: Creates a new chat session
- `PUT /chat_sessions/:id`: Updates an existing chat session
- `DELETE /chat_sessions/:id`: Deletes a chat session

**Implementation Details:**
- Uses JWT authentication to verify user identity
- Implements Row Level Security (RLS) to ensure users can only access their own data
- Handles error cases with appropriate HTTP status codes
- Validates input data before performing database operations

**Example Usage:**
```typescript
// Create a new chat session
const { data, error } = await supabase.functions.invoke('chat_sessions', {
  body: {
    session_id: 'New Chat',
    model: 'gemini-pro'
  }
});

// Get all chat sessions for the current user
const { data, error } = await supabase.functions.invoke('chat_sessions');
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.1.2. `chat_messages` Edge Function

**Purpose:** Manages messages within chat sessions.

**Endpoints:**
- `GET /chat_messages/:conversation_id`: Retrieves all messages for a specific chat session
- `POST /chat_messages`: Adds a new message to a chat session

**Implementation Details:**
- Verifies that the user owns the chat session before allowing operations
- Automatically updates the `updated_at` timestamp of the parent chat session when adding messages
- Supports both user and assistant message roles
- Handles metadata for advanced message features

**Example Usage:**
```typescript
// Add a message to a chat session
const { data, error } = await supabase.functions.invoke('chat_messages', {
  body: {
    conversation_id: 'session-id',
    content: 'Hello, how can I help you?',
    role: 'assistant',
    timestamp: Date.now()
  }
});

// Get all messages for a chat session
const { data, error } = await supabase.functions.invoke('chat_messages', {
  method: 'GET',
  query: { conversation_id: 'session-id' }
});
```

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.2. Frontend Integration

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.2.1. Conversation Service

The `conversation-service.ts` file provides a clean API for interacting with the Edge Functions:

- `getConversations`: Retrieves all chat sessions for the current user
- `getConversation`: Retrieves a specific chat session with its messages
- `createConversation`: Creates a new chat session with optional initial messages
- `updateConversation`: Updates an existing chat session
- `deleteConversation`: Deletes a chat session
- `getMessages`: Retrieves all messages for a specific chat session
- `addMessage`: Adds a new message to a chat session

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.2.2. Chat Interface Component

The `chat-interface.tsx` component provides the user interface for the chat system:

- Displays chat messages with proper formatting and timestamps
- Handles user input and sends messages to the AI
- Manages loading states and error handling
- Provides conversation management (create, switch, delete)
- Integrates with authentication to show different UI based on user state
- Implements local storage fallback for offline access

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 15.3. Data Flow

1. **User Authentication**:
   - User logs in through Supabase Auth
   - JWT token is stored and used for all subsequent requests

2. **Conversation Management**:
   - User can create new conversations or select existing ones
   - Conversations are stored in the `chat_sessions` table
   - UI displays conversation list with session IDs

3. **Message Exchange**:
   - User sends a message through the chat interface
   - Message is sent to the AI service for processing
   - User message is stored in the `chat_messages` table
   - AI response is received and stored in the `chat_messages` table
   - Messages are displayed in the chat interface

4. **Offline Support**:
   - Messages are also stored in localStorage for offline access
   - When connection is restored, messages are synchronized with the server

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 16. Changelog

# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
# Calculator Charting & Visualization

## Chart.js Integration

This project now uses [Chart.js](https://www.chartjs.org/) via [react-chartjs-2](https://react-chartjs-2.js.org/) for all financial visualizations, including:
- Pie charts for payment breakdowns
- Line charts for amortization trends

## Chart Components

### PieChart
- Located at: `/src/components/ui/pie-chart.tsx`
- Props:
  - `labels: string[]` — Section labels
  - `data: number[]` — Section values
  - `backgroundColor?: string[]` — Colors
  - `borderColor?: string[]` — Border colors
  - `title?: string` — Chart title
- Accessible: ARIA labels, visually hidden descriptions, responsive container

### LineChart
- Located at: `/src/components/ui/line-chart.tsx`
- Props:
  - `labels: string[]` — X axis (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessible: ARIA labels, visually hidden descriptions, responsive container

## Accessibility & Responsiveness
- All charts have `aria-label`, `role="img"`, and screen reader descriptions
- Colors and fonts meet accessibility standards
- Charts are fully responsive and mobile-friendly

## Example Usage
```tsx
<PieChart
  labels={["Principal & Interest", "Property Tax"]}
  data={[1200, 200]}
  title="Monthly Payment Breakdown"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [10000, 9500, 9000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Loan Balance Over Time"
/>
```

## Migration Note
- All previous custom SVG chart code has been replaced with Chart.js-based React components for maintainability and interactivity.
 2025-05-20
- Implemented Supabase Edge Functions for chat history management
  - Created `chat_sessions` Edge Function for managing conversations
  - Created `chat_messages` Edge Function for managing messages
  - Updated database schema to use `chat_sessions` and `chat_messages` tables
  - Implemented Row Level Security (RLS) for data protection
  - Added JWT authentication for secure access

- Updated chat interface to use Edge Functions
  - Refactored conversation service to use the new Edge Functions
  - Fixed TypeScript types and interfaces for better type safety
  - Improved error handling and loading states
  - Added conversation selector UI for switching between conversations
  - Implemented automatic saving of chat messages to the database
  - Added localStorage fallback for offline access

- Added authentication integration to the chat interface
  - Implemented conditional UI based on authentication state
  - Added different welcome messages for authenticated/unauthenticated users
  - Disabled input field for unauthenticated users
  - Added sign-in/sign-up buttons for unauthenticated users

- Implemented centralized layout system with PageLayout component
  - Added conditional header visibility based on route
  - Removed duplicate styling from individual pages
  - Improved code maintainability and consistency
