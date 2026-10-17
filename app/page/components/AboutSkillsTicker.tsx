"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { profile } from "@/data/portfolio";

export default function AboutSkillsTicker({ skills }: { skills: string[] }) {
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
    </>
  );
}
