import { getBotSpaceInfo } from "./space-tools.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${
        message ?? "assertEquals failed"
      }\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

type QueryResult = { data: unknown; error: unknown };
type QueryCall = { table: string; select?: string };

class FakeQuery implements PromiseLike<QueryResult> {
  private selectValue?: string;

  constructor(
    private readonly table: string,
    private readonly calls: QueryCall[],
    private readonly result: QueryResult,
  ) {}

  select(value: string) {
    this.selectValue = value;
    this.calls.push({ table: this.table, select: value });
    return this;
  }

  eq(_column: string, _value: unknown) {
    return this;
  }

  in(_column: string, _values: unknown[]) {
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

Deno.test("getBotSpaceInfo loads public profiles without an inferred relationship", async () => {
  const calls: QueryCall[] = [];
  const results: Record<string, QueryResult> = {
    households: {
      data: {
        id: "space-1",
        name: "Family",
        currency: "EUR",
        owner_id: "user-1",
        is_portfolio: false,
      },
      error: null,
    },
    household_members: {
      data: [
        { user_id: "user-1", role: "owner" },
        { user_id: "user-2", role: "member" },
      ],
      error: null,
    },
    users: {
      data: [
        {
          id: "user-1",
          full_name: "Alice Example",
          email: "alice@example.com",
          avatar_url: "alice.png",
        },
        {
          id: "user-2",
          full_name: "Bob Example",
          email: "bob@example.com",
          avatar_url: null,
        },
      ],
      error: null,
    },
  };
  const supabase = {
    from(table: string) {
      return new FakeQuery(table, calls, results[table]);
    },
  };

  const result = await getBotSpaceInfo({
    supabase,
    userId: "user-1",
    args: { space_id: "space-1" },
    spaceMap: new Map(),
  });

  assertEquals(calls, [
    {
      table: "households",
      select:
        "id, name, currency, cover_image_url, is_portfolio, ai_use_default_split, ai_default_split_config, owner_id",
    },
    { table: "household_members", select: "user_id, role" },
    {
      table: "users",
      select: "id, full_name, email, avatar_url",
    },
  ]);
  assertEquals(result, {
    success: true,
    space: {
      name: "Family",
      currency: "EUR",
      type: "shared",
      cover_image_url: undefined,
      ai_use_default_split: false,
      ai_default_split_config: null,
    },
    member_count: 2,
    members: [
      {
        name: "Alice Example",
        email: "alice@example.com",
        role: "owner",
        avatar_url: "alice.png",
      },
      {
        name: "Bob Example",
        email: "bob@example.com",
        role: "member",
        avatar_url: undefined,
      },
    ],
  });
});
