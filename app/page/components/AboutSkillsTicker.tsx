"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { profile } from "@/data/portfolio";
import { listApi } from "@/lib/api-service";

type AboutContent = {
  id: string;
  Lanuage: string;
};

export default function AboutSkillsTicker() {
  const [skills, setSkills] = useState(profile.skills);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    listApi<AboutContent>("/api/about", {
      page: 1,
      pageSize: 100,
      filter: "",
      signal: controller.signal,
    })
      .then(({ items }) => {
        const contentSkills = [
          ...new Set(
            items
              .flatMap(({ Lanuage }) => Lanuage.split(","))
              .map((skill) => skill.trim())
              .filter(Boolean),
          ),
        ];

        if (contentSkills.length > 0) setSkills(contentSkills);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load About skills.");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="flex w-max animate-marquee gap-3">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 items-center gap-3">
            {skills.map((skill, idx) => (
              <span
                key={`${set}-${idx}`}
                className="glass whitespace-nowrap rounded-full px-5 py-2 text-sm text-lilac"
              >
                {skill}
              </span>
            ))}
            <span
              className="glass relative flex h-10 w-17 shrink-0 items-center justify-center overflow-hidden rounded-full text-lilac"
              aria-label={profile.image ? `${profile.name} portrait` : "Portrait image placeholder"}
              title={profile.image ? profile.name : "Set profile.image to show your photo"}
            >
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt={`${profile.name} portrait`}
                  fill
                  sizes="68px"
                  className="object-cover"
                />
              ) : (
                <UserRound size={19} strokeWidth={1.5} />
              )}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-200">
          About skills could not be refreshed: {error}
        </p>
      )}
    </>
  );
}
