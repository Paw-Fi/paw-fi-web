"use client";

import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { Breadcrumb, type BreadcrumbItem } from "../ui/Breadcrumb";

// Pages that should not show breadcrumbs
const NO_BREADCRUMB_PATHNAMES = ["/", "/intro", "/sign-in", "/sign-up"];

// Segments that should be combined with the previous segment in the breadcrumb
const COMBINED_PATHNAMES = ["lesson"];

export function PageLayout() {
  const location = useLocation();

  const showBreadcrumb = useMemo(
    () => !NO_BREADCRUMB_PATHNAMES.includes(location.pathname),
    [location],
  );

  // Generate breadcrumb items based on current path
  const breadcrumbItems = useMemo(() => {
    if (!showBreadcrumb) return [];

    const pathSegments = location.pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

    let currentPath = "";

    // Special case handling for common sections
    if (pathSegments[0] === "calculators") {
      items.push({ label: "Calculators", href: "/calculators" });
    } else if (pathSegments[0] === "learning") {
      items.push({ label: "Learning", href: "/learning" });

      // If this is a learning path with a course and lesson
      if (pathSegments.length > 1 && pathSegments.includes("lesson")) {
        // Find the index of 'lesson'
        const lessonIndex = pathSegments.indexOf("lesson");

        if (lessonIndex > 1) {
          // The course name is before 'lesson'
          const courseName = pathSegments[lessonIndex - 1];
          items.push({
            label: courseName
              .replace(/-/g, " ")
              .replace(/\b\w/g, (char: string) => char.toUpperCase()),
            href: `/learning/${courseName}`,
          });
        }
      }
    } else if (pathSegments[0] === "author") {
      items.push({ label: "Author Dashboard", href: "/author" });
    }

    // Skip segments we've already handled specially
    let startIndex = ["calculators", "learning", "author"].includes(
      pathSegments[0],
    )
      ? 1
      : 0;

    // If we've already added a course breadcrumb, skip the course segment
    if (pathSegments[0] === "learning" && pathSegments.includes("lesson")) {
      const lessonIndex = pathSegments.indexOf("lesson");
      if (lessonIndex > 1) {
        // Skip both the 'learning' and the course name segments
        startIndex = lessonIndex;
      }
    }

    // Process remaining segments with special handling for lesson paths
    for (let i = startIndex; i < pathSegments.length; i++) {
      const segment = pathSegments[i];

      // If this is a "lesson" segment, we'll combine it with the next segment
      if (COMBINED_PATHNAMES.includes(segment) && i + 1 < pathSegments.length) {
        // Skip adding this segment as a separate breadcrumb
        continue;
      }

      // Build the current path
      if (i === 0) {
        currentPath = `/${segment}`;
      } else if (i > 0 && COMBINED_PATHNAMES.includes(pathSegments[i - 1])) {
        // For paths like /learning/course-name/lesson/lesson-id
        // We want the href to be the full path up to this point
        currentPath = "/" + pathSegments.slice(0, i + 1).join("/");
      } else if (pathSegments[0] === "learning" && i === 1) {
        // Special case for course names under learning
        currentPath = `/learning/${segment}`;
      } else {
        currentPath += `/${segment}`;
      }

      // Get a user-friendly label for the segment
      let label = segment
        // Replace hyphens with spaces
        .replace(/-/g, " ")
        // Capitalize first letter of each word
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

      // Special handling for lesson IDs (typically have format like "invest-L1")
      if (i > 0 && COMBINED_PATHNAMES.includes(pathSegments[i - 1])) {
        // Check if this is a lesson ID with a format like "something-L1"
        const lessonMatch = segment.match(/(.+)-(L\d+)$/);
        if (lessonMatch) {
          // Format as "Lesson 1: Something" instead of "Something L1"
          const [_, topicName, lessonNumber] = lessonMatch;
          const lessonNum = lessonNumber.substring(1); // Remove the 'L' prefix
          label = `Lesson ${lessonNum}: ${topicName
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char: string) => char.toUpperCase())}`;
        }
      }

      // Special case for dynamic route parameters (starting with $)
      if (segment.startsWith("$")) {
        // For dynamic segments, try to get a more descriptive name based on the route
        const paramName = segment.substring(1);

        // Handle specific dynamic segments
        if (paramName === "courseId") {
          label = "Course";
        } else if (paramName === "lessonId") {
          label = "Lesson";
        } else if (paramName === "calculatorId") {
          label = "Calculator";
        } else {
          // Default handling for other dynamic segments
          label = paramName
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char: string) => char.toUpperCase());
        }
      }

      items.push({
        label,
        href: currentPath,
        isCurrentPage: i === pathSegments.length - 1,
      });
    }

    return items;
  }, [location.pathname, showBreadcrumb]);
  if (!showBreadcrumb || breadcrumbItems.length === 0) return <></>;

  return (
    <div className="container bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <Breadcrumb items={breadcrumbItems} className="text-sm" />
      </div>
    </div>
  );
}

export default PageLayout;
