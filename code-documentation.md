# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 PawFi Codebase Documentation

This document provides a detailed file-by-file breakdown of the PawFi codebase to complement the main documentation.md file. Use this as a reference for understanding specific implementation details.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Table of Contents

1. [Types](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
1-types)
2. [Components](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
2-components)
3. [Routes](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
3-routes)
4. [Data Management](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
4-data-management)
5. [Utilities](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
5-utilities)
6. [Contexts](# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
6-contexts)

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 1. Types

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
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

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 2. Components

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Learning Components

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
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

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/learning/completion-display.tsx`

**Purpose:** Modal shown when a lesson is completed.

**Key Features:**
- Displays personalized completion message and XP earned
- Includes confetti animation using GSAP
- Shows progress towards badges
- Handles multiple success states (full success vs. partial)
- Triggers the unlocking of the next lesson in sequence

**Components Used:**
- `Modal` from UI components
- `Button` from UI components
- Uses GSAP for animations

**State Management:**
- Uses refs for animation targets
- Handles various states (success/failure)
- Manages progression through the learning system

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
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

**Usage Pattern:**
```tsx
const {
  currentQuestion,
  handleAnswer,
  handleNext,
  // other properties and methods
} = useLesson({
  lessonId,
  questions,
  unlocked,
  xp
});
```

**Relationships:**
- Used in `/routes/learning/$lessonId.tsx`
- Uses validation functions from `lesson-utils.ts`
- Interacts with localStorage for persistence

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/learning/hooks/unlock-next-lesson.ts`

**Purpose:** Utility function to unlock the next lesson in sequence.

**Implementation:**
- Accesses localStorage to get course data
- Finds the current lesson by ID
- Updates the next lesson's unlock status
- Saves the updated course data back to localStorage

**Usage:**
```typescript
// When a lesson is completed successfully
unlockNextLesson(lessonId);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/learning/lesson-utils.ts`

**Purpose:** Core validation functions for question answers.

**Key Functions:**

- `areAllAnswersCorrect`: Checks if all answers in a lesson are correct
- `isAnswerCorrect`: Validates a specific answer for any question type
- `isCurrentQuestionAnswered`: Checks if the current question has been answered

**Implementation Details:**
- Type-specific validation logic for each question type
- Handles complex validations for categorization questions
- Pattern matching for text input questions
- Array comparison for sequence questions

**Usage Example:**
```typescript
// Check if an answer is correct
const isCorrect = isAnswerCorrect(question, userAnswer);

// Check if all answers are correct
const passedLesson = areAllAnswersCorrect(questions, allAnswers);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/learning/question-types/choice-question.tsx`

**Purpose:** Component for rendering and handling single and multiple choice questions.

**Features:**
- Supports both single choice (scq) and multiple choice (mcq) questions
- Renders options with descriptions
- Handles selection state
- Provides visual feedback for selections

**Props Interface:**
```typescript
interface ChoiceQuestionProps {
  question: Question;
  value: string | string[];
  onAnswer: (questionId: string, answer: string | string[]) => void;
}
```

**Usage:**
```tsx
<ChoiceQuestion
  question={question}
  value={answers[question.id]}
  onAnswer={handleAnswer}
/>
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 UI Components

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/ui/button.tsx`

**Purpose:** Reusable button component with variants.

**Props:**
- `variant`: 'primary', 'secondary', 'outline', etc.
- `size`: 'sm', 'md', 'lg'
- Standard button props (onClick, disabled, etc.)

**Usage:**
```tsx
<Button 
  variant="primary"
  onClick={handleClick}
>
  Continue
</Button>
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/ui/modal.tsx`

**Purpose:** Reusable modal dialog component.

**Features:**
- Backdrop with click-to-close
- Focus management
- Animation using GSAP
- Accessibility features

**Usage:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={handleClose}
>
  <h2>Modal Title</h2>
  <p>Modal content goes here.</p>
</Modal>
```

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 3. Routes

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/routes/learning/$lessonId.tsx`

**Purpose:** Route component for a specific lesson.

**Implementation Details:**
- Uses TanStack Router's `createFileRoute`
- Fetches lesson data using `getLessonById`
- Uses the `useLesson` hook for state management
- Renders appropriate question components based on question type
- Displays completion modal when lesson is finished

