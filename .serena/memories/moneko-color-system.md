# Moneko Color System

## Brand Colors
- **Primary**: `#7458FF` (light) / `#8B70FF` (dark) - Main brand purple
- **Secondary**: `#836DFF` (light) / `#9B82FF` (dark) - Secondary actions
- **Icon**: `#AA76FF` (light) / `#B388FF` (dark) - Icon highlights

## Tailwind Usage
- Primary: `primary` / `dark-primary`
- Secondary: `secondary` / `dark-secondary` 
- Icon: `icon` / `dark-icon`

## Component Colors
- Card backgrounds: `card-bg` (#FFFFFF) / `dark-card-bg` (#111827)
- Card foreground: `card-foreground-color` (#1F2937) / `dark-card-foreground-color` (#F1F5F9)
- Subtle borders: `subtle-border` (#E5E7EB) / `dark-subtle-border` (#374151)

## Hover States
Use semantic colors with opacity modifiers:
- `bg-primary/10` for light backgrounds
- `text-primary` for text colors
- `border-primary/30` for borders

## Best Practices
- Always provide dark variants: `bg-primary dark:bg-dark-primary`
- Use semantic names over hardcoded colors
- Apply alpha values for subtle effects: `/10`, `/20`, `/50`
- Maintain WCAG AA contrast compliance