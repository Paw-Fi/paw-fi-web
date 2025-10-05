
# Moneko Mobile Migration — Dashboard Home

This document focuses on the Dashboard Home route (/src/routes/dashboard/_layout.index.tsx) and details the widgets, data dependencies, and their mobile equivalents.

1. Screen overview
- Hero, progress and gamification, learning shortcuts, timeline, right sidebar triggers for AI drawer
- Depends on:
  - useDashboardData() aggregate
  - useSubscription(userId)
  - useAIChat openChat()
  - GuidanceTestPanel (developer tool)

2. Data dependencies and mappings
- Activities: GET /user-activities?user_id=… → activitiesProvider(userId)
- XP: POST /get-user-xp { user_id } → xpProvider(userId)
- Financial Profile: POST /get-financial-health-profile { userId } → financialProfileProvider(userId)
- Courses: POST /get-user-courses { userId } → userCoursesProvider(userId)
- Subscription: GET /get-subscription?userId=… → subscriptionProvider(userId)

3. UI/state patterns (Riverpod)
- Each section consumes a provider; overall screen composes AsyncValue states:
```dart
class DashboardHomeScreen extends ConsumerWidget {
  const DashboardHomeScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      return const Center(child: Text('Sign in required'));
    }
    final userId = user.id;

    final activities = ref.watch(activitiesProvider(userId));
    final profile = ref.watch(financialProfileProvider(userId));
    final courses = ref.watch(userCoursesProvider(userId));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(activitiesProvider(userId));
        ref.invalidate(financialProfileProvider(userId));
        ref.invalidate(userCoursesProvider(userId));
      },
      child: ListView(
        children: [
          activities.when(
            data: (data) => ActivitiesTimeline(data: data),
            loading: () => const ShimmerBox(height: 120),
            error: (e, st) => ErrorCard(error: e.toString()),
          ),
          profile.when(
            data: (p) => FinancialProfileCard(profile: p),
            loading: () => const ShimmerBox(height: 120),
            error: (e, st) => ErrorCard(error: e.toString()),
          ),
          courses.when(
            data: (c) => CoursesStrip(courses: c),
            loading: () => const ShimmerBox(height: 120),
            error: (e, st) => ErrorCard(error: e.toString()),
          ),
        ],
      ),
    );
  }
}
```

4. AI chat drawer
- Use a floating action button with two options: advisor, educator
- On tap, navigate to ChatScreen with role parameter; reuse ChatRepository

5. QA checklist for Dashboard Home
- [ ] Auth redirect on unauthenticated
- [ ] Activities load, search and date filter behavior equivalent to web
- [ ] Profile null-safe (no profile yet → empty state)
- [ ] Courses appear when available; loading skeletons render
- [ ] Subscription banner shows correct plan state
- [ ] AI FAB opens advisor and educator chats


6. Data model and API artifacts for Dashboard Home
- Completed lessons endpoint (POST /get-user-completed-lessons)

Dart models (json_serializable)
```dart
import 'package:json_annotation/json_annotation.dart';
part 'completed_lessons.g.dart';

@JsonSerializable()
class CompletedLessonDto {
  final String id;
  @JsonKey(name: 'lesson_id')
  final String lessonId;
  @JsonKey(name: 'created_at')
  final String createdAt;
  CompletedLessonDto({required this.id, required this.lessonId, required this.createdAt});
  factory CompletedLessonDto.fromJson(Map<String, dynamic> json) => _$CompletedLessonDtoFromJson(json);
  Map<String, dynamic> toJson() => _$CompletedLessonDtoToJson(this);
}

@JsonSerializable(explicitToJson: true)
class CompletedLessonsResponseDto {
  final bool success;
  @JsonKey(name: 'completed_lessons')
  final List<CompletedLessonDto> completedLessons;
  CompletedLessonsResponseDto({required this.success, required this.completedLessons});
  factory CompletedLessonsResponseDto.fromJson(Map<String, dynamic> json) => _$CompletedLessonsResponseDtoFromJson(json);
  Map<String, dynamic> toJson() => _$CompletedLessonsResponseDtoToJson(this);
}
```

Retrofit API and repository
```dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
part 'completed_lessons_api.g.dart';

@RestApi()
abstract class CompletedLessonsApi {
  factory CompletedLessonsApi(Dio dio, {String baseUrl}) = _CompletedLessonsApi;
  @POST('/get-user-completed-lessons')
  Future<CompletedLessonsResponseDto> list(@Body() Map<String, dynamic> body);
}

class CompletedLessonsRepository {
  CompletedLessonsRepository(this._api);
  final CompletedLessonsApi _api;
  Future<List<CompletedLessonDto>> getForUser(String userId) async {
    final res = await _api.list({'userId': userId});
    return res.completedLessons;
  }
}
```

Riverpod provider
```dart
final completedLessonsProvider = FutureProvider.family<List<CompletedLessonDto>, String>((ref, userId) async {
  final dio = ref.watch(dioProvider);
  final api = CompletedLessonsApi(dio, baseUrl: ref.watch(functionsBaseUrlProvider));
  final repo = CompletedLessonsRepository(api);
  return repo.getForUser(userId);
});
```

7. Deep links and navigation map
- /dashboard → DashboardHomeScreen
- /dashboard/learning → LearningListScreen
- /dashboard/learning/:courseId/lesson/:lessonId → LessonDetailScreen
- /dashboard/essentials → EssentialsScreen
- /dashboard/user-settings/profile → ProfileScreen
- /dashboard/tracker → GoalTrackerHome

8. Realtime refresh wiring
- Subscribe to public:user_activities INSERT filtered by user_id.
- On event, ref.invalidate(activitiesProvider(userId)) so Lists and Streak recompute.

9. Open questions to confirm with backend
- Whether get-user-completed-lessons returns created_at in UTC and any pagination.
- Expected maximum activities returned by user-activities and need for server-side pagination.
- Any rate limits for chat_stream during onboarding flows.