**Components Used:**
- `LessonProgressBar`
- `QuestionHeader`
- `QuestionContent`
- `AnswerFeedback`
- `ActionButtons`
- `HelpTips`
- `CompletionDisplay`

**Usage:**
- Accessed via URL `/learning/[lessonId]`
- Handles all interactions for a specific lesson

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/routes/sabina-learning.tsx`

**Purpose:** Main learning page displaying available lessons.

**Key Features:**
- Displays list of lessons with unlock status
- Handles lesson data from localStorage
- Provides import/reset functionality for lessons
- Animates lesson cards using GSAP

**Data Management:**
- Uses `getAllLessons` and `getAllCourses` for data access
- Manages localStorage for data persistence
- Handles JSON import for custom lessons

**UI Elements:**
- Lesson cards with visual indicators for lock status
- Metadata including question count, duration, and XP value
- Animation for lesson card entry

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/routes/chat.tsx`

**Purpose:** Chat route for personalized recommendations.

**Implementation:**
- Uses the chat interface for an interactive experience
- Generates personalized lessons based on user responses
- Shows loading animation during lesson generation
- Redirects to learning page upon completion

**Components Used:**
- `ChatInterface`
- Loading indicators with progress bar

**Data Flow:**
- Collects user responses via chat
- Generates personalized content
- Stores generated lessons in localStorage
- Redirects to learning page

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 4. Data Management

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/data/lessons.ts`

**Purpose:** Provides data access functions for lessons and courses.

**Key Functions:**
- `getLessonById`: Retrieves a specific lesson by ID
- `getCourseById`: Retrieves a specific course by ID
- `getAllCourses`: Gets all available courses
- `getAllLessons`: Gets all available lessons
- Helper functions for localStorage interaction

**Storage Strategy:**
- Uses a unified storage key 'paw-fi-course'
- Stores data in a structured course format
- Falls back to mock data if nothing exists in localStorage

**Usage:**
```typescript
// Get a specific lesson
const lesson = getLessonById('lesson-1');

// Get all lessons
const lessons = getAllLessons();
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/data/chat.ts`

**Purpose:** Defines Chat questions for user profiling.

**Content:**
- Array of questions using the shared Question type
- Includes various question types (scq, mcq, text-input)
- Questions focused on financial preferences and goals

**Relationship:**
- Used by the Chat context
- Shared type system with learning questions

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 5. Utilities

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/utils/storage.ts`

**Purpose:** Utilities for localStorage access.

**Key Functions:**
- `getFromStorage`: Safely retrieves and parses data from localStorage
- `saveToStorage`: Safely stringifies and saves data to localStorage

**Error Handling:**
- Handles JSON parse/stringify errors
- Provides fallback values
- Includes type safety via TypeScript generics

**Usage:**
```typescript
// Get data with fallback
const data = getFromStorage<UserSettings>('settings', defaultSettings);

// Save data
saveToStorage('settings', updatedSettings);
```

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 6. Contexts

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/contexts/chat-context.tsx`

**Purpose:** Context provider for Chat state management.

**State Management:**
- Tracks current step
- Stores answers for each question
- Provides navigation and answer recording functions

**Key Functions:**
- `nextStep`: Advances to the next question
- `prevStep`: Returns to the previous question
- `setAnswer`: Records an answer for a specific question
- `resetChat`: Clears all answers and resets to start

**Usage:**
```tsx
// Provider
<ChatProvider>
  <App />
</chatProvider>

