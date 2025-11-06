
# Moneko Mobile Migration Dossier — Dashboard Module

Status: Draft for engineering review
Scope: Dashboard shell (/src/routes/dashboard/route.tsx) and Dashboard Home (/src/routes/dashboard/_layout.index.tsx) including all recursively referenced hooks/services/components used to render data and drive user actions on these screens

Table of contents
- 1. Overview
- 2. API reference (OpenAPI 3.0 — inferred from web code)
- 3. Current web frontend handling
- 4. Flutter implementation guide
- 5. Real-time, background, and platform features
- 6. Testing, CI/CD, and observability
- 7. Migration and verification plan
- 8. Mapping matrix (endpoint → web usage → Flutter mapping)
- 9. Missing information and asks
- 10. Recommended Flutter app structure

1. Overview
This dossier enables a Flutter team to implement a production-ready Dashboard experience that reuses the exact backend (Supabase Edge Functions + Postgres) used by the web app. The Dashboard comprises a shell with navigation, AI chat drawer, in-page guidance, right sidebar, and a Dashboard Home view that aggregates user activities, gamification, courses, and financial health profile.

Architecture summary
- Backend: Supabase
  - Authentication: GoTrue (JWT session) managed client-side
  - Data: Postgres (tables e.g., user_activities, financial_goals, …)
  - Edge Functions (Functions URL: https://<project-ref>.supabase.co/functions/v1)
- Web FE patterns to port
  - Data fetching/caching: TanStack Query (queries for dashboard views, user activities, courses, subscription, profile, XP)
  - Realtime: Supabase Realtime channel on user_activities (Postgres changes)
  - Auth context + chat contexts
  - Route protection: ProtectedRouteSubscription component
- Mobile FE patterns (recommended)
  - State/data: Riverpod + dio/retrofit; use Providers mirroring TanStack Query semantics (cache/stale, retry, refresh)
  - Auth: supabase_flutter for session and token auto-refresh
  - Networking: dio with interceptors that inject apikey and Authorization JWT; robust retry/backoff + ETag/conditional requests where applicable
  - Realtime: supabase_flutter RealtimeChannel or web_socket_channel for custom needs

Platform targets
- iOS/Android: fully supported with supabase_flutter + dio
- Web: Flutter web can reuse the same APIs; beware of CORS on Edge Functions
- Desktop: Mac/Windows/Linux supported (no platform-specific code required for dashboard features)

2. API reference (OpenAPI 3.0 — inferred)
Notes
- This spec is inferred from the web codebase in: src/routes/dashboard/*, hooks/, services/, lib/api/* and supabase/functions/*
- All fields marked as inferred must be validated against backend. Provide sample responses from staging/prod or the Edge Function handlers.
- Base URL for all endpoints: https://{SUPABASE_PROJECT_REF}.supabase.co/functions/v1
- Auth
  - Header apikey: {SUPABASE_ANON_PUBLIC_KEY} (required for all invocations)
  - Header Authorization: Bearer {access_token} (required for user-specific resources; guests allowed on some endpoints)

OpenAPI 3.0 YAML
```yaml
openapi: 3.0.3
info:
  title: Moneko Mobile (Dashboard) — Supabase Edge Functions
  version: 0.1.0-inferred
  description: Inferred contract for all endpoints used by Dashboard shell and Home.
servers:
  - url: https://{project_ref}.supabase.co/functions/v1
    variables:
      project_ref:
        default: pbopcsmrcykdzbilpilf
        description: Supabase project ref
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    supabaseApiKey:
      type: apiKey
      in: header
      name: apikey
  parameters:
    UserIdQuery:
      name: userId
      in: query
      schema: { type: string }
      required: true
    UserIdBody:
      name: userId
      in: query
      schema: { type: string }
  responses:
    Unauthorized:
      description: Missing/invalid token
      content:
        application/json:
          schema:
            type: object
            properties:
              error: { type: string }
    DefaultError:
      description: Error payload
      content:
        application/json:
          schema:
            type: object
            properties:
              error: { type: string }
              code: { type: string }
security:
  - supabaseApiKey: []
  - bearerAuth: []
paths:
  /dashboard-views:
    post:
      summary: Dashboard views operations (action in body)
      description: Action one of [get-all, get-by-id, get-default, create-from-template, create-with-widgets]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                action:
                  type: string
                  enum: [get-all, get-by-id, get-default, create-from-template, create-with-widgets]
                userId: { type: string }
                viewId: { type: string }
                templateId: { type: string }
                viewName: { type: string }
                description: { type: string }
              required: [action]
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                oneOf:
                  - type: object
                    properties:
                      views:
                        type: array
                        items: { $ref: '#/components/schemas/DashboardView' }
                  - type: object
                    properties:
                      view: { $ref: '#/components/schemas/DashboardView' }
                      widgets:
                        type: array
                        items: { $ref: '#/components/schemas/DashboardWidget' }
        '401': { $ref: '#/components/responses/Unauthorized' }
    put:
      summary: Update dashboard view or update-with-widgets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                action:
                  type: string
                  enum: [update, update-with-widgets]
                userId: { type: string }
                viewId: { type: string }
                name: { type: string }
                description: { type: string }
                widgets:
                  type: array
                  items:
                    type: object
                    properties:
                      id: { type: string }
                      title: { type: string }
                      type: { type: string }
                      icon: { type: string }
                      column_span: { type: integer, enum: [1,2] }
                      row_span: { type: integer, enum: [1,2,3,4] }
                      data: { type: object }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  view: { $ref: '#/components/schemas/DashboardView' }
                  widgets:
                    type: array
                    items: { $ref: '#/components/schemas/DashboardWidget' }
    delete:
      summary: Delete a dashboard view
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                action: { type: string, enum: [delete] }
                userId: { type: string }
                viewId: { type: string }
      responses:
        '200':
          description: Deleted
  /dashboard-templates:
    get:
      summary: List dashboard templates
      responses:
        '200':
          description: Templates
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/DashboardTemplate' }
  /user-activities:
    get:
      summary: List user activities
      parameters:
        - name: user_id
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Activities
          content:
            application/json:
              schema:
                type: object
                properties:
                  activities:
                    type: array
                    items: { $ref: '#/components/schemas/ActivityRecord' }
  /get-financial-health-profile:
    post:
      summary: Get financial health profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                userId: { type: string }
      responses:
        '200':
          description: Profile or null
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  profile: { $ref: '#/components/schemas/FinancialHealthProfile' }
  /get-user-courses:
    post:
      summary: Get user courses
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                userId: { type: string }
      responses:
        '200':
          description: Courses
          content:
            application/json:
              schema:
                type: object
                properties:
                  courses:
                    type: array
                    items: { $ref: '#/components/schemas/Course' }
  /get-user-xp:
    post:
      summary: Get total XP for user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                user_id: { type: string }
      responses:
        '200':
          description: XP
          content:
            application/json:
              schema:
                type: object
                properties:
                  total_xp: { type: integer }
  /get-subscription:
    get:
      summary: Get subscription bundle
      parameters:
        - $ref: '#/components/parameters/UserIdQuery'
      responses:
        '200':
          description: Subscription bundle
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubscriptionData'
  /chat_sessions:
    get:
      summary: List or get active conversation by AI role
      parameters:
        - name: model
          in: query
          required: true
          schema: { type: string, enum: [advisor, educator, goal_tracker] }
      responses:
        '200':
          description: Session
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Conversation' }
    post:
      summary: Create conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                session_id: { type: string }
                messages:
                  type: array
                  items: { $ref: '#/components/schemas/Message' }
                model: { type: string }
      responses:
        '200':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Conversation' }
    delete:
      summary: Delete conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                id: { type: string }
      responses:
        '200':
          description: Deleted
  /chat_sessions/{id}:
    get:
      summary: Get conversation by id
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Conversation with messages
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Conversation' }
  /chat_stream:
    post:
      summary: Send chat message (guest or auth)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string }
                conversationId: { type: string, nullable: true }
                userId: { type: string, nullable: true }
                sessionId: { type: string, nullable: true }
                model: { type: string }
                userProfile: { type: string, nullable: true }
                goalContext: { type: object, nullable: true }
                isGlobalMode: { type: boolean, nullable: true }
                goalId: { type: string, nullable: true }
                goal: { type: object, nullable: true }
      responses:
        '200':
          description: AI response
          content:
            application/json:
              schema:
                type: object
                properties:
                  response: { type: string }
                  messageId: { type: string }
                  conversationId: { type: string }
                  generatedLessons: { type: object }
  /chat_optimized:
    post:
      summary: Send message to existing conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                conversationId: { type: string }
                userMessage: { type: string }
                userId: { type: string, nullable: true }
                userProfile: { type: string, nullable: true }
      responses:
        '200':
          description: AI response
          content:
            application/json:
              schema:
                type: object
                properties:
                  response: { type: string }
                  messageId: { type: string }
  /update_guest_session:
    post:
      summary: Link guest session to user after login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                sessionId: { type: string }
                userId: { type: string }
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
  /predict-user-responses:
    post:
      summary: Get suggested replies
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message: { type: string }
                history:
                  type: array
                  items: { type: object }
      responses:
        '200':
          description: Suggestions
          content:
            application/json:
              schema:
                type: array
                items: { type: string }
components:
  schemas:
    DashboardView:
      type: object
      properties:
        id: { type: string }
        user_id: { type: string }
        name: { type: string }
        description: { type: string, nullable: true }
        created_at: { type: string }
        updated_at: { type: string }
    DashboardWidget:
      type: object
      properties:
        id: { type: string }
        view_id: { type: string }
        type: { type: string }
        title: { type: string }
        icon: { type: string }
        column_span: { type: integer, enum: [1,2] }
        row_span: { type: integer, enum: [1,2,3,4] }
        data: { type: object, nullable: true }
        created_at: { type: string }
        updated_at: { type: string }
    DashboardTemplate:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string, nullable: true }
        category: { type: string, nullable: true }
    ActivityRecord:
      type: object
      properties:
        id: { type: string }
        created_at: { type: string }
        activity:
          type: object
          properties:
            type: { type: string }
            action: { type: string }
            source: { type: string }
            metadata: { type: object }
    FinancialHealthProfile:
      type: object
      additionalProperties: true # inferred wide schema
    Course:
      type: object
      additionalProperties: true # inferred wide schema
    SubscriptionData:
      type: object
      properties:
        subscription: { type: object, nullable: true }
        features:
          type: array
          items:
            type: object
        payment_method:
          type: object
          nullable: true
        invoices:
          type: array
          items: { type: object }
        days_until_next_payment: { type: integer, nullable: true }
```

Assumptions and validations required
- Dashboard templates schema fields are inferred. Validate id/name/description/category.
- Course and FinancialHealthProfile shapes are wide/inferred; provide JSON samples from backend.
- Activities.metadata may include goalId/goalTitle/lesson_id/xp etc.; confirm naming.
- chat_stream, chat_optimized payloads and fields next_actions, cache_refresh_needed exist per code; include in final spec if guaranteed.
- Rate limits and idempotency not visible in FE; confirm with backend team. Supabase Functions default concurrency/timeout apply.

3. Current web frontend handling
- Data entry points
  - Dashboard shell (/src/routes/dashboard/route.tsx)
    - Wraps children with ProtectedRouteSubscription; loads breadcrumbs; controls AI chat drawer; renders RightSidebar (advisor/educator agents)
  - Dashboard Home (/src/routes/dashboard/_layout.index.tsx)
    - Imports and uses:
      - useDashboardData: aggregates dashboard state (useDashboard Redux slice + queries)
      - useSubscription(user.id): GET get-subscription?userId=…
      - useCompletedLessons(user.id): POST get-user-completed-lessons (used by learning, referenced here via imports but not called directly in home UI)
      - useAIChat: opens chat drawer
      - GuidanceTestPanel/Timeline etc. — use activities profile/stats
- Queries and caches (TanStack Query)
  - useUserActivities: GET user-activities?user_id=…; staleTime: 5m; Realtime subscription invalidates cache on INSERT
  - useFinancialHealthProfile(userId): POST get-financial-health-profile
  - useUserTotalXp(userId): POST get-user-xp
  - useUserCourses(userId): POST get-user-courses
  - useAllDashboardViews/useDashboardViewById: POST dashboard-views with actions
  - useAllDashboardTemplates: GET dashboard-templates
  - useSubscription(userId): GET get-subscription?userId=… (staleTime 0 to force fresh read)
- Realtime
  - Supabase channel postgres_changes on user_activities INSERT filtered by user_id; triggers query invalidation
- Auth and routing
  - useAuth context supplies user and session; ProtectedRouteSubscription redirects unauthenticated users to /onboarding
- Error handling
  - Queries throw or surface error states to UI components (e.g., Timeline shows error screen)

Representative web snippets
- See src/lib/api/dashboard.ts, src/hooks/useUserActivities.ts, src/hooks/use-financial-health-profile.ts, src/services/conversation-service.ts, src/hooks/use-subscription.ts

4. Flutter implementation guide
Global HTTP client setup
- Use dio with retrofit for typed services and interceptors
- Use supabase_flutter for auth/session; read currentSession and accessToken
- Interceptors
  - Add Header apikey: <SUPABASE_ANON_KEY>
  - If authenticated, add Authorization: Bearer <access_token>
  - Retry with exponential backoff on 429/5xx with jitter
  - Optional: Attach If-None-Match/If-Modified-Since if server returns ETag/Last-Modified

Dart example: dio + interceptors
```dart
// lib/core/network/dio_client.dart
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DioClient {
  final Dio dio;
  DioClient._(this.dio);

  static DioClient create({required String functionsBaseUrl, required String supabaseAnonKey}) {
    final dio = Dio(BaseOptions(
      baseUrl: functionsBaseUrl, // e.g., https://<ref>.supabase.co/functions/v1
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey, // required by Supabase Functions
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final session = Supabase.instance.client.auth.currentSession;
        final token = session?.accessToken;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        } else {
          options.headers.remove('Authorization');
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        // Simple retry/backoff policy
        final status = e.response?.statusCode ?? 0;
        final isRetriable = status == 429 || (status >= 500 && status < 600);
        final reqOptions = e.requestOptions;
        final retries = (reqOptions.extra['retries'] as int?) ?? 0;
        if (isRetriable && retries < 2) {
          final delayMs = (300 * (1 << retries)) + (DateTime.now().microsecond % 200);
          await Future.delayed(Duration(milliseconds: delayMs));
          final newOptions = Options(
            method: reqOptions.method,
            headers: reqOptions.headers,
            responseType: reqOptions.responseType,
            contentType: reqOptions.contentType,
          );
          reqOptions.extra['retries'] = retries + 1;
          try {
            final response = await dio.request(
              reqOptions.path,
              data: reqOptions.data,
              queryParameters: reqOptions.queryParameters,
              options: newOptions,
            );
            return handler.resolve(response);
          } catch (err) {
            return handler.reject(err as DioException);
          }
        }
        handler.next(e);
      },
    ));

    return DioClient._(dio);
  }
}
```

Retrofit example service (dashboard views)
```dart
// lib/api/dashboard_views_api.dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/dashboard_models.dart';

part 'dashboard_views_api.g.dart';

@RestApi()
abstract class DashboardViewsApi {
  factory DashboardViewsApi(Dio dio, {String baseUrl}) = _DashboardViewsApi;

  @POST('/dashboard-views')
  Future<DashboardViewsResponse> postAction(@Body() Map<String, dynamic> body);

  @PUT('/dashboard-views')
  Future<DashboardUpdateResponse> putAction(@Body() Map<String, dynamic> body);

  @DELETE('/dashboard-views')
  Future<Map<String, dynamic>> deleteAction(@Body() Map<String, dynamic> body);
}
```

Dart models with json_serializable
```dart
// lib/models/dashboard_models.dart
import 'package:json_annotation/json_annotation.dart';

part 'dashboard_models.g.dart';

@JsonSerializable(explicitToJson: true)
class DashboardViewDto {
  final String id;
  @JsonKey(name: 'user_id')
  final String userId;
  final String name;
  final String? description;
  @JsonKey(name: 'created_at')
  final String createdAt;
  @JsonKey(name: 'updated_at')
  final String updatedAt;
  DashboardViewDto({required this.id, required this.userId, required this.name, this.description, required this.createdAt, required this.updatedAt});
  factory DashboardViewDto.fromJson(Map<String, dynamic> json) => _$DashboardViewDtoFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardViewDtoToJson(this);
}

@JsonSerializable()
class DashboardWidgetDto {
  final String id;
  @JsonKey(name: 'view_id')
  final String viewId;
  final String type;
  final String title;
  final String icon;
  @JsonKey(name: 'column_span')
  final int columnSpan;
  @JsonKey(name: 'row_span')
  final int rowSpan;
  final Map<String, dynamic>? data;
  DashboardWidgetDto({required this.id, required this.viewId, required this.type, required this.title, required this.icon, required this.columnSpan, required this.rowSpan, this.data});
  factory DashboardWidgetDto.fromJson(Map<String, dynamic> json) => _$DashboardWidgetDtoFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardWidgetDtoToJson(this);
}

@JsonSerializable(explicitToJson: true)
class DashboardViewsResponse {
  final List<DashboardViewDto>? views;
  final DashboardViewDto? view;
  final List<DashboardWidgetDto>? widgets;
  DashboardViewsResponse({this.views, this.view, this.widgets});
  factory DashboardViewsResponse.fromJson(Map<String, dynamic> json) => _$DashboardViewsResponseFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardViewsResponseToJson(this);
}

@JsonSerializable(explicitToJson: true)
class DashboardUpdateResponse {
  final DashboardViewDto view;
  final List<DashboardWidgetDto> widgets;
  DashboardUpdateResponse({required this.view, required this.widgets});
  factory DashboardUpdateResponse.fromJson(Map<String, dynamic> json) => _$DashboardUpdateResponseFromJson(json);
  Map<String, dynamic> toJson() => _$DashboardUpdateResponseToJson(this);
}
```

Repository/service example
```dart
// lib/repositories/dashboard_repository.dart
import 'package:dio/dio.dart';
import '../api/dashboard_views_api.dart';
import '../models/dashboard_models.dart';

class DashboardRepository {
  final DashboardViewsApi api;
  DashboardRepository(this.api);

  Future<List<DashboardViewDto>> getAllViews({required String userId}) async {
    final res = await api.postAction({'action': 'get-all', 'userId': userId});
    return res.views ?? <DashboardViewDto>[];
    }

  Future<(DashboardViewDto, List<DashboardWidgetDto>)> getDefaultView({required String userId}) async {
    final res = await api.postAction({'action': 'get-default', 'userId': userId});
    final view = res.view!;
    final widgets = res.widgets ?? <DashboardWidgetDto>[];
    return (view, widgets);
  }

  Future<(DashboardViewDto, List<DashboardWidgetDto>)> getViewById({required String userId, required String viewId}) async {
    final res = await api.postAction({'action': 'get-by-id', 'userId': userId, 'viewId': viewId});
    return (res.view!, res.widgets ?? <DashboardWidgetDto>[]);
  }

  Future<DashboardUpdateResponse> updateWithWidgets({
    required String userId,
    required String viewId,
    required String name,
    String? description,
    required List<DashboardWidgetDto> widgets,
  }) async {
    return api.putAction({
      'action': 'update-with-widgets',
      'userId': userId,
      'viewId': viewId,
      'name': name,
      if (description != null) 'description': description,
      'widgets': widgets.map((w) => w.toJson()).toList(),
    });
  }
}
```

Riverpod providers (TanStack Query equivalent)
```dart
// lib/features/dashboard/data/dashboard_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/network/dio_client.dart';
import '../../api/dashboard_views_api.dart';
import '../../repositories/dashboard_repository.dart';
import '../../models/dashboard_models.dart';

final supabaseClientProvider = Provider((ref) => Supabase.instance.client);

final dioProvider = Provider((ref) {
  // Use env or runtime config
  const functionsBaseUrl = String.fromEnvironment('SUPABASE_FUNCTIONS_URL');
  const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  return DioClient.create(functionsBaseUrl: functionsBaseUrl, supabaseAnonKey: anonKey).dio;
});

final dashboardApiProvider = Provider((ref) => DashboardViewsApi(ref.watch(dioProvider)));
final dashboardRepoProvider = Provider((ref) => DashboardRepository(ref.watch(dashboardApiProvider)));

final dashboardDefaultViewProvider = FutureProvider.autoDispose.family<(
  DashboardViewDto, List<DashboardWidgetDto>
), String>((ref, userId) async {
  final repo = ref.watch(dashboardRepoProvider);
  // cache policy similar to TanStack: rely on Riverpod cache; autoDispose + keepAlive for screen lifetime
  final result = await repo.getDefaultView(userId: userId);
  return result;
});
```

More endpoint models and providers
- Activities
```dart
// lib/models/activity_models.dart
import 'package:json_annotation/json_annotation.dart';
part 'activity_models.g.dart';

@JsonSerializable()
class ActivityRecordDto {
  final String id;
  @JsonKey(name: 'created_at')
  final String createdAt;
  final Map<String, dynamic> activity;
  ActivityRecordDto({required this.id, required this.createdAt, required this.activity});
  factory ActivityRecordDto.fromJson(Map<String, dynamic> json) => _$ActivityRecordDtoFromJson(json);
  Map<String, dynamic> toJson() => _$ActivityRecordDtoToJson(this);
}
```

```dart
// lib/api/user_activities_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
import '../models/activity_models.dart';
part 'user_activities_api.g.dart';

@RestApi()
abstract class UserActivitiesApi {
  factory UserActivitiesApi(Dio dio, {String baseUrl}) = _UserActivitiesApi;

  @GET('/user-activities')
  Future<Map<String, dynamic>> list(@Query('user_id') String userId);
}

// Repository
class ActivitiesRepository {
  final UserActivitiesApi api;
  ActivitiesRepository(this.api);
  Future<List<ActivityRecordDto>> getRecent(String userId) async {
    final res = await api.list(userId);
    final list = (res['activities'] as List? ?? []).cast<Map<String, dynamic>>();
    return list.map(ActivityRecordDto.fromJson).toList();
  }
}

// Provider with Riverpod + realtime hook placeholder
final activitiesProvider = FutureProvider.family<List<ActivityRecordDto>, String>((ref, userId) async {
  final repo = ActivitiesRepository(UserActivitiesApi(ref.read(dioProvider)));
  final data = await repo.getRecent(userId);
  return data;
});
```

- Financial health profile
```dart
// lib/models/financial_profile_models.dart
import 'package:json_annotation/json_annotation.dart';
part 'financial_profile_models.g.dart';

@JsonSerializable()
class FinancialHealthProfileDto {
  final String id;
  @JsonKey(name: 'user_id')
  final String userId;
  @JsonKey(name: 'profile_description')
  final String profileDescription;
  @JsonKey(name: 'profile_data')
  final Map<String, dynamic> profileData;
  FinancialHealthProfileDto({
    required this.id,
    required this.userId,
    required this.profileDescription,
    required this.profileData,
  });
  factory FinancialHealthProfileDto.fromJson(Map<String, dynamic> json) => _$FinancialHealthProfileDtoFromJson(json);
  Map<String, dynamic> toJson() => _$FinancialHealthProfileDtoToJson(this);
}
```

```dart
// lib/api/financial_profile_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
import '../models/financial_profile_models.dart';
part 'financial_profile_api.g.dart';

@RestApi()
abstract class FinancialProfileApi {
  factory FinancialProfileApi(Dio dio, {String baseUrl}) = _FinancialProfileApi;

  @POST('/get-financial-health-profile')
  Future<Map<String, dynamic>> getProfile(@Body() Map<String, dynamic> body);
}

class FinancialProfileRepository {
  final FinancialProfileApi api;
  FinancialProfileRepository(this.api);
  Future<FinancialHealthProfileDto?> fetch(String userId) async {
    final res = await api.getProfile({'userId': userId});
    if (res['success'] == true && res['profile'] != null) {
      return FinancialHealthProfileDto.fromJson(res['profile'] as Map<String, dynamic>);
    }
    return null;
  }
}

final financialProfileProvider = FutureProvider.family<FinancialHealthProfileDto?, String>((ref, userId) async {
  final repo = FinancialProfileRepository(FinancialProfileApi(ref.read(dioProvider)));
  return repo.fetch(userId);
});
```

- Courses
```dart
// lib/api/courses_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
part 'courses_api.g.dart';

@RestApi()
abstract class CoursesApi {
  factory CoursesApi(Dio dio, {String baseUrl}) = _CoursesApi;
  @POST('/get-user-courses')
  Future<Map<String, dynamic>> userCourses(@Body() Map<String, dynamic> body);
}

class CoursesRepository {
  final CoursesApi api;
  CoursesRepository(this.api);
  Future<List<Map<String, dynamic>>> getUserCourses(String userId) async {
    final res = await api.userCourses({'userId': userId});
    return (res['courses'] as List? ?? []).cast<Map<String, dynamic>>();
  }
}

final userCoursesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, userId) async {
  final repo = CoursesRepository(CoursesApi(ref.read(dioProvider)));
  return repo.getUserCourses(userId);
});
```

- Subscription bundle
```dart
// lib/api/subscription_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
part 'subscription_api.g.dart';

@RestApi()
abstract class SubscriptionApi {
  factory SubscriptionApi(Dio dio, {String baseUrl}) = _SubscriptionApi;

  @GET('/get-subscription')
  Future<Map<String, dynamic>> getSubscription(@Query('userId') String userId);
}
```

Authentication flows and interceptors
- supabase_flutter auto refreshes tokens; interceptors simply read current token per request
- For 401:
  - Force a session refresh via Supabase auth.refreshSession()
  - Retry once
- Secure storage: supabase_flutter persists session; additional app secrets in flutter_secure_storage

Pagination patterns
- Offset/page (common for activities if implemented server-side)
- Cursor-based recommended; expose nextCursor in payload; Retrofit method adds query after/limit

File uploads
- Not used directly on dashboard; example code provided for multipart with dio

Streaming/real-time
- Use Supabase Realtime to subscribe to Postgres changes on user_activities and invalidate Riverpod caches
```dart
final realtimeActivitiesProvider = Provider.family<void, String>((ref, userId) {
  final client = Supabase.instance.client;
  final sub = client.channel('user-activities-$userId')
    .onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'user_activities',
      filter: PostgresChangeFilter.eq('user_id', userId),
      callback: (_) => ref.invalidate(activitiesProvider(userId)),
    )
    .subscribe();
  ref.onDispose(() => client.removeChannel(sub));
});
```

Error handling patterns
- Map DioError types to typed exceptions (NetworkError, UnauthorizedError, RateLimitedError)
- Provide user-friendly messages; surface to UI via AsyncValue.when(error: …)
- Idempotency: when updating dashboard widgets, include a client-generated idempotency key header if backend adds support (recommendation)

Caching strategies
- In-memory Riverpod cache per provider
- Short-lived persistent cache (hydrated_riverpod or hive) may be added for offline-first; do not cache PII beyond session lifetime

Local persistence and secure storage
- Session: supabase_flutter
- User preferences (e.g., expanded panels): SharedPreferences or Hive encrypted box

Accessibility/localization/timezone
- Use intl for dates and currency; ensure timeline grouping uses local timezone

5. Real-time, background, and platform features
- Websocket/Realtime: Supabase channel as shown
- Push notifications (future): firebase_messaging; deep links can open chat or dashboard view
- Background fetch/sync: Workmanager to periodically refresh activities; respect battery/OS policies

6. Testing, CI/CD, and observability
- Unit tests
  - json_serializable model fromJson/toJson
  - Repository methods with dio adapter mocks
- Integration tests
  - Hit a mock server generated from OpenAPI via prism/httptest; verify 200/401/429/5xx handling
- CI
  - flutter analyze, dart test
  - build_runner codegen (json_serializable, retrofit) as part of CI
- Telemetry
  - Sentry or Firebase Crashlytics; attach network breadcrumbs (method, path, status, latency, retry count)

7. Migration and verification plan
- Phase 1 (MVP parity)
  1) Auth bootstrap, ProtectedRoute equivalent
  2) Dashboard shell and AI chat drawer open/close
  3) Dashboard Home aggregates: activities, profile (if any), XP, courses, subscription
  4) Realtime refresh for activities
- Phase 2
  - Dashboard view management (templates, widgets read/update)
  - Guidance panel interactions
- Phase 3
  - Chat full parity (sessions, optimized send, suggestions)

Verification
- Compare API responses for same user between web and mobile (diff keys, counts)
- Realtime insert → mobile list invalidation within <2s
- Performance: cold start <2.5s on mid-tier Android; first screen TTI <1.5s after auth
- Security: no secrets in app bundle; tokens only sent to Supabase URLs

8. Mapping matrix (endpoint → web usage → Flutter mapping)
| Endpoint | Web callsite(s) | Flutter module | Screen | Repository | Provider |
|---|---|---|---|---|---|
| POST /dashboard-views (get-default) | useDashboardViewById/useDashboard in lib/api/dashboard.ts | features/dashboard | Dashboard shell/home | DashboardRepository | dashboardDefaultViewProvider |
| PUT /dashboard-views (update-with-widgets) | saveDashboard thunk | features/dashboard | Dashboard editor | DashboardRepository | n/a (mutation) |
| GET /dashboard-templates | useAllDashboardTemplates | features/dashboard | Template picker | DashboardRepository | n/a |
| GET /user-activities | hooks/useUserActivities.ts | features/activities | Home (Timeline) | ActivitiesRepository | activitiesProvider |
| POST /get-financial-health-profile | hooks/use-financial-health-profile.ts | features/profile | Home cards | FinancialProfileRepository | financialProfileProvider |
| POST /get-user-courses | services/course-service.ts | features/courses | Home cards | CoursesRepository | userCoursesProvider |
| POST /get-user-xp | hooks/useUserTotalXp.ts | features/gamification | Home badges | XPRepository (inline) | xpProvider (create) |
| GET /get-subscription | hooks/use-subscription.ts | features/subscription | Home/membership | SubscriptionRepository | subscriptionProvider (create) |
| GET/POST /chat_sessions, POST /chat_stream | services/conversation-service.ts | features/chat | AI drawer | ChatRepository | chatProviders (create) |

9. Missing information and asks (prioritized)
1) Provide example JSON responses for: get-user-courses, get-financial-health-profile, get-subscription, dashboard-views (all actions)
2) Confirm which endpoints require Authorization and which allow guests
3) Confirm rate limiting and retry policy recommendations for chat_stream
4) Validate ActivityRecord.metadata fields and any enums for action/type
5) Confirm pagination for activities (currently client-side time slicing only)

10. Recommended Flutter app structure
```
lib/
  api/                 # retrofit interfaces
  core/network/        # dio client, interceptors
  features/
    dashboard/
      data/
      presentation/
    activities/
    profile/
    courses/
    subscription/
    chat/
  models/              # json_serializable DTOs
  repositories/
  providers/           # Riverpod global providers
```

Appendix: Additional snippets
- File upload (multipart) with dio
```dart
final form = FormData.fromMap({
  'file': await MultipartFile.fromFile(path, filename: 'upload.jpg'),
});
await dio.post('/upload-endpoint', data: form, options: Options(contentType: 'multipart/form-data'));
```
- SSE/Websocket: Supabase client handles websocket internally for realtime.
- Retry/backoff already included in DioClient example.

Final readiness checklist
- [ ] OpenAPI spec validated against staging
- [ ] All DTOs generated via build_runner
- [ ] Providers return consistent AsyncValue states and are cached between navigations
- [ ] Realtime refresh verified
- [ ] 401 handling and token refresh verified
- [ ] Performance budgets met
- [ ] Telemetry dashboards show network traces and error rates

---

Appendix A — Chat API Dart artifacts (models, API, repository, Riverpod)

Note: Schemas inferred from web code. Validate against backend responses.

```dart
// lib/models/chat_models.dart
import 'package:json_annotation/json_annotation.dart';
part 'chat_models.g.dart';

@JsonSerializable()
class MessageDto {
  final String? id;
  @JsonKey(name: 'chat_session_id')
  final String chatSessionId;
  final String content;
  final String role; // 'user' | 'assistant'
  final int timestamp;
  final Map<String, dynamic>? metadata;
  MessageDto({this.id, required this.chatSessionId, required this.content, required this.role, required this.timestamp, this.metadata});
  factory MessageDto.fromJson(Map<String, dynamic> json) => _$MessageDtoFromJson(json);
  Map<String, dynamic> toJson() => _$MessageDtoToJson(this);
}

@JsonSerializable(explicitToJson: true)
class ConversationDto {
  final String id;
  @JsonKey(name: 'user_id')
  final String userId;
  @JsonKey(name: 'session_id')
  final String sessionId;
  final String model; // advisor | educator | goal_tracker
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'created_at')
  final String createdAt;
  @JsonKey(name: 'updated_at')
  final String updatedAt;
  final List<MessageDto>? messages;
  ConversationDto({required this.id, required this.userId, required this.sessionId, required this.model, required this.isActive, required this.createdAt, required this.updatedAt, this.messages});
  factory ConversationDto.fromJson(Map<String, dynamic> json) => _$ConversationDtoFromJson(json);
  Map<String, dynamic> toJson() => _$ConversationDtoToJson(this);
}

@JsonSerializable()
class AIResponseDto {
  final String response;
  final bool? isComplete;
  final String? messageId;
  final String? conversationId;
  final Map<String, dynamic>? generatedLessons;
  AIResponseDto({required this.response, this.isComplete, this.messageId, this.conversationId, this.generatedLessons});
  factory AIResponseDto.fromJson(Map<String, dynamic> json) => _$AIResponseDtoFromJson(json);
  Map<String, dynamic> toJson() => _$AIResponseDtoToJson(this);
}
```

```dart
// lib/api/chat_api.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
import '../models/chat_models.dart';
part 'chat_api.g.dart';

@RestApi()
abstract class ChatApi {
  factory ChatApi(Dio dio, {String baseUrl}) = _ChatApi;

  // GET /chat_sessions?model=advisor
  @GET('/chat_sessions')
  Future<ConversationDto> getConversations(@Query('model') String model);

  // GET /chat_sessions/{id}
  @GET('/chat_sessions/{id}')
  Future<ConversationDto> getConversation(@Path('id') String id);

  // POST /chat_sessions
  @POST('/chat_sessions')
  Future<ConversationDto> createConversation(@Body() Map<String, dynamic> body);

  // DELETE /chat_sessions
  @DELETE('/chat_sessions')
  Future<void> deleteConversation(@Body() Map<String, dynamic> body);

  // POST /chat_stream
  @POST('/chat_stream')
  Future<AIResponseDto> sendChat(@Body() Map<String, dynamic> body);

  // POST /chat_optimized
  @POST('/chat_optimized')
  Future<AIResponseDto> sendOptimized(@Body() Map<String, dynamic> body);

  // POST /update_guest_session
  @POST('/update_guest_session')
  Future<Map<String, dynamic>> linkGuest(@Body() Map<String, dynamic> body);

  // POST /predict-user-responses
  @POST('/predict-user-responses')
  Future<List<String>> predict(@Body() Map<String, dynamic> body);
}
```

```dart
// lib/repositories/chat_repository.dart
import '../api/chat_api.dart';
import '../models/chat_models.dart';

class ChatRepository {
  final ChatApi api;
  ChatRepository(this.api);

  Future<ConversationDto?> getByModel(String model) async {
    try { return await api.getConversations(model); } catch (_) { return null; }
  }

  Future<AIResponseDto> sendMessage({
    required String model,
    required String message,
    String? conversationId,
    String? userId,
    String? sessionId,
    String? userProfile,
    Map<String, dynamic>? goalContext,
  }) {
    return api.sendChat({
      'model': model,
      'message': message,
      'conversationId': conversationId,
      'userId': userId,
      'sessionId': sessionId,
      if (userProfile != null) 'userProfile': userProfile,
      if (goalContext != null) 'goalContext': goalContext,
    });
  }
}
```

```dart
// lib/features/chat/data/chat_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../api/chat_api.dart';
import '../../repositories/chat_repository.dart';
import '../../models/chat_models.dart';

final chatApiProvider = Provider((ref) => ChatApi(ref.read(dioProvider)));
final chatRepoProvider = Provider((ref) => ChatRepository(ref.read(chatApiProvider)));

final chatSessionByRoleProvider = FutureProvider.family<ConversationDto?, String>((ref, model) async {
  final repo = ref.read(chatRepoProvider);
  return repo.getByModel(model);
});
```

Appendix B — Token refresh flow with locking

```dart
// lib/core/network/token_refresh.dart
import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

class TokenRefresher {
  Completer<void>? _refreshCompleter;

  Future<void> refreshIfNeeded() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future; // wait for in-flight refresh
    }
    _refreshCompleter = Completer<void>();
    try {
      final client = Supabase.instance.client;
      final session = client.auth.currentSession;
      if (session == null) {
        _refreshCompleter!.complete();
        return;
      }
      final res = await client.auth.refreshSession();
      if (res.session == null) {
        // optionally sign out
      }
      _refreshCompleter!.complete();
    } catch (e) {
      _refreshCompleter!.completeError(e);
    } finally {
      _refreshCompleter = null;
    }
  }
}
```

Appendix C — Pagination examples (cursor and offset)

```dart
// Offset example
@GET('/user-activities')
Future<Map<String, dynamic>> listActivities(
  @Query('user_id') String userId,
  @Query('offset') int offset,
  @Query('limit') int limit,
);
```

```dart
// Riverpod infinite scroll
final activitiesPagedProvider = StateNotifierProvider.family<ActivitiesPager, AsyncValue<List<ActivityRecordDto>>, String>((ref, userId) {
  return ActivitiesPager(ref.read, userId);
});

class ActivitiesPager extends StateNotifier<AsyncValue<List<ActivityRecordDto>>> {
  final Reader read; final String userId; int _offset = 0; final int _pageSize = 20; bool _hasMore = true; bool _loading = false;
  ActivitiesPager(this.read, this.userId): super(const AsyncValue.data([])) { loadMore(); }
  Future<void> loadMore() async { if (_loading || !_hasMore) return; _loading = true; try {
    final api = UserActivitiesApi(read(dioProvider));
    final res = await api.list(userId); // adapt if backend adds pagination
    final newItems = (res['activities'] as List).map((e) => ActivityRecordDto.fromJson(e)).toList();
    state = AsyncValue.data([...state.value ?? [], ...newItems]);
    _hasMore = newItems.length == _pageSize; _offset += newItems.length;
  } catch (e, st) { state = AsyncValue.error(e, st); } finally { _loading = false; }}
}
```

Appendix D — ETag/conditional requests

```dart
// Add If-None-Match when you stored previous ETag
final etag = await cache.get('activitiesEtag');
final res = await dio.get('/user-activities', options: Options(headers: { if (etag != null) 'If-None-Match': etag }));
if (res.statusCode == 304) { /* use cached body */ } else { final newEtag = res.headers.value('etag'); await cache.put('activitiesEtag', newEtag); }
```

Appendix E — Typed exceptions and error mapping

```dart
sealed class ApiException implements Exception { final String message; ApiException(this.message); }
class UnauthorizedException extends ApiException { UnauthorizedException(String m): super(m); }
class RateLimitedException extends ApiException { RateLimitedException(String m): super(m); }
class ServerErrorException extends ApiException { ServerErrorException(String m): super(m); }

