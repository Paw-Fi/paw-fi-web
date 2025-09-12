Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is an excellent and ambitious expansion of the website's content strategy. The addition of 21 new passive income variants is a significant move to capture a much wider range of search intent and target diverse user demographics. The changes are consistent and well-executed across the content, sitemap, and `robots.txt` files.

#### Suggestions (Consider Improving)

*   **Video URL Typo:** In `src/data/home/passive-income-variants.json`, for the `hourly-wealth-maximizer` variant, the `videoUrl` is set to `/hourly-wealth-demo.webv`. This appears to be a typo and should likely be `/hourly-wealth-demo.webm` to match the other video formats.

*   **Sitemap `lastmod` Dates:** All new entries in `public/sitemap.xml` have the `lastmod` date set to `2025-09-12`. While accurate for this deployment, consider automating the update of this field to reflect the actual date of content modification. This provides more accurate information to search engine crawlers. You have a `scripts/update-sitemap.js` script which might be a good place to implement this logic.

*   **Asset Verification:** The new variants in `passive-income-variants.json` reference several new video and poster assets (e.g., `/time-wealth-demo.webm`, `/time-wealth-poster.webp`). Please ensure that all these assets have been created and placed in the `public` directory to avoid broken media links on the new landing pages.

There are no critical issues or warnings to report. This is a very strong set of changes that massively expands the site's SEO footprint and content offerings. Great work.
