type SwitchProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
};

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
  return (
    <label className="inline-flex items-center cursor-pointer gap-3">
      <span className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />

        {/* Track */}
        <div
          className="w-11 h-6 rounded-full bg-gray-300
                     peer-checked:bg-blue-600
                     transition-colors duration-300"
        />

        {/* Knob */}
        <div
          className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow
                     transition-transform duration-300
                     peer-checked:translate-x-5"
        />
      </span>

      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
};
