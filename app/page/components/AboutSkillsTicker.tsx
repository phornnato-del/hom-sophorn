"use client";

export default function AboutSkillsTicker({ skills }: { skills: string[] }) {
  return (
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
        </div>
      ))}
    </div>
  );
}
