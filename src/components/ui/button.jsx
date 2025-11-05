export function Button({
  children,
  onClick,
  type = "button",
  variant = "default",
  className = "",
}) {
  const base = "px-4 py-2 rounded-lg transition-all text-white font-medium";

  const variants = {
    default: "bg-blue-600 hover:bg-blue-700",
    outline:
      "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50",
    destructive: "bg-red-600 hover:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      type={type}
      className={`${base} ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </button>
  );
}