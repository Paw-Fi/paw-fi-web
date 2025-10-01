import { faChevronDown, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@tanstack/react-router";
import basicCourse from '@/data/basic-lessons.json';




export function LearningDropdown({ groups }: any) {

  return (
    <div className="group relative inline-block text-left self-center" tabIndex={0}>
      <button
        type="button"
        className="inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-expanded="false" // This would be dynamically set with state in a real JS dropdown
        aria-haspopup="true"
      >
        Learning
        <FontAwesomeIcon icon={faChevronDown} className="-mr-1 h-3 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* Dropdown panel, show/hide based on group-hover/focus-within state */}
      <div className="pointer-events-none w-[50rem] absolute -left-24 top-full z-50 max-w-3xl rounded-2xl bg-moneko-background opacity-0 shadow-xl ring-1 ring-border transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus:outline-none">
        <nav
          className="py-1"
          role="navigation"
          aria-label="Learning Lessons"
        >
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/dashboard/learning"
                className="group/ai inline-flex w-full sm:flex-1 items-center justify-center gap-3 rounded-2xl border-4 border-background bg-gradient-to-tr from-primary via-primary/80 to-primary/60 px-6 py-4 text-lg font-bold tracking-wide text-primary-foreground shadow-lg transition hover:scale-[1.03] focus:ring-2 focus:ring-primary focus:outline-none active:scale-95"
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
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 focus:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition"
                tabIndex={0}
                aria-label="View all investing courses"
              >
                <span>View All Lessons</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {groups.map((group) =>
                group.lessons.length === 0 ? null : (
                  <div
                    key={group.name}
                    className="flex flex-1 flex-col rounded-xl border border-border bg-muted/50 p-5 shadow"
                  >
                    <div
                      className={
                        "mb-3 text-xs font-semibold tracking-wider uppercase " +
                        (group.name === "Getting Started"
                          ? "bg-gradient-to-r from-primary to-success text-transparent bg-clip-text"
                          : group.name === "Investment Types"
                            ? "bg-gradient-to-r from-primary to-accent-pink text-transparent bg-clip-text"
                            : group.name === "Financial Concepts"
                              ? "bg-gradient-to-r from-warning to-warning/80 text-transparent bg-clip-text"
                              : "text-foreground")
                      }
                    >
                      {group.name}
                    </div>
                    <ul className="space-y-3">
                      {group.lessons.map(({ lesson, lessonShortform }) => (
                        <li key={lesson.lesson_id}>
                          <Link
                            to={`/learning/${basicCourse.id}/lesson/${lesson.lesson_id}`}
                            className="hover:bg-primary/10 focus:bg-primary/20 flex items-center gap-2 rounded-lg p-2 transition"
                          >
                            {lesson.icon && (
                              <span className="flex-shrink-0 text-lg">
                                {lesson.icon}
                              </span>
                            )}
                            <span
                              className="block truncate text-sm font-semibold text-foreground"
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