// Consumer
const { state, nextStep, setAnswer } = useChat();
```

**Persistence:**
- Saves state to localStorage using the 'Chat' key
- Loads previous state on initialization if available

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Implementation Notes

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Storage Architecture

The application uses a unified storage approach:
- `paw-fi-course`: Single key for all course and lesson data
- Structured as a course object containing lessons array
- Progress tracking stored within this structure

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Routing Pattern

TanStack Router implementation:
- File-based routing with `createFileRoute`
- Dynamic routes using parameters (e.g., `$lessonId`)
- Route components defined inline with route configuration

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Component Reuse Strategy

The codebase emphasizes component reuse:
- Shared question components between learning and Chat
- Common validation logic
- Unified type system
- Abstract UI components with variants

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Chat Sessions & Chat Messages Edge Functions

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Technical Solution for Payload and Timestamp Handling

- **Frontend:**
  - Always send the message payload as a JS object if not setting Content-Type, or as a JSON string if setting Content-Type.
  - Convert timestamp to ISO8601 string:
    ```typescript
    const requestBody = {
      ...message,
      timestamp: new Date(message.timestamp).toISOString()
    };
    ```

- **Backend (Supabase Edge Function):**
  - Destructure `timestamp` from the request body:
    ```typescript
    const { chat_session_id, content, role, metadata = {}, timestamp } = requestData;
    ```
  - Use the provided timestamp in the insert:
    ```typescript
    .insert({
      chat_session_id,
      content,
      role,
      timestamp, // ISO8601 string
      metadata: metadata || null
    })
    ```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Best Practices
- Do not manually set `Content-Type` unless you are serializing the body yourself.
- Always match the frontend payload structure with backend expectations.
- Use ISO8601 strings for all `timestamptz` columns in Postgres.
- Add logging in Edge Functions to debug serialization and payload issues.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Troubleshooting
- If you see `Missing required field: chat_session_id`, check request body serialization and field names.
- If you see `date/time field value out of range`, ensure the timestamp is an ISO8601 string, not milliseconds.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Schema Alignment and Final State (2025-05-20)

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Schema Matching
- All Edge Function logic now matches the current Supabase schema for `chat_sessions` and `chat_messages`.
- Non-schema fields (`metadata`, `title`, `conversation_id`) were removed from all chat_sessions logic.
- For `chat_messages`, all references to `conversation_id` were replaced with `chat_session_id`.
- The `timestamp` field (BIGINT) is now present in the `chat_messages` table and is used for message ordering and insertion. The `created_at` field is not used for ordering or filtering in chat_messages.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 GET Handler Improvements
- The GET handler for chat_messages returns an empty array (`[]`) with HTTP 200 if no messages exist for a session, instead of a 500 error.
- All error handling is now specific and does not treat 'no messages' as an error.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Insert & Query Logic
- Message insertion and queries only use columns present in the schema: `id`, `chat_session_id`, `role`, `content`, `timestamp`, `metadata`, `created_at`.
- All message ordering is now by `timestamp`.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Final Verification
- All endpoints have been tested and are working as intended.
- Documentation and code have been cleaned up to remove any workaround or irrelevant legacy logic.
- The implementation is now robust, maintainable, and fully aligned with the database structure.

---

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Schema Alignment and Error Fixes (2025-05-20)
- Removed all references to `metadata` and `title` from the `chat_sessions` Edge Function implementation.
- The Supabase schema for `chat_sessions` did not include these columns, which caused PGRST204 errors when the function attempted to insert or select them.
- The function now only uses columns that exist in the schema: `id`, `user_id`, `session_id`, `model`, `system_prompt`, `is_active`, `created_at`, and `updated_at`.
- This ensures error-free operation and matches the deployed database structure.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Error Details
- **metadata error:** Occurred because the code referenced a non-existent `metadata` column on `chat_sessions`.
- **title error:** Occurred because the code referenced a non-existent `title` column on `chat_sessions`.
- Both errors were resolved by removing these fields from the function's logic and types.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Next Steps
- Always ensure Edge Function logic matches the Supabase table schema.
- If new fields are needed, add them to the schema before using them in code.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/supabase/functions/chat_sessions/index.ts`

**Purpose:** Edge Function for managing chat sessions (conversations) in the database.

**Key Endpoints:**
- `GET /chat_sessions`: Retrieves all chat sessions for the authenticated user
- `GET /chat_sessions/:id`: Retrieves a specific chat session by ID
- `POST /chat_sessions`: Creates a new chat session
- `PUT /chat_sessions/:id`: Updates an existing chat session
- `DELETE /chat_sessions/:id`: Deletes a chat session

**Implementation Details:**
- Uses Deno runtime environment
- Implements JWT authentication to verify user identity
- Applies Row Level Security (RLS) to ensure users can only access their own data
- Handles error cases with appropriate HTTP status codes
- Validates input data before performing database operations

