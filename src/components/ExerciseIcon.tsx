/**
 * A glyph per muscle group, in the pale circle the design puts at the left of
 * every card. Not per-exercise art: with 460 exercises in the library that
 * would be a drawing job with no end, and the group is what a coach scans for
 * anyway.
 */
export function ExerciseIcon({ group }: { group: string }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <span className="exercise-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24">
        {group === "chest" ? (
          <g {...stroke}>
            <path d="M4 8.5h4M16 8.5h4M6 6v5M18 6v5M8 8.5h8" />
            <path d="M6.5 15c1.8 2 3.6 3 5.5 3s3.7-1 5.5-3" />
          </g>
        ) : null}
        {group === "back" ? (
          <g {...stroke}>
            <path d="M12 4v6" />
            <path d="M5.5 6.5 12 10l6.5-3.5" />
            <path d="M8 20c0-3.3 1.8-5.5 4-5.5s4 2.2 4 5.5" />
            <path d="M12 10v4.5" />
          </g>
        ) : null}
        {group === "legs" ? (
          <g {...stroke}>
            <circle cx="12" cy="5" r="1.8" />
            <path d="M12 7.5v4l-3 3v5" />
            <path d="M12 11.5l3.5 3v5" />
          </g>
        ) : null}
        {group === "shoulders" ? (
          <g {...stroke}>
            <circle cx="12" cy="6" r="1.8" />
            <path d="M6 12.5c0-2.2 2.7-3.5 6-3.5s6 1.3 6 3.5" />
            <path d="M4.5 9.5 6 12.5 4.5 15.5M19.5 9.5 18 12.5l1.5 3" />
          </g>
        ) : null}
        {group === "arms" ? (
          <g {...stroke}>
            <path d="M7 17c0-3.5 1.6-5.5 4-5.5s4 2 4 5.5" />
            <path d="M11 11.5V7.5a2.5 2.5 0 0 1 5 0V10" />
            <path d="M4.5 8.5v7M20 9.5v5" />
          </g>
        ) : null}
        {group === "core" ? (
          <g {...stroke}>
            <circle cx="12" cy="5.5" r="1.8" />
            <path d="M12 8v4M8.5 12h7M9 16h6M9.5 19.5h5" />
          </g>
        ) : null}
        {!["chest", "back", "legs", "shoulders", "arms", "core"].includes(group) ? (
          <g {...stroke}>
            <path d="M3 9.5v5M6 7.5v9M18 7.5v9M21 9.5v5M6 12h12" />
          </g>
        ) : null}
      </svg>
    </span>
  );
}