T mapDio<T>(DioException e) => throw switch (e.response?.statusCode) {
  401 => UnauthorizedException('Session expired'),
  429 => RateLimitedException('Too many requests'),
  int s when s != null && s >= 500 => ServerErrorException('Server error'),
  _ => ApiException(e.message ?? 'Network error'),
};
```

Appendix F — State management variants

Riverpod: see providers above.

BLoC (brief)
```dart
class ActivitiesEvent {}
class LoadMore extends ActivitiesEvent {}

class ActivitiesState { final List<ActivityRecordDto> items; final bool loading; final Object? error; ActivitiesState({this.items = const [], this.loading = false, this.error}); }

class ActivitiesBloc extends Bloc<ActivitiesEvent, ActivitiesState> {
  final ActivitiesRepository repo; final String userId;
  ActivitiesBloc(this.repo, this.userId): super(ActivitiesState()) { on<LoadMore>(_onLoadMore); add(LoadMore()); }
  Future<void> _onLoadMore(LoadMore e, Emitter<ActivitiesState> emit) async { emit(ActivitiesState(items: state.items, loading: true)); try {
    final data = await repo.getRecent(userId);
    emit(ActivitiesState(items: [...state.items, ...data]));
  } catch (err) { emit(ActivitiesState(items: state.items, error: err)); } }
}
```

Provider (ChangeNotifier)
```dart
class ActivitiesModel extends ChangeNotifier {
  final ActivitiesRepository repo; final String userId; List<ActivityRecordDto> items = []; bool loading = false; Object? error;
  ActivitiesModel(this.repo, this.userId);
  Future<void> load() async { loading = true; notifyListeners(); try { items = await repo.getRecent(userId); } catch (e) { error = e; } finally { loading = false; notifyListeners(); } }
}
```

Appendix G — QA checklist (Dashboard module)
- Authentication
  - [ ] Unauthed users are redirected before data calls
  - [ ] Token auto-refresh works; 401 retry path verified
- Dashboard data
  - [ ] default view fetched; widgets count matches web
  - [ ] update-with-widgets saves and returns server IDs
- Activities
  - [ ] Initial load shows correct items
  - [ ] Realtime INSERT triggers cache invalidation within 2s
  - [ ] Search and date filters behave like web
- Profile
  - [ ] Missing profile handled gracefully
- Courses
  - [ ] Remote list renders; errors surfaced
- Subscription
  - [ ] Plan name, status, next payment aligned with web
- Chat
  - [ ] Guest session created; linkGuest on login works
  - [ ] sendChat responses shown; error fallback message
- Performance
  - [ ] First paint < 1.5s after auth on mid-tier device
  - [ ] Network retries under flaky conditions
- Security
  - [ ] Only Supabase Functions base URL accessed
  - [ ] No secrets in source; keys injected via env

Appendix H — Representative sample requests/responses (inferred)

user-activities (GET)
Request: GET /user-activities?user_id=00000000-0000-0000-0000-000000000000
Response 200 (example):
```json
{
  "activities": [
    {
      "id": "act_1",
      "created_at": "2025-01-01T12:00:00Z",
      "activity": {
        "type": "goal",
        "action": "goal_created",
        "source": "goal-tracker",
        "metadata": { "goalId": "g1", "goalTitle": "Emergency Fund", "xp": 20 }
      }
    }
  ]
}
```

get-financial-health-profile (POST)
Request body:
```json
{ "userId": "00000000-0000-0000-0000-000000000000" }
```
Response 200 (example):
```json
{ "success": true, "profile": { "id": "p1", "user_id": "...", "profile_description": "...", "profile_data": { "demographics": { "age": 30 } } } }
```

get-user-courses (POST)
```json
{ "userId": "..." }
```
Response 200 (example):
```json
{ "courses": [ { "id": "c1", "title": "Investing Basics" } ] }
```

get-user-xp (POST)
```json
{ "user_id": "..." }
```
Response 200:
```json
{ "total_xp": 540 }
```

get-subscription (GET)
Response 200 (example):
```json
{ "subscription": { "plan": "pro", "status": "active" }, "features": [], "payment_method": null, "invoices": [], "days_until_next_payment": 25 }
```

chat_stream (POST)
```json
{ "message": "Hello", "model": "advisor", "conversationId": null, "userId": "...", "sessionId": "guest-123" }
```
Response 200:
```json
{ "response": "Hi! How can I help?", "messageId": "m_1", "conversationId": "cs_1" }
```

Final certificate checklist
- [ ] OpenAPI present and validated
- [ ] Endpoint mapping complete and verified against web callsites
- [ ] Dart artifacts compile (build_runner) and providers integrate
- [ ] QA checklist passed on staging user
- [ ] Sign-off from backend on inferred fields
```
