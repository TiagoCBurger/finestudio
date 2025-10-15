'use client';

import { useEffect, useState } from 'react';
import type { projects } from '@/schema';
import { ProjectSelector } from './project-selector';
import { ProjectSettings } from './project-settings';

type TopLeftClientProps = {
    allProjects: (typeof projects.$inferSelect)[];
    currentProject: typeof projects.$inferSelect;
};

export function TopLeftClient({ allProjects, currentProject }: TopLeftClientProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:right-auto">
                <div className="flex flex-1 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                    <div className="h-8 w-[200px]" />
                </div>
                <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                    <div className="h-8 w-8" />
                </div>
            </div>
        );
    }

    return (
        <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:right-auto">
            <div className="flex flex-1 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                <ProjectSelector
                    projects={allProjects}
                    currentProject={currentProject.id}
                />
            </div>
            <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
                <ProjectSettings data={currentProject} />
            </div>
        </div>
    );
}
