interface ProjectTagsProps {
  tags: string[];
  variant?: "featured" | "compact" | "default";
  limit?: number;
}

export function ProjectTags({
  tags,
  variant = "default",
  limit,
}: ProjectTagsProps) {
  const visibleTags = limit ? tags.slice(0, limit) : tags;

  return (
    <div
      className={`portfolio-tags flex flex-wrap ${
        variant === "featured"
          ? "portfolio-tags--featured"
          : variant === "compact"
            ? "portfolio-tags--compact"
            : ""
      }`}
    >
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className={`portfolio-tag ${
            variant === "compact" ? "portfolio-tag--compact" : ""
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
