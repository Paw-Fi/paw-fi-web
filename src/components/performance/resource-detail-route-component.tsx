"use client";

import { motion } from "framer-motion";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { Route } from "@/routes/resources/$resourceId";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Footer } from "@/components/homepage/footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

export function ResourceDetailRouteComponent() {
  const { resource } = Route.useLoaderData();

  return (
    <AmbientHaloLayout>
      <HomeHeader />
      <div className="mx-auto mt-24 max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/resources">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Resources
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-sm px-3 py-1">
              {resource.category}
            </Badge>
            {resource.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl dark:text-white">
            {resource.name}
          </h1>

          <div className="max-w-none">
            <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-400">
              {resource.longDescription || resource.description}
            </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="text-lg font-bold px-8">
              <a href={resource.link} target="_blank" rel="noopener noreferrer">
                Visit {resource.name}
                <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </AmbientHaloLayout>
  );
}