**Example Request/Response:**
```typescript
// POST /chat_sessions
// Request Body
{
  "session_id": "New Chat",
  "model": "gemini-pro"
}

// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "auth-user-id",
  "session_id": "New Chat",
  "model": "gemini-pro",
  "is_active": true,
  "created_at": "2025-05-20T12:00:00.000Z",
  "updated_at": "2025-05-20T12:00:00.000Z"
}
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/supabase/functions/chat_messages/index.ts`

**Purpose:** Edge Function for managing messages within chat sessions.

**Key Endpoints:**
- `GET /chat_messages/:conversation_id`: Retrieves all messages for a specific chat session
- `POST /chat_messages`: Adds a new message to a chat session

**Implementation Details:**
- Verifies that the user owns the chat session before allowing operations
- Automatically updates the `updated_at` timestamp of the parent chat session when adding messages
- Supports both user and assistant message roles
- Handles metadata for advanced message features

**Example Request/Response:**
```typescript
// POST /chat_messages
// Request Body
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hello, how can I help you?",
  "role": "assistant",
  "timestamp": 1621512000000
}

// Response
{
  "id": "660f9500-f30c-52e5-b827-557766550000",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hello, how can I help you?",
  "role": "assistant",
  "timestamp": 1621512000000,
  "metadata": null
}
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 8. AI Integration

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/services/gemini-service.ts`

const chatSession = createChatSession(systemPrompt);

// Send a message and get a response
const response = await sendMessageToGemini(chatSession, userMessage);

**Key Functions:**
- `createChatSession`: Initializes a new chat session with the Gemini API
- `sendMessageToGemini`: Sends a message to the API and processes the response
- `isValidLesson`: Validates that JSON data from the API matches the expected lesson format

**Usage:**
```typescript
// Initialize a chat session
const chatSession = createChatSession(systemPrompt);

// Send a message and get a response
const response = await sendMessageToGemini(message, chatSession);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/services/conversation-service.ts`

**Purpose:** Service for interacting with the chat history backend API.

**Key Types:**
- `Message`: Interface for chat messages with content, role, and timestamp
**Key Functions:**
- `getConversations`: Retrieves all chat sessions for the authenticated user
- `getConversation`: Retrieves a specific chat session with its messages
- `createConversation`: Creates a new chat session with optional initial messages
- `updateConversation`: Updates an existing chat session (title, metadata, etc.)
- `deleteConversation`: Deletes a chat session and its associated messages
- `getMessages`: Retrieves all messages for a specific chat session
- `addMessage`: Adds a new message to a chat session

**Implementation Details:**
- Uses Supabase client to invoke Edge Functions
- Implements proper TypeScript interfaces for type safety
- Handles error cases with appropriate error messages
- Provides fallback to localStorage for offline access
- Automatically refreshes JWT tokens when needed

**Usage:**
```typescript
// Create a new chat session with an initial message
const conversation = await createConversation(
  'New Chat',
  [{
    content: 'Hello, how can I help you?',
    role: 'assistant',
    timestamp: Date.now()
  }]
);

// Add a message to a chat session
const updatedConversation = await addMessage(
  conversationId,
  'I have a question about investing',
  'user'
);

// Get all chat sessions for the current user
const conversations = await getConversations();

// Get all messages for a specific chat session
const messages = await getMessages(conversationId);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/services/gemini-service.ts`

const chatSession = createChatSession(systemPrompt);

// Send a message and get a response
const response = await sendMessageToGemini(chatSession, userMessage);

// Check if the response contains lesson data
if (response.isComplete && response.generatedLessons) {
  // Process the generated lesson data
  handleLessonData(response.generatedLessons);
}

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/utils/prompt-utils.ts`

**Purpose:** Utilities for working with AI prompts and responses.

**Key Functions:**
- `formatSystemPrompt`: Formats a system prompt for the Gemini API
- `formatUserMessage`: Formats a user message for the Gemini API
- `extractJsonFromText`: Extracts JSON data from text responses using multiple strategies
- `safeJsonParse`: Safely parses JSON strings with error handling

**Implementation Details:**
- Uses multiple strategies to extract JSON from AI responses
- Handles edge cases like code blocks and single-quoted JSON
- Provides robust error handling for JSON parsing

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/utils/gemini-prompts.ts`

