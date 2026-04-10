import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from './cn';

const fieldBase =
  'w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-primary)] placeholder:text-[var(--color-ink-subtle)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-60';

type FieldWrapperProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ id, label, hint, error, children }: FieldWrapperProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-primary)]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-[var(--color-ink-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

export type InputProps = ComponentPropsWithoutRef<'input'> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        fieldBase,
        invalid && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 5, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        fieldBase,
        'resize-y',
        invalid && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

export type SelectProps = ComponentPropsWithoutRef<'select'>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'pr-10', className)} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
