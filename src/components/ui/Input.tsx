// src/components/ui/Input.tsx

import { cn } from '@/lib/utils/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2 border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          error && 'border-danger-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-danger-600 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
