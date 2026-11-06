import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'value' | 'defaultValue' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
};

/** A numeric edit can temporarily be empty or just '-', without coercing it to zero. */
export function PtpNumberInput({ value, onValueChange, onFocus, onBlur, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const latest = useRef(value);
  latest.current = value;
  const format = (n: number) => String(Number(n.toFixed(4)));
  const initial = useRef(format(value));

  useEffect(() => {
    if (!focused.current && input.current) input.current.value = format(value);
  }, [value]);

  return <input {...props} ref={input} type="number" defaultValue={initial.current}
    onFocus={event => { focused.current = true; onFocus?.(event); }}
    onChange={event => {
      const next = event.currentTarget.valueAsNumber;
      if (Number.isFinite(next)) onValueChange(next);
    }}
    onBlur={event => {
      focused.current = false;
      // Invalid/incomplete edits revert to the most recent committed value.
      event.currentTarget.value = format(latest.current);
      onBlur?.(event);
    }} />;
}
