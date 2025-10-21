export const ProgressTracker = ({ progress }: { progress: number }) => {
  return <div className="w-full bg-gray-200 rounded-full h-2">
    <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
  </div>
}
