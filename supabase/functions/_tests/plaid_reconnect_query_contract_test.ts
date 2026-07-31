import {
  assert,
  assertFalse,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const createLinkTokenSource = await Deno.readTextFile(
  new URL("../plaid-create-link-token/index.ts", import.meta.url),
);
const exchangePublicTokenSource = await Deno.readTextFile(
  new URL("../plaid-exchange-public-token/index.ts", import.meta.url),
);
const itemControlSource = await Deno.readTextFile(
  new URL("../plaid-item-control/index.ts", import.meta.url),
);
const bankSyncSource = await Deno.readTextFile(
  new URL("../shared/bank-sync.ts", import.meta.url),
);
const openItemFilter =
  '.or("item_status.is.null,item_status.not.in.(removed,pending_removal)")';

function section(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert(startIndex >= 0 && endIndex > startIndex);
  return source.slice(startIndex, endIndex);
}

Deno.test(
  "Plaid free limits exclude terminal items but retain NULL item status",
  () => {
    const countQueries = [
      section(
        createLinkTokenSource,
        "if (!resolvedConnectionId && !accessState.isConvertedPaidUser)",
        "if ((count ?? 0) >= 1)",
      ),
      section(
        exchangePublicTokenSource,
        "if (!accessState.isConvertedPaidUser && shouldCompensateOrphanItem)",
        "if ((count ?? 0) >= 1)",
      ),
    ];
    for (const query of countQueries) {
      assert(
        query.includes(
          "item_status.is.null,item_status.not.in.(removed,pending_removal)",
        ),
      );
    }
  },
);

Deno.test("Plaid duplicate lookups retain legacy NULL item status", () => {
  for (const source of [createLinkTokenSource, exchangePublicTokenSource]) {
    assert(source.replaceAll(/\s+/g, "").includes(openItemFilter));
    assertFalse(source.includes('.neq("item_status", "pending_removal")'));
  }
});

Deno.test(
  "Plaid direct reconnect rejects terminal connections before Link",
  () => {
    assert(
      createLinkTokenSource.includes(
        'errorCode: "plaid_connection_terminal_or_removing"',
      ),
    );
    assert(
      createLinkTokenSource.includes(
        '["removed", "pending_removal"].includes(connection.item_status || "")',
      ),
    );
  },
);

Deno.test("Plaid household completion separates actor from owner", () => {
  assert(itemControlSource.includes("userId: connection.user_id"));
  assert(itemControlSource.includes('.rpc("complete_plaid_update_mode_v2"'));
  assert(itemControlSource.includes("p_actor_user_id: authResult.userId"));
});

Deno.test(
  "Plaid household Link requires management role at both entry points",
  () => {
    for (const source of [createLinkTokenSource, exchangePublicTokenSource]) {
      assert(
        source.includes("A household owner or admin must connect a bank."),
      );
      assert(source.includes("household_connection_requires_admin"));
    }
  },
);

Deno.test(
  "Plaid update sessions persist the connection's actual household",
  () => {
    assert(createLinkTokenSource.includes("resolvedConnectionHouseholdId"));
    assert(
      createLinkTokenSource
        .replaceAll(/\s+/g, "")
        .includes("resolvedConnectionHouseholdId??targetHouseholdId??null"),
    );
  },
);

Deno.test("Plaid reactivation reauthorizes the actor in the database", () => {
  assert(exchangePublicTokenSource.includes("actorUserId: authResult.userId"));
  assert(bankSyncSource.includes('"reactivate_plaid_connection_v1"'));
});
