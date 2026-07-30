/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260730140000_include_pending_recurring_occurrence_history.sql",
    import.meta.url,
  ),
);

Deno.test(
  "recurring history includes every unmaterialized actionable occurrence",
  () => {
    assertStringIncludes(
      migration,
      "public.recurring_latest_actionable_occurrence_v1",
    );
    assertStringIncludes(
      migration,
      "public.project_recurring_occurrence_dates_v1",
    );
    assertStringIncludes(migration, "'status', 'pending'");
    assertStringIncludes(migration, "'id', 'pending:' || v_template.id::text");
    assertStringIncludes(
      migration,
      "from public.recurring_occurrences occurrence",
    );
    assertStringIncludes(
      migration,
      "occurrence.scheduled_occurrence_date = projected.occurrence_date",
    );
    assertStringIncludes(migration, "if v_latest_actionable is not null then");
  },
);

Deno.test(
  "recurring history paginates the combined persisted and pending timeline",
  () => {
    assertStringIncludes(migration, "with timeline as");
    assertStringIncludes(migration, "union all");
    assertStringIncludes(
      migration,
      "order by item.scheduled_occurrence_date desc",
    );
    assertStringIncludes(migration, "limit v_limit + 1");
    assertStringIncludes(migration, "p_before_scheduled_date - 1");
    assertStringIncludes(migration, "'has_more'");
    assertStringIncludes(migration, "'next_cursor'");
  },
);
