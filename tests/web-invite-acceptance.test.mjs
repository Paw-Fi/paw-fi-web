import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/routes/invites/$token.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const validation = (metadata = {}, name = "家族") => ({
  valid: true,
  household: { id: "space-1", name },
  inviter: { full_name: "Inviter" },
  invite: {
    personal_message: null,
    is_reusable: true,
    invited_role: "member",
    ...metadata,
  },
});
const accepted = {
  data: { success: true, household_id: "space-1", member_id: "member-1" },
  error: null,
};
const httpError = (data) => ({
  data: null,
  error: { context: new Response(JSON.stringify(data), { status: 409 }) },
});

// Execute the production route with a small hook renderer, matching the existing
// Node/TypeScript/VM test pattern. Effects run after render; keys own hook state.
function harness({
  user = "actor-a",
  loading = false,
  mobile = false,
  deferPassiveCleanup = false,
} = {}) {
  let token = "token-1";
  let auth = { user: user ? { id: user } : null, isLoading: loading };
  let current;
  let dirty = true;
  let tree;
  const instances = new Map();
  const calls = [];
  const navigation = [];
  const notifications = [];
  const timers = new Map();
  let timerId = 0;
  const session = () => ({
    data: {
      session: auth.user
        ? { user: auth.user, access_token: `jwt-${auth.user.id}` }
        : null,
    },
    error: null,
  });
  let getSession = async () => session();
  const hooks = {
    useState(initial) {
      const owner = current;
      const index = owner.index++;
      owner.hooks[index] ??= {
        value: typeof initial === "function" ? initial() : initial,
      };
      return [
        owner.hooks[index].value,
        (value) => {
          owner.hooks[index].value =
            typeof value === "function"
              ? value(owner.hooks[index].value)
              : value;
          dirty = true;
        },
      ];
    },
    useRef(initial) {
      const index = current.index++;
      current.hooks[index] ??= { current: initial };
      return current.hooks[index];
    },
    useEffect(setup, deps) {
      const index = current.index++;
      const old = current.hooks[index];
      const changed =
        !old?.deps ||
        !deps ||
        deps.some((item, i) => !Object.is(item, old.deps[i]));
      current.hooks[index] = { ...old, deps, setup, pending: changed };
    },
    useLayoutEffect(setup, deps) {
      hooks.useEffect(setup, deps);
      current.hooks[current.index - 1].layout = true;
    },
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const exports = {};
  const location = {
    pathname: "/invites/token-1",
    href: "https://moneko.io/invites/token-1",
    reload() {},
  };
  const document = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  };
  const window = { location, addEventListener() {}, removeEventListener() {} };
  const modules = {
    react: hooks,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@tanstack/react-router": {
      createFileRoute: () => (config) => ({
        ...config,
        useParams: () => ({ token }),
      }),
      useNavigate: () => (destination) => navigation.push(destination),
    },
    "framer-motion": { motion: new Proxy({}, { get: (_, name) => name }) },
    "lucide-react": { Clock: "clock" },
    "@/contexts/auth-context": { useAuth: () => auth },
    "@/lib/supabase": {
      supabase: {
        auth: { getSession: () => getSession() },
        functions: {
          invoke(name, options) {
            const request = deferred();
            calls.push({ name, options, ...request });
            return request.promise;
          },
        },
      },
    },
    "react-toastify": {
      toast: {
        success: (text) => notifications.push({ kind: "success", text }),
        error: (text) => notifications.push({ kind: "error", text }),
      },
    },
    "@/components/ui/apple-download-button": {
      AppleDownloadButton: "apple-download",
    },
    "@/components/ui/android-download-button": {
      AndroidDownloadButton: "android-download",
    },
  };
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(modules[name], `Unexpected import: ${name}`);
      return modules[name];
    },
    window,
    document,
    navigator: { userAgent: mobile ? "iPhone" : "Desktop" },
    AbortController,
    console: { error() {} },
    setTimeout: (callback, delay) => {
      timers.set(++timerId, { callback, delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
  });

  function render() {
    dirty = false;
    const seen = new Set();
    function visit(node, path) {
      if (!node || typeof node !== "object") return node;
      if (Array.isArray(node))
        return node.map((child, i) => visit(child, `${path}/${i}`));
      if (typeof node.type === "function") {
        const identity = `${path}:${node.key ?? ""}`;
        seen.add(identity);
        let instance = instances.get(identity);
        if (!instance) {
          instance = { hooks: [], index: 0 };
          instances.set(identity, instance);
        }
        current = instance;
        instance.index = 0;
        return visit(node.type(node.props), `${identity}/child`);
      }
      return {
        ...node,
        props: {
          ...node.props,
          children: visit(node.props.children, `${path}/children`),
        },
      };
    }
    tree = visit(jsx(exports.Route.component, {}), "root");
    for (const [identity, instance] of instances) {
      if (!seen.has(identity)) {
        instance.hooks.forEach((hook) => {
          if (hook.layout || !deferPassiveCleanup) hook.cleanup?.();
        });
        instances.delete(identity);
      }
    }
    for (const instance of instances.values()) {
      instance.hooks.forEach((hook) => {
        if (hook.pending) {
          hook.cleanup?.();
          hook.pending = false;
          hook.cleanup = hook.setup();
        }
      });
    }
    return tree;
  }
  const nodes = (node = tree) => {
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child));
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props.children ?? null)];
  };
  const text = (node = tree) => {
    if (Array.isArray(node)) return node.map((child) => text(child)).join("");
    if (node && typeof node === "object")
      return text(node.props.children ?? null);
    return node == null || typeof node === "boolean" ? "" : String(node);
  };
  async function flush() {
    for (let i = 0; i < 30; i++) {
      if (dirty) render();
      await Promise.resolve();
    }
  }
  return {
    calls,
    navigation,
    notifications,
    location,
    render,
    flush,
    text,
    click(label) {
      const button = nodes().find(
        (node) => node.type === "button" && text(node).includes(label),
      );
      assert.ok(button, `Missing button ${label}: ${text()}`);
      if (!button.props.disabled) button.props.onClick();
    },
    change({
      actor = auth.user?.id,
      nextToken = token,
      authLoading = auth.isLoading,
    } = {}) {
      auth = { user: actor ? { id: actor } : null, isLoading: authLoading };
      token = nextToken;
      location.pathname = `/invites/${token}`;
      dirty = true;
      render();
    },
    sessionReader(reader) {
      getSession = reader;
    },
    strictReplay() {
      for (const instance of instances.values()) {
        instance.hooks.forEach((hook) => {
          if (hook.setup) {
            hook.cleanup?.();
            hook.deps = undefined;
          }
        });
      }
      dirty = true;
      render();
    },
    fireTimer(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
    unmount() {
      for (const instance of instances.values())
        instance.hooks.forEach((hook) => hook.cleanup?.());
      instances.clear();
    },
  };
}