**Purpose:** Specialized prompts for the Gemini API.

**Key Prompts:**
- `generateLessonsPrompt`: Prompt to request lesson generation after a conversation
- `directLessonGenerationPrompt`: Prompt for immediate lesson generation

**Usage:**
```typescript
// Request lesson generation after conversation
const response = await sendMessageToGemini(chatSession, generateLessonsPrompt);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/components/chat/chat-interface.tsx`

**Purpose:** Interactive chat interface that integrates with Supabase Edge Functions for chat history management and uses the Gemini API for AI responses.

**Key Features:**
- Real-time conversation with the Gemini AI
- Complete chat history management using Supabase
- Conversation selection and creation
- Offline support with localStorage fallback
- Authentication integration with conditional UI
- Detects when to generate personalized lessons
- Handles JSON responses for lesson generation

**State Management:**
- `messages`: Array of chat messages with content, role, and timestamp
- `isLoading`: Boolean to track when waiting for AI response
- `error`: Error state for handling API failures
- `conversations`: List of user's chat sessions
- `currentConversationId`: ID of the active conversation
- `inputValue`: Current value of the message input field

**Key Functions:**
- `getConversations()`: Fetches all chat sessions for the current user
- `handleSendMessage(message: string)`: Sends a message to the AI and stores it in the database
- `handleCreateConversation()`: Creates a new chat session
- `handleSelectConversation(id: string)`: Switches to a different chat session
- `handleDeleteConversation(id: string)`: Deletes a chat session and its messages

**Implementation Details:**
- Uses React hooks for state management
- Implements a message input system with validation
- Handles loading states and error messages
- Integrates with Supabase authentication for user identification
- Uses the conversation service to interact with Edge Functions
- Implements localStorage fallback for offline access
- Detects and processes JSON responses for lesson generation
- Supports automatic JSON continuation for large responses
  - Detects incomplete JSON in responses
  - Sends a "continue" message to the Gemini API
  - Merges JSON fragments with proper formatting
  - Removes intermediate messages from the chat history
  - Shows loading indicators during the continuation process
  - Recursively continues if the JSON is still incomplete after the first continuation

- `getAIResponse(userMessage: string, addToChat: boolean)`: Enhanced to support JSON continuation
  - Added `addToChat` parameter to control whether messages appear in the chat
  - Automatically triggers JSON continuation when incomplete JSON is detected
  - Uses a timeout-based approach to ensure state updates complete before continuation

- `startLessonGeneration(lessonData: any)`: Updated to handle multiple data formats
  - Supports both single lesson format and course format with multiple lessons
  - Detects the data structure and processes it accordingly
  - Creates appropriate course objects for localStorage

**Message Rendering:**
- Enhanced JSON parsing logic to handle both complete and incomplete JSON
- Two-step parsing approach: first tries to parse the entire content, then falls back to extracting JSON
- Improved debugging information for development mode
- Loading indicators for the continuation process
- Special handling for course format with multiple lessons

**Data Flow:**
- User messages are sent to the Gemini API
- AI responses are displayed in the chat
- If an incomplete JSON response is detected:
  1. The system automatically sends a "continue" message to the API
  2. The response is combined with the previous incomplete JSON
  3. The process repeats until complete JSON is obtained
  4. Only the final complete JSON is shown to the user
- When complete JSON is available, it's parsed and displayed as a lesson card
- The JSON data is stored in localStorage for access in the learning system

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Supabase Implementation

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Database Schema

The application uses Supabase for authentication and data storage. Below are the implementation details for the database schema and related functionality.

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Table: `users`

**SQL Definition:**
```sql
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT false
);
```

**RLS Policies:**
```sql
-- Allow users to read their own data
CREATE POLICY "Users can read their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow service role to insert new users
CREATE POLICY "Service role can insert users" 
  ON public.users 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Table: `user_progress`

**SQL Definition:**
```sql
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  score INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);
```

**RLS Policies:**
```sql
-- Allow users to read their own progress
CREATE POLICY "Users can read their own progress" 
  ON public.user_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own progress
