
# Moneko Mobile Migration Dossier — Onboarding (AI Intro + Goal Creation)

Status: Draft for engineering review
Scope: Onboarding index route (/src/routes/onboarding/index.tsx) and all recursively referenced children used by this page.

Table of contents
- 1. Overview
- 2. API reference (OpenAPI 3.0 — inferred additions for onboarding)
- 3. Current web frontend handling
- 4. Flutter implementation guide
- 5. Real-time, background, and platform features
- 6. Testing, CI/CD, and observability
- 7. Migration and verification plan
- 8. Mapping matrix (endpoint → web usage → Flutter mapping)
- 9. Missing information and asks

---

1. Overview
The onboarding page provides an AI-first experience (no login required) where users can:
- Chat with the AI “onboarding coach” (ai-onboarding-coach function)
- Select a goal template and complete a questionnaire (QuestionnaireFlow)
- Generate a personalized financial goal and view a presentation (GoalPresentationFlow)
- If unauthenticated, optionally register to save the goal; guest goals are stored via cookie and later migrated on login

Core web files analyzed
- /src/routes/onboarding/index.tsx
- /src/components/onboarding/ai-intro-component.tsx
- /src/components/chat/chat-conversation-display.tsx (used in intro)
- /src/components/goal-tracker/questionnaire/QuestionnaireFlow.tsx
- /src/components/goal-tracker/goal-presentation/*
- /src/utils/activity-logger-clone.ts

Platform targets: iOS/Android; same patterns as dashboard (supabase_flutter, dio/retrofit, Riverpod)

---

2. API Reference (inferred endpoints relevant to onboarding)
Base URL: https://{project_ref}.supabase.co/functions/v1
Auth: apikey header required; Authorization bearer optional (guest allowed for ai-onboarding-coach and create-goal flow if designed that way). Validate with backend.

Endpoints
1) POST /ai-onboarding-coach
- Purpose: Generate onboarding coach responses; supports first message (welcome) and withWelcomeAndResponse mode when initial query is provided.
- Request (examples):
  - { "isFirstMessage": true }
  - { "message": "I want a retirement plan" }
  - { "message": "...", "withWelcomeAndResponse": true }
- Response (examples):
  - { "response": "Welcome ..." }
  - { "welcome": "Hi...", "response": "Great, let's start..." }
- Errors: 4xx/5xx JSON message; FE falls back with a canned text.

2) POST /create-goal-with-ai (inferred from useCreateGoalWithAI hook)
- Purpose: Create a new financial goal using questionnaire answers or a preset profile.
- Request: { goalType: string, questionnaireAnswers: object, userId: string|null, isPresetProfile?: boolean, presetProfileType?: string }
- Response: GoalCreationResult with fields { goal, milestones[], insights[], strategy, advisorMessages? }
- Guest handling: if userId null, FE stores cookie moneko-guest-goals with created goal id for later migration.

3) POST /financial-health-profile (update/create)
- Request: { userId: string|null, quizAnswers: object, isPartialUpdate: boolean }
- Response: { success: boolean, profile?: {id,...} }
- Used after goal creation to store questionnaire answers (regular profile subset) for future personalization. For guest users, FE stores moneko-guest-profiles cookie.

4) GET /user-activities and POST activity-logger (already documented in dashboard; used when migrating guest goals to log ActivityActions.GOAL_CREATED)

Assumptions and validations required
- Confirm create-goal-with-ai exact path and payload. In code it’s abstracted by useCreateGoalWithAI.
- ai-onboarding-coach response fields welcome/response confirmed; FE uses supabase.supabaseUrl + functions/v1 path with Supabase key in Authorization (ensure minimal privileges for anon key).
- financial-health-profile body shape as per QuestionnaireFlow.

---

3. Current web frontend handling
- /src/routes/onboarding/index.tsx
  - Creates SEO metadata; renders full-screen AIIntroComponent; no auto-redirect for authenticated users
- AIIntroComponent
  - Handles: chat state, timers, timeouts, send message to ai-onboarding-coach, welcome first load
  - Goal creation flow: opens QuestionnaireFlow (Modal), then GoalPresentationFlow
  - Guest goal migration on login: reads cookie moneko-guest-goals, updates financial_goals user_id, logs activity via logUserActivity
- QuestionnaireFlow
  - Two modes: customized (full questionnaire), faster (preset profile)
  - Validates inputs, generates preset answers when faster mode
  - Calls useCreateGoalWithAI to create goal
  - After success: calls financial-health-profile with quizAnswers for profile persistence (partial update allowed)
- GoalPresentationFlow
  - Paged modal showing summary, insights, next steps, final CTA to register or proceed to tracker

UI/UX rules
- Anonymous onboarding allowed; minimal footer labels convey “No Login, AI Coach, Free”
- Registration prompt shown after goal created for guests; can skip to preview plan
- On register intent, navigate to /register?redirect=/dashboard/tracker/{goalId}

---

4. Flutter implementation guide (key excerpts)

Recommended stack
- supabase_flutter for auth/session
- dio + retrofit for HTTP
- Riverpod for state caching; replicate TanStack Query semantics (stale time, retries)

Dart models (json_serializable)

// lib/models/onboarding_chat_models.dart
import 'package:json_annotation/json_annotation.dart';
part 'onboarding_chat_models.g.dart';

@JsonSerializable()
class OnboardingCoachResponseDto {
  final String? welcome; // present when withWelcomeAndResponse
  final String? response;
  OnboardingCoachResponseDto({this.welcome, this.response});
  factory OnboardingCoachResponseDto.fromJson(Map<String, dynamic> json) => _$OnboardingCoachResponseDtoFromJson(json);
  Map<String, dynamic> toJson() => _$OnboardingCoachResponseDtoToJson(this);
}

// lib/models/goal_creation_models.dart
@JsonSerializable(explicitToJson: true)
class GoalCreationResultDto {
  final Map<String, dynamic>? goal;
  final List<Map<String, dynamic>>? milestones;
  final List<Map<String, dynamic>>? insights;
  final String? strategy;
  final Map<String, dynamic>? advisorMessages;
  GoalCreationResultDto({this.goal, this.milestones, this.insights, this.strategy, this.advisorMessages});
  factory GoalCreationResultDto.fromJson(Map<String, dynamic> json) => _$GoalCreationResultDtoFromJson(json);
  Map<String, dynamic> toJson() => _$GoalCreationResultDtoToJson(this);
}

Retrofit APIs

// lib/api/onboarding_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
import '../models/onboarding_chat_models.dart';
import '../models/goal_creation_models.dart';
part 'onboarding_api.g.dart';

@RestApi()
abstract class OnboardingApi {
  factory OnboardingApi(Dio dio, {String baseUrl}) = _OnboardingApi;

  @POST('/ai-onboarding-coach')
  Future<OnboardingCoachResponseDto> sendCoach(@Body() Map<String, dynamic> body);

  @POST('/create-goal-with-ai')
  Future<GoalCreationResultDto> createGoal(@Body() Map<String, dynamic> body);

  @POST('/financial-health-profile')
  Future<Map<String, dynamic>> saveProfile(@Body() Map<String, dynamic> body);
}

Repositories

class OnboardingRepository {
  OnboardingRepository(this._api);
  final OnboardingApi _api;

  Future<List<Map<String, dynamic>>> sendInitial(String? msg) async {
    if (msg == null || msg.trim().isEmpty) {
      final res = await _api.sendCoach({'isFirstMessage': true});
      return [if (res.response != null) {'role':'assistant','content': res.response}];
    } else {
      final res = await _api.sendCoach({'message': msg, 'withWelcomeAndResponse': true});
      return [
        {'role':'user','content': msg},
        if (res.welcome != null) {'role':'assistant','content': res.welcome},
        if (res.response != null) {'role':'assistant','content': res.response},
      ];
    }
  }

  Future<Map<String, dynamic>> sendMessage(String content) async {
    final res = await _api.sendCoach({'message': content});
    return {'role':'assistant','content': res.response ?? ""};
  }

  Future<GoalCreationResultDto> createGoal({
    required String goalType,
    required Map<String, dynamic> answers,
    String? userId,
    bool isPresetProfile = false,
    String? presetProfileType,
  }) {
    return _api.createGoal({
      'goalType': goalType,
      'questionnaireAnswers': answers,
      'userId': userId,
      if (isPresetProfile) 'isPresetProfile': true,
      if (presetProfileType != null) 'presetProfileType': presetProfileType,
    });
  }

  Future<void> saveFinancialProfile({String? userId, required Map<String, dynamic> quizAnswers}) async {
    await _api.saveProfile({'userId': userId, 'quizAnswers': quizAnswers, 'isPartialUpdate': true});
  }
}

Riverpod wiring

final onboardingApiProvider = Provider((ref) => OnboardingApi(ref.watch(dioProvider))); // dioProvider from previous docs
final onboardingRepoProvider = Provider((ref) => OnboardingRepository(ref.watch(onboardingApiProvider)));

final onboardingChatProvider = StateNotifierProvider<OnboardingChatController, AsyncValue<List<Map<String, dynamic>>>>((ref) {
  return OnboardingChatController(ref.read);
});

class OnboardingChatController extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  OnboardingChatController(this._read): super(const AsyncValue.data([]));
  final Reader _read;

  Future<void> init({String? initialMessage}) async {
    state = const AsyncValue.loading();
    try {
      final msgs = await _read(onboardingRepoProvider).sendInitial(initialMessage);
      state = AsyncValue.data(msgs);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> send(String content) async {
    final current = [...(state.value ?? [])];
    current.add({'role':'user','content': content});
    state = AsyncValue.data(current);
    try {
      final aiMsg = await _read(onboardingRepoProvider).sendMessage(content);
      state = AsyncValue.data([...current, aiMsg]);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

Guest goal migration
- Mirror the cookie-based migration by persisting guest goal IDs in SharedPreferences (moneko_guest_goals) and, upon login, call a migration function that:
  - Fetches the goal by ID where user_id is null
  - Updates the goal’s user_id to the authenticated user
  - Logs ActivityActions.GOAL_CREATED via user-activities logger endpoint
  - Clears the stored list

Token/headers
- Add apikey header and Authorization bearer for authenticated requests. The onboarding coach can operate without Authorization (confirm with backend).

Timeout/backoff
- Implement 30s send timeout as in web; use Dio cancel token. Retry on 429/5xx with backoff.

---

5. Real-time, background, platform features
- Not required for onboarding chat. The guest migration will subsequently make user-activities INSERT; the existing realtime listener on dashboard will update timeline after login.

---

6. Testing, CI/CD, observability
- Unit: parse OnboardingCoachResponseDto, GoalCreationResultDto
- Integration: mock /ai-onboarding-coach happy path and error fallback
- Contract: add /ai-onboarding-coach and /create-goal-with-ai to the OpenAPI and generate mock server
- Telemetry: log message send durations, backend latency; capture errors

---

7. Migration and verification plan
- MVP:
  1) Implement onboarding screen with chat and initial message logic
  2) Implement QuestionnaireFlow (customized + faster) and GoalPresentationFlow
  3) Guest goal cookie equivalent and migration on login
- Verification:
  - Initial welcome shown when no initialMessage; dual message path when provided
  - 30s timeout resets UI state; error fallback message shown
  - Goal creation returns summary/insights/milestones; presentation shows CTA
  - Registration redirect to /dashboard/tracker/{goalId} after account creation

---

8. Mapping matrix
| Endpoint | Web callsite(s) | Flutter module | Screen | Repository | Provider |
|---|---|---|---|---|---|
| POST /ai-onboarding-coach | AIIntroComponent (init/send) | features/onboarding | OnboardingScreen | OnboardingRepository | onboardingChatProvider |
| POST /create-goal-with-ai | QuestionnaireFlow (create) | features/goal | QuestionnaireScreen | OnboardingRepository | N/A (mutation) |
| POST /financial-health-profile | QuestionnaireFlow (post-create) | features/profile | Background save | OnboardingRepository | N/A (mutation) |
| GET /user-activities (POST logger) | activity-logger-clone (migration) | features/activities | Background after login | ActivitiesRepository | activitiesProvider (already) |

---

9. Missing information and asks
- Confirm exact create-goal-with-ai endpoint name and payload fields
- Confirm ai-onboarding-coach guest access and rate limits
- Provide sample GoalCreationResult payload (goal, milestones, insights, strategy, advisorMessages)
- Confirm financial-health-profile expected fields

Final checklist
- [ ] API contracts validated
- [ ] Flutter DTOs and Retrofit stubs compile
- [ ] Onboarding chat timeout/retry behavior verified
- [ ] Questionnaire validation parity with web
- [ ] Goal presentation parity and navigation to tracker
- [ ] Guest migration flow verified on login