test("auth must resolve; guests return through the existing token-preserving login path", async () => {
  const h = harness({ user: null, loading: true });
  await h.flush();
  assert.equal(h.calls.length, 0);
  assert.equal(h.navigation.length, 0);
  h.change({ authLoading: false });
  await h.flush();
  assert.equal(h.calls.length, 0);
  assert.equal(h.navigation[0].to, "/login");
  assert.equal(h.navigation[0].search.redirect, "/invites/token-1");
  h.change({ actor: "actor-a" });
  await h.flush();
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  assert.equal(h.calls[1].name, "households-accept-invite");
});

for (const role of ["member", "admin"]) {
  test(`reusable ${role} links automatically join once, with immediate pending and backend-confirmed success`, async () => {
    const h = harness();
    await h.flush();
    h.strictReplay();
    await h.flush();
    assert.equal(h.calls.length, 1);
    h.calls[0].resolve({
      data: validation({ invited_role: role }),
      error: null,
    });
    await h.flush();
    assert.equal(h.calls.length, 2);
    assert.equal(h.calls[1].name, "households-accept-invite");
    assert.equal(h.calls[1].options.body.token, "token-1");
    assert.equal(
      h.calls[1].options.headers.Authorization,
      "Bearer jwt-actor-a",
    );
    assert.match(h.text(), /Joining/);
    assert.doesNotMatch(h.text(), /You're In/);
    assert.equal(h.notifications.length, 0);
    h.change();
    h.strictReplay();
    await h.flush();
    assert.equal(h.calls.length, 2);
    h.calls[1].resolve(accepted);
    await h.flush();
    assert.match(h.text(), /You're In/);
    assert.match(h.text(), /家族/);
    h.click("Go to Dashboard");
    assert.equal(h.navigation.at(-1).to, "/dashboard");
    h.click("Open in Moneko App");
    assert.equal(h.location.href, "moneko://households/join?token=token-1");
    h.fireTimer(2500);
    await h.flush();
    assert.equal(h.calls.length, 2);
  });
}

test("personalized invitations retain message and deliberate confirmation; double clicks coalesce", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({
    data: validation({
      is_reusable: false,
      personal_message: "一緒に管理しましょう",
    }),
    error: null,
  });
  await h.flush();
  assert.equal(h.calls.length, 1);
  assert.match(h.text(), /一緒に管理しましょう/);
  h.click("Accept Invitation");
  h.click("Accept Invitation");
  await h.flush();
  assert.equal(h.calls.length, 2);
  assert.match(h.text(), /Joining/);
  h.calls[1].resolve(accepted);
  await h.flush();
  assert.match(h.text(), /You're In/);
});

for (const metadata of [
  { is_reusable: undefined },
  { invited_role: "owner" },
  { invited_role: undefined },
  { is_reusable: "true" },
  { is_reusable: null },
  { invited_role: null },
]) {
  test(`unvalidated mode/role never autoaccepts: ${JSON.stringify(metadata)}`, async () => {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({ data: validation(metadata), error: null });
    await h.flush();
    assert.equal(h.calls.length, 1);
    assert.doesNotMatch(h.text(), /You're In/);
    assert.match(h.text(), /Invalid response from server/);
  });
}

test("HTTP 409 ALREADY_MEMBER validation is success with household details and no acceptance request", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve(
    httpError({
      ...validation(),
      valid: false,
      error_code: "ALREADY_MEMBER",
      error: "Already joined",
    }),
  );
  await h.flush();
  assert.equal(h.calls.length, 1);
  assert.match(h.text(), /You're In/);
  assert.match(h.text(), /家族/);
  assert.doesNotMatch(h.text(), /Invalid Invitation/);
});

test("already-member acceptance race is success; malformed acceptance never claims success", async () => {
  for (const response of [
    httpError({ error_code: "ALREADY_MEMBER" }),
    { data: {}, error: null },
  ]) {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({ data: validation(), error: null });
    await h.flush();
    assert.equal(h.calls.length, 2);
    h.calls[1].resolve(response);
    await h.flush();
    if (response.error) assert.match(h.text(), /You're In/);
    else assert.doesNotMatch(h.text(), /You're In/);
  }
});

test("autoaccept failure stays failed until deliberate retry; retry remains pending until acknowledgement", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  assert.equal(h.calls.length, 2);
  h.calls[1].resolve({ data: null, error: new Error("Network unavailable") });
  await h.flush();
  h.change();
  h.strictReplay();
  await h.flush();
  assert.equal(h.calls.length, 2);
  assert.match(h.text(), /Network unavailable/);
  h.click("Try Again");
  h.click("Try Again");
  await h.flush();
  assert.equal(h.calls.length, 3);
  assert.match(h.text(), /Joining/);
  h.calls[2].resolve(accepted);
  await h.flush();
  assert.match(h.text(), /You're In/);
});

for (const change of [
  { actor: "actor-b" },
  { nextToken: "token-2" },
  { actor: null },
]) {
  test(`scope change clears prior data immediately and ignores delayed acceptance: ${JSON.stringify(change)}`, async () => {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({ data: validation({}, "Private A"), error: null });
    await h.flush();
    assert.equal(h.calls.length, 2);
    h.change(change);
    assert.doesNotMatch(h.text(), /Private A/);
    h.calls[1].resolve(accepted);
    await h.flush();
    assert.doesNotMatch(h.text(), /You're In|Private A/);
    assert.equal(
      h.notifications.filter((item) => item.kind === "success").length,
      0,
    );
  });
}

test("stale validation cannot render, toast, or start acceptance for another token/actor", async () => {
  const h = harness();
  await h.flush();
  h.change({ actor: "actor-b", nextToken: "token-2" });
  await h.flush();
  h.calls[0].resolve({ data: validation({}, "Private A"), error: null });
  await h.flush();
  assert.equal(h.calls.length, 2);
  assert.doesNotMatch(h.text(), /Private A/);
  h.calls[1].resolve({ data: validation({}, "Private B"), error: null });
  await h.flush();
  assert.equal(h.calls[2].options.body.token, "token-2");
  assert.equal(h.calls[2].options.headers.Authorization, "Bearer jwt-actor-b");
});

test("session actor mismatch and unmount during session lookup dispatch no acceptance", async () => {
  for (const unmount of [false, true]) {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({
      data: validation({ is_reusable: false }),
      error: null,
    });
    await h.flush();
    const pending = deferred();
    h.sessionReader(() => pending.promise);
    h.click("Accept Invitation");
    await h.flush();
    assert.match(h.text(), /Joining/);
    if (unmount) h.unmount();
    pending.resolve({
      data: {
        session: { user: { id: "actor-b" }, access_token: "jwt-actor-b" },
      },
      error: null,
    });
    await h.flush();
    assert.equal(h.calls.length, 1);
    assert.equal(
      h.notifications.filter((item) => item.kind === "success").length,
      0,
    );
  }
});

test("mobile app fallback waits for authentication and never validates as a guest", async () => {
  const h = harness({ user: null, loading: true, mobile: true });
  await h.flush();
  assert.equal(h.location.href, "moneko://households/join?token=token-1");
  h.strictReplay();
  await h.flush();
  h.fireTimer(2500);
  await h.flush();
  assert.equal(h.calls.length, 0);
  h.change({ authLoading: false });
  await h.flush();
  assert.equal(h.calls.length, 0);
  assert.equal(h.navigation.at(-1).search.redirect, "/invites/token-1");
});

test("slow validation transitions to Joining instead of retaining the validation timeout panel", async () => {
  const h = harness();
  await h.flush();
  h.fireTimer(10000);
  await h.flush();
  assert.match(h.text(), /Taking longer than expected/);
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  assert.match(h.text(), /Joining/);
  assert.doesNotMatch(h.text(), /Taking longer than expected/);
});

test("validation failures never auto-retry and explicit retry revalidates before joining", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: null, error: new Error("Offline") });
  await h.flush();
  h.strictReplay();
  await h.flush();
  assert.equal(h.calls.length, 1);
  h.click("Try Again");
  h.click("Try Again");
  await h.flush();
  assert.equal(h.calls.length, 2);
  h.calls[1].resolve({ data: validation(), error: null });
  await h.flush();
  assert.equal(h.calls[2].name, "households-accept-invite");
});

test("revoked, expired, malformed validation and wrong-space acknowledgement never succeed", async () => {
  for (const data of [
    { valid: false, error_code: "REVOKED", error: "Revoked" },
    { valid: false, error_code: "EXPIRED", error: "Expired" },
    { ...validation(), valid: "true" },
  ]) {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({ data, error: null });
    await h.flush();
    assert.equal(h.calls.length, 1);
    assert.doesNotMatch(h.text(), /You're In/);
  }
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  h.calls[1].resolve({
    ...accepted,
    data: { ...accepted.data, household_id: "different-space" },
  });
  await h.flush();
  assert.doesNotMatch(h.text(), /You're In/);
});

test("a delayed prior-actor rejection cannot publish an error or toast into the new actor", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  h.change({ actor: "actor-b" });
  h.calls[1].resolve({ data: null, error: new Error("Private A failure") });
  await h.flush();
  assert.doesNotMatch(h.text(), /Private A failure/);
  assert.equal(h.notifications.length, 0);
});

test("scope ownership is revoked at commit before deferred passive cleanup can leak a success toast", async () => {
  const h = harness({ deferPassiveCleanup: true });
  await h.flush();
  h.calls[0].resolve({ data: validation({}, "Private A"), error: null });
  await h.flush();
  h.change({ actor: "actor-b" });
  h.calls[1].resolve(accepted);
  await h.flush();
  assert.doesNotMatch(h.text(), /Private A|You're In/);
  assert.equal(h.notifications.length, 0);
});

for (const [label, metadata, role] of [
  ["both fields absent", { personal_message: "Legacy message" }, "an admin"],
  ["role absent", { is_reusable: false }, "an admin"],
  ["mode absent", { invited_role: "member" }, "a member"],
  ["invite metadata absent", undefined, "an admin"],
]) {
  test(`legacy ${label} preserves manual acceptance with safe defaults`, async () => {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({
      data: { ...validation(), invite: metadata },
      error: null,
    });
    await h.flush();
    assert.equal(h.calls.length, 1);
    assert.match(h.text(), new RegExp(`You'll join as ${role}`));
    if (metadata?.personal_message) assert.match(h.text(), /Legacy message/);
    h.click("Accept Invitation");
    await h.flush();
    assert.equal(h.calls.length, 2);
    h.calls[1].resolve(accepted);
    await h.flush();
    assert.match(h.text(), /You're In/);
  });
}

test("legacy already-member validation succeeds without the new metadata fields", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve(
    httpError({
      ...validation(),
      invite: { personal_message: null },
      valid: false,
      error_code: "ALREADY_MEMBER",
    }),
  );
  await h.flush();
  assert.equal(h.calls.length, 1);
  assert.match(h.text(), /You're In/);
});

for (const isReusable of [true, false]) {
  test(`${isReusable ? "automatic" : "manual"} acceptance times out, aborts, and retries only on deliberate action`, async () => {
    const h = harness();
    await h.flush();
    h.calls[0].resolve({
      data: validation({ is_reusable: isReusable }),
      error: null,
    });
    await h.flush();
    if (!isReusable) h.click("Accept Invitation");
    await h.flush();
    assert.match(h.text(), /Joining/);
    assert.equal(h.calls.length, 2);
    h.fireTimer(30000);
    await h.flush();
    assert.match(h.text(), /timed out/i);
    assert.doesNotMatch(h.text(), /You're In|Joining\.\.\./);
    assert.equal(h.calls[1].options.signal.aborted, true);
    h.change();
    h.strictReplay();
    await h.flush();
    assert.equal(h.calls.length, 2);
    h.click("Try Again");
    h.click("Try Again");
    await h.flush();
    assert.equal(h.calls.length, 3);
    assert.equal(h.calls[2].options.body.token, "token-1");
    assert.equal(h.calls[2].options.signal.aborted, false);
    h.calls[1].resolve(accepted);
    await h.flush();
    assert.match(h.text(), /Joining/);
    assert.equal(
      h.notifications.filter((item) => item.kind === "success").length,
      0,
    );
    h.calls[2].resolve({
      ...accepted,
      data: { ...accepted.data, member_created: false },
    });
    await h.flush();
    h.fireTimer(30000);
    await h.flush();
    assert.match(h.text(), /You're In/);
    assert.equal(
      h.notifications.filter((item) => item.kind === "success").length,
      1,
    );
  });
}

test("acceptance timeout also bounds session lookup and prevents delayed dispatch", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: validation({ is_reusable: false }), error: null });
  await h.flush();
  const session = deferred();
  h.sessionReader(() => session.promise);
  h.click("Accept Invitation");
  await h.flush();
  h.fireTimer(30000);
  await h.flush();
  assert.match(h.text(), /timed out/i);
  session.resolve({
    data: { session: { user: { id: "actor-a" }, access_token: "jwt-actor-a" } },
    error: null,
  });
  await h.flush();
  assert.equal(h.calls.length, 1);
  assert.doesNotMatch(h.text(), /You're In/);
});

test("a stalled acceptance error body cannot hold joining indefinitely or apply late success", async () => {
  const h = harness();
  await h.flush();
  h.calls[0].resolve({ data: validation(), error: null });
  await h.flush();
  const body = deferred();
  h.calls[1].resolve({
    data: null,
    error: { context: { clone: () => ({ json: () => body.promise }) } },
  });
  await h.flush();
  h.fireTimer(30000);
  await h.flush();
  assert.match(h.text(), /timed out/i);
  body.resolve({ error_code: "ALREADY_MEMBER" });
  await h.flush();
  assert.doesNotMatch(h.text(), /You're In/);
  assert.equal(
    h.notifications.filter((item) => item.kind === "success").length,
    0,
  );
});
