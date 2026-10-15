export const profile = {
  name: "Hom Sophorn",
  image: "",
  roles: ["Frontend Developer", "UI Builder", "Creative Coder"],
  intro:
    "I build clean, fast and playful web experiences. Currently turning ideas into real products.",
  about:
    "Write 2–3 sentences about yourself here: where you're from, what you love building, what you're learning now.",
  email: "you@email.com",
  socials: {
    github: "https://github.com/yourusername",
    linkedin: "https://linkedin.com/in/yourusername",
  },
  skills: [
    "Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion",
    "Node.js", "Git", "Figma", "REST API", "Firebase",
  ],
};

export type Project = {
  title: string;
  description: string;
  tags: string[];
  image?: string;
  github?: string;
  live?: string;
};

export const projects: Project[] = [
  {
    title: "Project One",
    description: "Short description of what it does and why it's cool.",
    tags: ["Next.js", "Tailwind"],
    github: "https://github.com/yourusername/project-one",
    live: "https://project-one.vercel.app",
  },
  {
    title: "Project Two",
    description: "Another project, one or two lines max.",
    tags: ["React", "Firebase"],
    github: "https://github.com/yourusername/project-two",
  },
  {
    title: "Project Three",
    description: "Add as many as you like.",
    tags: ["TypeScript", "API"],
    live: "https://example.com",
  },
];