CREATE POLICY "Users can insert their own progress" 
  ON public.user_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Table: `conversations`

**SQL Definition:**
```sql
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**RLS Policies:**
```sql
-- Allow users to read their own conversations
CREATE POLICY "Users can read their own conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own conversations
CREATE POLICY "Users can insert their own conversations" 
  ON public.conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own conversations
CREATE POLICY "Users can update their own conversations" 
  ON public.conversations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations" 
  ON public.conversations 
  FOR DELETE 
  USING (auth.uid() = user_id);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Table: `messages`

**SQL Definition:**
```sql
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

**RLS Policies:**
```sql
-- Allow users to read messages in their own conversations
CREATE POLICY "Users can read messages in their conversations" 
  ON public.messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Allow users to insert messages into their own conversations
CREATE POLICY "Users can insert messages into their conversations" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Database Triggers

**User Creation Trigger:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Integration with Frontend

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 `/src/lib/supabase.ts`

**Purpose:** Initializes and exports the Supabase client for use throughout the application.

**Implementation:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Data Access Patterns

**User Profile:**
```typescript
// Get current user profile
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

// Update user profile
const { error } = await supabase
  .from('users')
  .update({ full_name: newName, avatar_url: newAvatarUrl })
  .eq('id', user.id);
```

**User Progress:**
```typescript
// Save lesson progress
const { error } = await supabase
  .from('user_progress')
  .insert({
    user_id: user.id,
    lesson_id: lessonId,
    score: score,
    xp_earned: xpEarned
  });

// Get user's completed lessons
const { data, error } = await supabase
  .from('user_progress')
  .select('lesson_id, completed_at, xp_earned')
  .eq('user_id', user.id);
```

**Conversations:**
```typescript
// Get all conversations for a user
const { data: conversations, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false });

// Create a new conversation
const { data: newConversation, error } = await supabase
  .from('conversations')
  .insert({
    user_id: user.id,
    title: 'New Conversation'
  })
  .select()
  .single();

// Update conversation title
const { error } = await supabase
  .from('conversations')
  .update({ title: newTitle, updated_at: new Date() })
  .eq('id', conversationId);

// Delete a conversation
const { error } = await supabase
  .from('conversations')
  .delete()
  .eq('id', conversationId);
```

**Messages:**
```typescript
// Get all messages for a conversation
const { data: messages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('timestamp', { ascending: true });

// Add a new message to a conversation
const { data: newMessage, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: messageContent,
    role: 'user' // or 'assistant'
  })
  .select()
  .single();

// Update conversation timestamp when adding a message
const { error: updateError } = await supabase
  .from('conversations')
  .update({ updated_at: new Date() })
  .eq('id', conversationId);
```

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 Changelog

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 2025-05-20
- Implemented chat history backend:
  - Created a dedicated Express/MongoDB backend for storing and retrieving chat history
  - Implemented RESTful API endpoints for managing conversations
  - Added conversation service for frontend integration
  - Updated chat interface to use the conversation service
  - Added conversation selector UI for switching between conversations
  - Implemented automatic saving of chat messages to the backend
  - Added fallback to localStorage for unauthenticated users

- Updated authentication implementation:
  - Fixed email verification detection in `sign-up-form.tsx` to properly check for `confirmation_sent_at` property
  - Improved sign-up form UI with better conditional rendering
  - Moved "Already have an account?" link from register page to sign-up form component
  - Removed redundant "Go to Login" button from verification screen
  - Updated profile page layout with improved responsive width
  - Streamlined navigation flow after authentication to direct users to chat

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 2025-05-19
- Added JSON continuation feature documentation
  - Detailed implementation of automatic JSON continuation in `chat-interface.tsx`
  - Documented the JSON detection and validation system
  - Explained the seamless merging of JSON fragments
  - Added information about handling both single lesson and course formats
  - Documented the recursive continuation approach for large JSON responses

# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
# Code Documentation: Course, Lesson, and Question Schemas

## Overview
This document describes the structure of course, lesson, and question data as used in the PawFi app, matching the Zod schemas in `supabase/functions/chat_stream/schemas.ts` and the sample data in `src/data/mock1.json`.

