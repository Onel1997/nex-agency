interface ProjectTagsProps {
  tags: string[];
}

export function ProjectTags({ tags }: ProjectTagsProps) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 sm:gap-2.5">
      {tags.map((tag) => (
        <span key={tag} className="portfolio-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}
