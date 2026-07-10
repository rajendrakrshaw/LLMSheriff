import { footerNavLinks, profile } from "@/lib/site";

const socialLinks = [
  { label: "Email", href: `mailto:${profile.email}` },
  { label: "GitHub", href: profile.github },
  { label: "LinkedIn", href: profile.linkedin },
  { label: "Website", href: profile.website },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-100 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-zinc-600">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {footerNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>
            © {year}{" "}
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-800 hover:underline"
            >
              {profile.name}
            </a>
          </p>
          <p>
            <a href={`mailto:${profile.email}`} className="hover:text-zinc-900">
              {profile.email}
            </a>
            {" · "}
            <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="hover:text-zinc-900">
              {profile.phone}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