---

## Course Schema
A course is the top-level container for lessons.

```
Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  lessons: Lesson[];
}
```

## Lesson Schema
A lesson is a sequence of questions within a course.

```
Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}
```

## Question Schema (Discriminated Union)
All questions share some common fields, with additional fields depending on type.

```
Base fields for all questions:
- id: string
- type: string (see below)
- question: string
- explanation: string
- incorrect_explanation?: string
- hint?: string
- help_tips?: string
- content_blocks?: Array<{ type: string; content: string }>
```

### Supported Question Types

#### 1. Single Choice (scq) / Multiple Choice (mcq)
```
{
  type: 'scq' | 'mcq',
  options: Array<{
    id: string;
    content: string;
    isCorrect?: boolean;
    description?: string;
  }>
}
```

#### 2. Sort Categories (sort-categories)
```
{
  type: 'sort-categories',
  categories: Array<{ id: string; content: string }>,
  items: Array<{ id: string; content: string }>,
  correct_answers: Record<string, string[]>,
  imagePrompt?: string,
  caption?: string
}
```

#### 3. Sort Order (sort-order)
```
{
  type: 'sort-order',
  items: Array<{ id: string; content: string }>,
  correct_answers: string[]
}
```

#### 4. Text Input (text-input)
```
{
  type: 'text-input',
  validation: {
    required: boolean;
    min: number;
    max: number;
    errorMessage: string;
    caseSensitive: boolean;
  }
}
```

#### 5. Image Choice (image-choice)
```
{
  type: 'image-choice',
  image_options: Array<{
    id: string;
    content: string;
    imageUrl: string;
    imagePrompt: string;
    caption: string;
    isCorrect: boolean;
  }>,
  imagePrompt?: string,
  caption?: string
}
```

#### 6. Match (match)
```
{
  type: 'match',
  items: Array<{ id: string; content: string }>,
  options: Array<{ id: string; content: string; isCorrect?: boolean; description?: string }>,
  correct_answers: Record<string, string>
}
```

#### 7. Matrix Rating (matrix-rating)
```
{
  type: 'matrix-rating',
  rows: Array<{ id: string; content: string; color?: string }>,
  columns: Array<{ id: string; content: string; color?: string }>,
  correct_answers: Record<string, string>
}
```

---

## Notes
- All fields marked optional (`?`) may be omitted in some questions.
- The schemas are validated with Zod and must match exactly for data to be accepted.
- This structure supports rich, interactive, and varied question types for financial education modules.

---

For any updates to the schema, ensure both the Zod schema and this documentation are kept in sync.



## PieChart (`/src/components/ui/pie-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — labels for each section
  - `data: number[]` — values for each section
  - `backgroundColor?: string[]` — fill colors
  - `borderColor?: string[]` — border colors
  - `title?: string` — chart title
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-xs`, adapts to parent

## LineChart (`/src/components/ui/line-chart.tsx`)
- Built with Chart.js via react-chartjs-2
- Props:
  - `labels: string[]` — x-axis labels (e.g., months)
  - `datasets: { label, data, borderColor, backgroundColor, fill? }[]`
  - `title?: string`
- Accessibility: ARIA label, visually hidden description, role="img"
- Responsive: `w-full`, `max-w-2xl`, adapts to parent

## Integration Example
```tsx
import { PieChart } from '../ui/pie-chart';
import { LineChart } from '../ui/line-chart';

<PieChart
  labels={["Principal", "Interest"]}
  data={[100000, 50000]}
  title="Total Payment Distribution"
/>

<LineChart
  labels={["M1", "M2", "M3"]}
  datasets={[
    { label: "Balance", data: [100000, 99500, 99000], borderColor: "#36a2eb", backgroundColor: "#36a2eb22" }
  ]}
  title="Amortization Trend"
/>
```

## Accessibility Notes
- All charts have ARIA labels and visually hidden descriptions for screen readers.
- Colors and fonts are chosen for high contrast and clarity.
- Chart containers are fully responsive and mobile-friendly.
 2025-05-18
- Initial comprehensive code documentation
- Added file-by-file breakdown
- Included usage examples for key components
- Documented relationships between components
- Added documentation for Gemini API integration
