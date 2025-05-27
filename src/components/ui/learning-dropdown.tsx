import { faChevronDown, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@tanstack/react-router";
import basicCourse from '@/data/basic-lessons.json';


interface Lesson {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

interface LearningDropdownProps {
  lessons: Lesson[];
}

// No JS truncate needed; use CSS line-clamp/truncate for all text truncation.

// Grouping logic based on lesson titles/ids
interface LessonGroup {
  name: string;
  shortform: string;
  lessons: Array<{ lesson: Lesson; lessonShortform: string }>;
}

// Canonical lesson mappings by ID for robust grouping and SEO
const lessonMappings = [
  // Getting Started
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Key Concepts",
    lessonId: "L1-beginners-guide-investing-concepts",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Risk & Loss",
    lessonId: "L1b-risk-and-loss",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Investment Risk",
    lessonId: "L1d-investment-risk",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Diversification",
    lessonId: "L1c-diversification",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Broker vs Dealer",
    lessonId: "L1e-broker-vs-dealer",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Primary vs Secondary Market",
    lessonId: "L1f-primary-vs-secondary-market",
  },
  {
    group: "Getting Started",
    groupShort: "GS",
    lessonShort: "Behavioral Finance",
    lessonId: "L2-behavioral-finance-emotions",
  },
  // Investment Types
  {
    group: "Investment Types",
    groupShort: "IT",
    lessonShort: "Money Market",
    lessonId: "L3-money-market-explained",
  },
  {
    group: "Investment Types",
    groupShort: "IT",
    lessonShort: "Bonds",
    lessonId: "L4-bond-market-explained",
  },
  {
    group: "Investment Types",
    groupShort: "IT",
    lessonShort: "Stocks",
    lessonId: "L5-equity-market-overview",
  },
  {
    group: "Investment Types",
    groupShort: "IT",
    lessonShort: "Derivatives",
    lessonId: "L6-derivatives-market-simple",
  },
  // Financial Concepts
  {
    group: "Financial Concepts",
    groupShort: "FC",
    lessonShort: "Time Value",
    lessonId: "L7-time-value-of-money",
  },
  {
    group: "Financial Concepts",
    groupShort: "FC",
    lessonShort: "Statistics",
    lessonId: "L8-statistics-for-investors",
  },
  {
    group: "Financial Concepts",
    groupShort: "FC",
    lessonShort: "Economics",
    lessonId: "L9-economics-basics-for-investors",
  },
  {
    group: "Financial Concepts",
    groupShort: "FC",
    lessonShort: "Financial Statement Analysis",
    lessonId: "L10-financial-statement-analysis",
  },
];

function groupLessons(lessons: Lesson[]): { groups: LessonGroup[] } {
  // Prepare group arrays
  const groupOrder = [
    { name: "Getting Started", shortform: "GS" },
    { name: "Investment Types", shortform: "IT" },
    { name: "Financial Concepts", shortform: "FC" },
  ];
  const groups: LessonGroup[] = groupOrder.map((g) => ({ ...g, lessons: [] }));

  // Map lessons by canonical ID
  for (const mapping of lessonMappings) {
    const lesson = lessons.find((l) => l.id === mapping.lessonId);
    if (lesson) {
      const groupIdx = groupOrder.findIndex((g) => g.name === mapping.group);
      if (groupIdx !== -1) {
        groups[groupIdx].lessons.push({ lesson, lessonShortform: mapping.lessonShort });
      }
    }
  }
  // Optionally, add any unmapped lessons to Getting Started/Other
  for (const lesson of lessons) {
    const alreadyMapped = lessonMappings.some((m) => m.lessonId === lesson.id);
    if (!alreadyMapped) {
      groups[0].lessons.push({ lesson, lessonShortform: "Other" });
    }
  }
  return { groups };
}

export function LearningDropdown({ lessons }: LearningDropdownProps) {
  const { groups } = groupLessons(lessons);

  return (
    <div className="group relative inline-block text-left self-center" tabIndex={0}>
      <button
        type="button"
        className="inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-expanded="false" // This would be dynamically set with state in a real JS dropdown
        aria-haspopup="true"
      >
        Learning
        <FontAwesomeIcon icon={faChevronDown} className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
      </button>

      {/* Dropdown panel, show/hide based on group-hover/focus-within state */}
      <div className="pointer-events-none w-[45rem] absolute -left-24 top-full z-50 max-w-3xl rounded-2xl bg-white opacity-0 shadow-xl ring-1 ring-gray-900/5 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus:outline-none">
        <nav
          className="py-1"
          role="navigation"
          aria-label="Learning Lessons"
        >
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/learning/"
                className="group/ai inline-flex w-full sm:flex-1 items-center justify-center gap-3 rounded-2xl border-4 border-white bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-400 px-6 py-4 text-lg font-bold tracking-wide text-white shadow-lg transition hover:scale-[1.03] focus:ring-2 focus:ring-fuchsia-400 focus:outline-none active:scale-95"
                tabIndex={0}
                aria-label="Start AI-Powered Learning"
              >
                <span className="animate-pulse text-2xl">🤖</span>
                <span className="flex flex-col items-start">
                  <span className="text-base leading-tight font-bold md:text-lg">
                    AI Learning
                  </span>
                  <span className="line-clamp-2 max-w-xs text-xs font-medium opacity-90 md:text-sm">
                    Personalized lessons powered by AI. Discover your unique path!
                  </span>
                </span>
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-5 w-5 transition-transform group-hover/ai:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                to={`/learning/${basicCourse.id}`}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-100 focus:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                tabIndex={0}
                aria-label="View all investing courses"
              >
                <span>View All Courses</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {groups.map((group) =>
                group.lessons.length === 0 ? null : (
                  <div
                    key={group.name}
                    className="flex flex-1 flex-col rounded-xl border border-gray-100 bg-gray-50 p-5 shadow"
                  >
                    <div
    className={
      "mb-3 text-xs font-semibold tracking-wider uppercase " +
      (group.name === "Getting Started"
        ? "bg-gradient-to-r from-blue-400 to-green-400 text-transparent bg-clip-text"
        : group.name === "Investment Types"
          ? "bg-gradient-to-r from-fuchsia-600 to-pink-400 text-transparent bg-clip-text"
          : group.name === "Financial Concepts"
            ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text"
            : "text-gray-700")
    }
  >
    {group.name}
  </div>
                    <ul className="space-y-3">
                      {group.lessons.map(({ lesson, lessonShortform }) => (
                        <li key={lesson.id}>
                          <Link
                            to={`/learning/${basicCourse.id}/lesson/${lesson.id}`}
                            className="hover:bg-primary/10 focus:bg-primary/20 flex items-center gap-2 rounded-lg p-2 transition"
                          >
                            {lesson.icon && (
                              <span className="flex-shrink-0 text-lg">
                                {lesson.icon}
                              </span>
                            )}
                            <span
                              className="block truncate text-sm font-semibold text-gray-900"
                              title={lesson.title}
                            >
                              {lessonShortform}
                              <span className="sr-only">{lesson.title}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
