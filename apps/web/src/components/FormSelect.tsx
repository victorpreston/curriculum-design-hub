import { useId } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

interface FormSelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
}

interface FormSelectProps {
  label: string;
  hint?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FormSelect({
  label,
  hint,
  value,
  onValueChange,
  options,
  placeholder = 'Choose an option…',
  disabled = false,
  required = false,
}: FormSelectProps) {
  const id = useId();
  const labelId = id + '-label';
  const hintId = id + '-hint';
  const selected = options.find((option) => option.value === value);
  const hasDescriptions = options.some((option) => option.description);
  const groups = new Map<string, FormSelectOption[]>();
  for (const option of options) {
    const group = option.group ?? '';
    groups.set(group, [...(groups.get(group) ?? []), option]);
  }

  return (
    <div className="form-select-field">
      <label id={labelId} htmlFor={id}>
        {label}
      </label>
      <Select.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <Select.Trigger
          id={id}
          className="form-select-trigger"
          title={selected?.description ?? selected?.label}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
        >
          <Select.Value placeholder={placeholder}>
            {selected ? (
              <span className="form-select-value">
                <span>{selected.label}</span>
                {selected.description && (
                  <span className="form-select-value-description">{selected.description}</span>
                )}
              </span>
            ) : undefined}
          </Select.Value>
          <Select.Icon className="form-select-chevron">
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className={`form-select-content${hasDescriptions ? ' form-select-content-outcomes' : ''}`}
            position="popper"
            side="bottom"
            avoidCollisions={false}
            sideOffset={5}
            collisionPadding={12}
            align="start"
          >
            <Select.Viewport className="form-select-viewport">
              {[...groups].map(([group, items]) => (
                <Select.Group key={group}>
                  {group && (
                    <Select.Label className="form-select-group-label">{group}</Select.Label>
                  )}
                  {items.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="form-select-option"
                      title={
                        option.description ? option.label + ': ' + option.description : option.label
                      }
                      textValue={option.label + ' ' + (option.description ?? '')}
                    >
                      <Select.ItemText>
                        <span className="form-select-option-copy">
                          <span>{option.label}</span>
                          {option.description && (
                            <span className="form-select-option-description">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </Select.ItemText>
                      <Select.ItemIndicator className="form-select-check">
                        <Check size={15} strokeWidth={2} aria-hidden="true" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Group>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}
